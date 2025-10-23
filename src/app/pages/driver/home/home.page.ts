// ==========================================
// HOME DRIVER - PAGE PRINCIPALE CHAUFFEUR
// VERSION COMPLÈTE AVEC CAPACITOR
// ==========================================
import { Component, OnInit, OnDestroy, inject, runInInjectionContext, EnvironmentInjector, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonButton,
  IonIcon,
  IonText,
  IonToggle,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  ToastController,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  trendingUpOutline,
  carSportOutline,
  logOutOutline,
  notificationsOutline,
  cashOutline,
  timeOutline,
  locationOutline,
  mailOutline,
  callOutline,
  starOutline,
  personOutline,
  chevronForwardOutline,
  moonOutline,
  bulbOutline,
  carOutline,
  navigateOutline,
  alertCircleOutline
} from 'ionicons/icons';

// ==========================================
// IMPORTS
// ==========================================
import { AuthService } from '../../../core/services/auth.service';
import { CapacitorService } from '../../../core/services/capacitor.service';
import { User } from '../../../shared/models/interfaces';
import { Database, ref, update, onValue, off, get, query, orderByChild, equalTo } from '@angular/fire/database';
import { FormsModule } from '@angular/forms';
import { Position } from '@capacitor/geolocation';

/**
 * Page d'accueil du chauffeur
 * Gère le statut en ligne/hors ligne avec tracking GPS
 * Affiche les statistiques du jour
 * Reçoit les demandes de courses en temps réel
 */
@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonButton,
    IonIcon,
    IonToggle,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonRefresher,
    IonRefresherContent
  ]
})
export class HomePage implements OnInit, OnDestroy {
  
  // ==========================================
  // PROPRIÉTÉS
  // ==========================================
  
  /**
   * Utilisateur actuellement connecté
   */
  currentUser: User | null = null;
  
  /**
   * Données du chauffeur depuis Firebase
   */
  driverData: any = null;
  
  /**
   * Statut en ligne/hors ligne
   */
  isOnline: boolean = false;
  
  /**
   * Nombre de demandes de courses en attente
   */
  pendingRides: number = 0;
  
  /**
   * Gains du jour en cours
   */
  todayEarnings: number = 0;
  
  /**
   * Nombre de courses du jour
   */
  todayRides: number = 0;

  /**
   * Position GPS actuelle
   */
  currentLocation: { lat: number, lng: number } | null = null;

  /**
   * ID du watcher GPS
   */
  private locationWatchId: string = '';

  /**
   * Indique si le GPS est en cours de chargement
   */
  isLoadingLocation: boolean = false;

  /**
   * Heure de début de connexion
   */
  private onlineStartTime: number | null = null;

  /**
   * Temps passé en ligne aujourd'hui (en minutes)
   */
  onlineTime: number = 0;

  /**
   * Référence Firebase pour les demandes de courses
   */
  private rideRequestsListener: any = null;
   private ngZone = inject(NgZone);

  // Injection des services
  private authService = inject(AuthService);
  private capacitorService = inject(CapacitorService);
  private database = inject(Database);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);

  constructor() {
    // Enregistrer les icônes
    addIcons({
      trendingUpOutline,
      carSportOutline,
      logOutOutline,
      notificationsOutline,
      cashOutline,
      timeOutline,
      locationOutline,
      mailOutline,
      callOutline,
      starOutline,
      personOutline,
      chevronForwardOutline,
      moonOutline,
      bulbOutline,
      carOutline,
      navigateOutline,
      alertCircleOutline
    });
  }

  // ==========================================
  // INITIALISATION
  // ==========================================
  async ngOnInit() {
    console.log('🚗 Initialisation HomePage Driver');
    
    // Feedback tactile
    await this.capacitorService.vibrate();

    // Récupérer l'utilisateur actuel
    this.authService.currentUser$.subscribe(async user => {
      this.currentUser = user;
      if (user && user.role === 'driver') {
        await this.loadDriverData(user.uid);
        await this.loadPendingRides();
        await this.loadTodayStats();
        this.listenToRideRequests();
      }
    });

    // Demander les permissions GPS
    await this.requestLocationPermissions();
  }

  // ==========================================
  // PERMISSIONS GPS
  // ==========================================
  
  /**
   * Demande les permissions de géolocalisation
   */
  async requestLocationPermissions() {
    const hasPermission = await this.capacitorService.requestLocationPermissions();
    
    if (!hasPermission) {
      await this.capacitorService.showToast(
        '⚠️ Activez la localisation pour recevoir des courses',
        'long'
      );
    }
  }

  // ==========================================
  // CHARGER LES DONNÉES DU CHAUFFEUR
  // ==========================================
 async loadDriverData(driverId: string) {
    const driverRef = ref(this.database, `drivers/${driverId}`);

    onValue(driverRef, (snapshot) => {
      // ✅ Re-enter Angular zone to keep context + change detection
      this.ngZone.run(() => {
        if (snapshot.exists()) {
          this.driverData = snapshot.val();
          this.isOnline = this.driverData.isOnline || false;

          // Start GPS tracking if needed
          if (this.isOnline && !this.locationWatchId) {
            this.startLocationTracking();
          }

          console.log('✅ Driver data loaded:', this.driverData);
        }
      });
    });
  }


  // ==========================================
  // CHARGER LES DEMANDES EN ATTENTE
  // ==========================================
  async loadPendingRides() {
    if (!this.currentUser) return;

    try {
      const ridesRef = ref(this.database, 'rides');
      const pendingQuery = query(
        ridesRef,
        orderByChild('status'),
        equalTo('pending')
      );

      const snapshot = await get(pendingQuery);
      
      if (snapshot.exists()) {
        let count = 0;
        snapshot.forEach((childSnapshot) => {
          const ride = childSnapshot.val();
          // Compter seulement les courses non assignées ou assignées à ce chauffeur
          if (!ride.driverId || ride.driverId === this.currentUser?.uid) {
            count++;
          }
        });
        this.pendingRides = count;
        console.log('📋 Pending rides:', count);
      } else {
        this.pendingRides = 0;
      }
    } catch (error) {
      console.error('❌ Error loading pending rides:', error);
    }
  }

  // ==========================================
  // CHARGER LES STATISTIQUES DU JOUR
  // ==========================================
  async loadTodayStats() {
    if (!this.currentUser) return;

    try {
      // Récupérer toutes les courses du chauffeur
      const ridesRef = ref(this.database, 'rides');
      const snapshot = await get(ridesRef);

      if (snapshot.exists()) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let earnings = 0;
        let ridesCount = 0;

        snapshot.forEach((childSnapshot) => {
          const ride = childSnapshot.val();

          // Filtrer les courses de ce chauffeur
          if (ride.driverId === this.currentUser?.uid) {
            
            // Vérifier si c'est aujourd'hui
            let rideDate = new Date();
            if (ride.completedAt) {
              rideDate = new Date(ride.completedAt);
            } else if (ride.startedAt) {
              rideDate = new Date(ride.startedAt);
            } else if (ride.acceptedAt) {
              rideDate = new Date(ride.acceptedAt);
            }

            if (rideDate >= today) {
              // Ajouter aux statistiques
              const validStatuses = ['accepted', 'started', 'driver-arriving', 'completed'];
              
              if (validStatuses.includes(ride.status)) {
                earnings += ride.finalPrice || ride.estimatedPrice || 0;
                ridesCount++;
              }
            }
          }
        });

        this.todayEarnings = earnings;
        this.todayRides = ridesCount;

        console.log('📊 Today stats:', {
          earnings: this.todayEarnings,
          rides: this.todayRides
        });

        // Sauvegarder dans le cache
        await this.capacitorService.setPreference('todayStats', {
          earnings: this.todayEarnings,
          rides: this.todayRides,
          date: new Date().toDateString()
        });

      }
    } catch (error) {
      console.error('❌ Error loading today stats:', error);
      
      // Charger depuis le cache si erreur
      const cached = await this.capacitorService.getPreference('todayStats');
      if (cached && cached.date === new Date().toDateString()) {
        this.todayEarnings = cached.earnings;
        this.todayRides = cached.rides;
      }
    }
  }

  // ==========================================
  // ÉCOUTER LES DEMANDES DE COURSES
  // ==========================================
  listenToRideRequests() {
    if (!this.currentUser) return;

    const ridesRef = ref(this.database, 'rides');
    
    this.rideRequestsListener = onValue(ridesRef, async (snapshot) => {
      if (snapshot.exists()) {
        let pendingCount = 0;
        
        snapshot.forEach((childSnapshot) => {
          const ride = childSnapshot.val();
          
          // Nouvelle demande pour ce chauffeur
          if (ride.status === 'pending' && !ride.driverId) {
            pendingCount++;
          }
          
          // Demande assignée à ce chauffeur
          if (ride.status === 'pending' && ride.driverId === this.currentUser?.uid) {
            // Notification de nouvelle demande
            this.notifyNewRideRequest(childSnapshot.key!, ride);
          }
        });
        
        this.pendingRides = pendingCount;
      }
    });
  }

  /**
   * Notifie le chauffeur d'une nouvelle demande
   */
  async notifyNewRideRequest(rideId: string, rideData: any) {
    // Vibration forte
    await this.capacitorService.vibrateHeavy();
    
    // Notification
    await this.capacitorService.showToast(
      '🚗 Nouvelle demande de course !',
      'long'
    );

    console.log('🔔 New ride request:', rideId);
  }

  // ==========================================
  // TRACKING GPS
  // ==========================================
  
  /**
   * Démarre le tracking GPS en temps réel
   */
  async startLocationTracking() {
    if (this.locationWatchId) {
      console.log('⚠️ Location tracking already active');
      return;
    }

    this.isLoadingLocation = true;

    this.locationWatchId = await this.capacitorService.watchPosition(async (position) => {
      if (position) {
        this.currentLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };

        // Mettre à jour la position dans Firebase
        await this.updateLocationInFirebase(position);
        
        this.isLoadingLocation = false;
      }
    });

    console.log('✅ Location tracking started:', this.locationWatchId);
  }

  /**
   * Arrête le tracking GPS
   */
  async stopLocationTracking() {
    if (this.locationWatchId) {
      await this.capacitorService.clearWatch(this.locationWatchId);
      this.locationWatchId = '';
      console.log('🛑 Location tracking stopped');
    }
  }

  /**
   * Met à jour la position dans Firebase
   */
  async updateLocationInFirebase(position: Position) {
    if (!this.currentUser || !this.isOnline) return;

    try {
      const locationRef = ref(this.database, `drivers/${this.currentUser.uid}/location`);
      
      await update(locationRef, {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('❌ Error updating location:', error);
    }
  }

  // ==========================================
  // TOGGLE STATUT ONLINE/OFFLINE
  // ==========================================
  async toggleOnlineStatus(event: any) {
    const newStatus = event.detail.checked;
    
    if (!this.currentUser) return;

    // Feedback tactile
    await this.capacitorService.vibrate();

    // Si on passe en ligne, demander confirmation
    if (newStatus) {
      const alert = await this.alertCtrl.create({
        header: '🟢 Passer en ligne',
        message: 'Vous allez commencer à recevoir des demandes de courses. Êtes-vous prêt ?',
        buttons: [
          {
            text: 'Annuler',
            role: 'cancel',
            handler: () => {
              // Remettre le toggle à false
              this.isOnline = false;
            }
          },
          {
            text: 'Oui, en ligne',
            handler: async () => {
              await this.goOnline();
            }
          }
        ]
      });
      await alert.present();
    } else {
      // Passer hors ligne directement
      await this.goOffline();
    }
  }

  /**
   * Passer en ligne
   */
  async goOnline() {
    // Démarrer le tracking GPS
    await this.startLocationTracking();
    
    // Mettre à jour Firebase
    await this.updateOnlineStatus(true);
    
    // Sauvegarder l'heure de début
    this.onlineStartTime = Date.now();
    await this.capacitorService.setPreference('onlineStartTime', this.onlineStartTime);

    // Notification
    await this.capacitorService.showToast(
      '🟢 Vous êtes EN LIGNE ! Prêt à recevoir des courses',
      'long'
    );
    await this.capacitorService.vibrateLight();
  }

  /**
   * Passer hors ligne
   */
  async goOffline() {
    // Arrêter le tracking GPS
    await this.stopLocationTracking();
    
    // Calculer le temps passé en ligne
    if (this.onlineStartTime) {
      const duration = (Date.now() - this.onlineStartTime) / (1000 * 60); // en minutes
      this.onlineTime += duration;
      this.onlineStartTime = null;
    }
    
    // Mettre à jour Firebase
    await this.updateOnlineStatus(false);

    // Notification
    await this.capacitorService.showToast(
      '🔴 Vous êtes HORS LIGNE',
      'short'
    );
    await this.capacitorService.vibrateLight();
  }

  // ==========================================
  // METTRE À JOUR LE STATUT DANS FIREBASE
  // ==========================================
  async updateOnlineStatus(status: boolean) {
    if (!this.currentUser) return;

    try {
      const driverRef = ref(this.database, `drivers/${this.currentUser.uid}`);
      
      await update(driverRef, {
        isOnline: status,
        available: status,
        status: status ? 'available' : 'offline',
        lastUpdate: Date.now()
      });

      this.isOnline = status;
      
      console.log(`✅ Status updated: ${status ? 'ONLINE' : 'OFFLINE'}`);
      
    } catch (error) {
      console.error('❌ Error updating status:', error);
      await this.capacitorService.showToast('❌ Erreur de connexion', 'short');
      // Revenir à l'ancien statut
      this.isOnline = !status;
    }
  }

  // ==========================================
  // NAVIGATION
  // ==========================================
  
  /**
   * Voir les demandes de courses
   */
  async viewRideRequests() {
    await this.capacitorService.vibrate();
    
    if (!this.isOnline) {
      await this.capacitorService.showToast(
        '⚠️ Passez en ligne pour voir les demandes',
        'short'
      );
      return;
    }
    
    // Navigation vers la page des demandes
    this.router.navigate(['/driver/ride-requests']);
  }

  /**
   * Navigation vers les gains
   */
  async goToEarnings() {
    await this.capacitorService.vibrate();
    this.router.navigate(['/driver/tabs/earnings']);
  }

  /**
   * Navigation vers l'historique
   */
  async goToHistory() {
    await this.capacitorService.vibrate();
    this.router.navigate(['/driver/tabs/history']);
  }

  // ==========================================
  // RAFRAÎCHIR
  // ==========================================
  async handleRefresh(event: any) {
    await this.capacitorService.vibrateLight();
    
    if (this.currentUser) {
      await this.loadDriverData(this.currentUser.uid);
      await this.loadPendingRides();
      await this.loadTodayStats();
    }
    
    setTimeout(() => {
      event.target.complete();
    }, 1000);

    await this.capacitorService.showToast('🔄 Mis à jour', 'short');
  }

  // ==========================================
  // DÉCONNEXION
  // ==========================================
  async logout() {
    await this.capacitorService.vibrate();
    
    // Si en ligne, avertir
    if (this.isOnline) {
      const alert = await this.alertCtrl.create({
        header: '⚠️ Attention',
        message: 'Vous êtes actuellement en ligne. Vous serez mis hors ligne avant de vous déconnecter.',
        buttons: [
          {
            text: 'Annuler',
            role: 'cancel'
          },
          {
            text: 'Déconnexion',
            role: 'destructive',
            handler: async () => {
              await this.goOffline();
              await this.performLogout();
            }
          }
        ]
      });
      await alert.present();
    } else {
      const alert = await this.alertCtrl.create({
        header: 'Déconnexion',
        message: 'Êtes-vous sûr de vouloir vous déconnecter ?',
        buttons: [
          {
            text: 'Annuler',
            role: 'cancel'
          },
          {
            text: 'Déconnexion',
            role: 'destructive',
            handler: async () => {
              await this.performLogout();
            }
          }
        ]
      });
      await alert.present();
    }
  }

  /**
   * Effectue la déconnexion
   */
  async performLogout() {
    await this.capacitorService.vibrateHeavy();
    await this.authService.logout();
  }

  // ==========================================
  // HELPERS
  // ==========================================
  
  /**
   * Formatte le temps en ligne
   */
  formatOnlineTime(): string {
    if (this.onlineTime < 60) {
      return `${Math.round(this.onlineTime)} min`;
    }
    const hours = Math.floor(this.onlineTime / 60);
    const mins = Math.round(this.onlineTime % 60);
    return `${hours}h ${mins}min`;
  }

  /**
   * Affiche un toast
   */
  private async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'primary') {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      position: 'top',
      color: color
    });
    await toast.present();
  }

  // ==========================================
  // NETTOYAGE
  // ==========================================
  async ngOnDestroy() {
    console.log('🛑 Destruction HomePage Driver');
    
    // Arrêter le tracking GPS
    if (this.locationWatchId) {
      await this.stopLocationTracking();
    }

    // Désactiver les listeners Firebase
    if (this.currentUser) {
      const driverRef = ref(this.database, `drivers/${this.currentUser.uid}`);
      off(driverRef);
    }

    if (this.rideRequestsListener) {
      const ridesRef = ref(this.database, 'rides');
      off(ridesRef);
    }
  }
}