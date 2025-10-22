// ==========================================
// RIDE REQUESTS PAGE - DEMANDES DE COURSES (CHAUFFEUR)
// ==========================================
import { Component, OnInit, OnDestroy } from '@angular/core';
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
  IonBadge,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonButtons,
  IonBackButton,
  AlertController,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  locationOutline,
  navigateOutline,
  cashOutline,
  timeOutline,
  personOutline,
  callOutline,
  closeOutline,
  checkmarkOutline,
  carSportOutline
} from 'ionicons/icons';

import { AuthService } from '../../../core/services/auth.service';
import { RideService } from '../../../core/services/ride.service';
import { Ride } from '../../../shared/models/interfaces';
import { Database, ref, get } from '@angular/fire/database';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ride-requests',
  templateUrl: './ride-requests.page.html',
  styleUrls: ['./ride-requests.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
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
    IonBadge,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    IonButtons,
    IonBackButton
  ]
})
export class RideRequestsPage implements OnInit, OnDestroy {
  
  // ==========================================
  // PROPRIÉTÉS
  // ==========================================
  pendingRides: Ride[] = [];
  isLoading: boolean = true;
  driverData: any = null;
  currentUser: any = null;
  
  // Subscription pour éviter les fuites mémoire
  private ridesSubscription?: Subscription;
  private isPageActive = false;

  constructor(
    private authService: AuthService,
    private rideService: RideService,
    private database: Database,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {
    // Enregistrer TOUTES les icônes nécessaires
    addIcons({
      locationOutline,
      navigateOutline,
      cashOutline,
      timeOutline,
      personOutline,
      callOutline,
      closeOutline,
      checkmarkOutline,
      carSportOutline // ✅ Ajout de l'icône car-outline
    });
  }

  // ==========================================
  // INITIALISATION
  // ==========================================
  async ngOnInit() {
    console.log('🚀 RideRequestsPage initialized');
    this.isPageActive = true;
    
    // Récupérer l'utilisateur connecté
    this.currentUser = this.authService.currentUser;
    
    if (!this.currentUser) {
      console.error('❌ No user logged in');
      this.showToast('Veuillez vous connecter', 'danger');
      this.router.navigate(['/login']);
      return;
    }
    
    // Charger les données du chauffeur
    await this.loadDriverData(this.currentUser.uid);
    
    // Charger les courses en attente
    this.loadPendingRides();
  }

  // ==========================================
  // CYCLE DE VIE IONIC - ENTRÉE
  // ==========================================
  ionViewWillEnter() {
    console.log('👀 View entering...');
    this.isPageActive = true;
    
    // Redémarrer l'écoute si l'utilisateur est connecté
    if (this.currentUser) {
      this.rideService.startListeningToPendingRides();
    }
  }

  // ==========================================
  // CYCLE DE VIE IONIC - SORTIE
  // ==========================================
  ionViewWillLeave() {
    console.log('👋 View leaving...');
    this.isPageActive = false;
    
    // Arrêter l'écoute pour économiser les ressources
    this.rideService.stopListeningToPendingRides();
  }

  // ==========================================
  // CHARGER LES DONNÉES DU CHAUFFEUR
  // ==========================================
  async loadDriverData(driverId: string) {
    try {
      console.log('📥 Loading driver data for:', driverId);
      const driverRef = ref(this.database, `drivers/${driverId}`);
      const snapshot = await get(driverRef);
      
      if (snapshot.exists()) {
        this.driverData = snapshot.val();
        console.log('✅ Driver data loaded:', this.driverData);
      } else {
        console.warn('⚠️ No driver data found');
      }
    } catch (error) {
      console.error('❌ Error loading driver data:', error);
    }
  }

  // ==========================================
  // CHARGER LES DEMANDES EN ATTENTE
  // ==========================================
  loadPendingRides() {
    console.log('🔄 Loading pending rides...');
    this.isLoading = true;
    
    // Se désabonner de l'ancienne subscription si elle existe
    if (this.ridesSubscription) {
      this.ridesSubscription.unsubscribe();
    }
    
    // S'abonner aux courses en attente (Observable RxJS)
    this.ridesSubscription = this.rideService.pendingRides$.subscribe({
      next: (rides) => {
        // Ne mettre à jour que si la page est active
        if (this.isPageActive) {
          this.pendingRides = rides;
          this.isLoading = false;
          console.log('📋 Pending rides updated:', rides.length);
        }
      },
      error: (error) => {
        console.error('❌ Error subscribing to rides:', error);
        this.isLoading = false;
      }
    });
    
    // ✅ Démarrer l'écoute Firebase en temps réel (SYNCHRONE maintenant)
    this.rideService.startListeningToPendingRides();
  }

  // ==========================================
  // ACCEPTER UNE COURSE
  // ==========================================
  async acceptRide(ride: Ride) {
    if (!this.currentUser || !this.driverData) {
      this.showToast('❌ Erreur: Données manquantes', 'danger');
      return;
    }

    // Vérifier le véhicule
    if (!this.driverData.vehicleInfo) {
      const alert = await this.alertCtrl.create({
        header: '🚗 Véhicule non configuré',
        message: 'Vous devez configurer votre véhicule avant d\'accepter des courses.',
        buttons: [
          {
            text: 'OK',
            handler: () => {
              this.router.navigate(['/driver/tabs/profile']);
            }
          }
        ]
      });
      await alert.present();
      return;
    }

    // Confirmation avec détails
    const alert = await this.alertCtrl.create({
      header: '✅ Accepter la course',
      message: `
        <div style="text-align: left; line-height: 1.8;">
          <strong>📍 Départ:</strong><br>
          ${ride.pickupLocation.address || 'Position de départ'}<br><br>
          
          <strong>🎯 Destination:</strong><br>
          ${ride.dropoffLocation.address || 'Destination'}<br><br>
          
          <strong>💰 Prix estimé:</strong> ${ride.estimatedPrice} DT<br>
          <strong>📏 Distance:</strong> ${this.formatDistance(ride.estimatedDistance)}<br>
          <strong>⏱️ Durée:</strong> ${this.formatDuration(ride.estimatedDuration)}
        </div>
      `,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Accepter',
          cssClass: 'primary',
          handler: async () => {
            await this.confirmAcceptRide(ride);
          }
        }
      ]
    });

    await alert.present();
  }

  // ==========================================
  // CONFIRMER L'ACCEPTATION
  // ==========================================
  async confirmAcceptRide(ride: Ride) {
    if (!this.currentUser) {
      this.showToast('❌ Erreur: Utilisateur non connecté', 'danger');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Acceptation de la course...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Préparer les données du chauffeur
      const driverInfo = {
        name: this.currentUser.displayName || this.driverData?.name || 'Chauffeur',
        phone: this.currentUser.phoneNumber || this.driverData?.phone || '',
        photoURL: this.currentUser.photoURL || this.driverData?.photoURL || '',
        vehicleInfo: this.driverData.vehicleInfo
      };

      console.log('✅ Accepting ride with data:', driverInfo);

      // Accepter la course
      await this.rideService.acceptRide(ride.id, this.currentUser.uid, driverInfo);

      await loading.dismiss();
      
      // Toast de succès
      this.showToast('✅ Course acceptée avec succès !', 'success');
      
      // Rediriger vers la page d'accueil du chauffeur
      this.router.navigate(['/driver/tabs/home']);
      
    } catch (error: any) {
      await loading.dismiss();
      console.error('❌ Error accepting ride:', error);
      
      // Afficher un message d'erreur approprié
      let errorMessage = 'Erreur lors de l\'acceptation de la course';
      
      if (error.message?.includes('plus disponible')) {
        errorMessage = '⚠️ Cette course a déjà été acceptée par un autre chauffeur';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      this.showToast(errorMessage, 'danger');
    }
  }

  // ==========================================
  // IGNORER UNE COURSE
  // ==========================================
  async declineRide(ride: Ride) {
    // Confirmation rapide
    const alert = await this.alertCtrl.create({
      header: 'Ignorer la course',
      message: 'Êtes-vous sûr de vouloir ignorer cette course ?',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Ignorer',
          role: 'destructive',
          handler: () => {
            // Retirer de la liste locale
            this.pendingRides = this.pendingRides.filter(r => r.id !== ride.id);
            this.showToast('Course ignorée', 'medium');
          }
        }
      ]
    });

    await alert.present();
  }

  // ==========================================
  // RAFRAÎCHIR
  // ==========================================
  async handleRefresh(event: any) {
    console.log('🔄 Refreshing rides...');
    
    // Redémarrer l'écoute (les données sont déjà en temps réel)
    this.rideService.stopListeningToPendingRides();
    this.rideService.startListeningToPendingRides();
    
    // Attendre un peu pour l'effet visuel
    setTimeout(() => {
      event.target.complete();
      console.log('✅ Refresh complete');
    }, 500);
  }

  // ==========================================
  // TEMPS ÉCOULÉ
  // ==========================================
  getTimeAgo(date: Date): string {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return `Il y a ${diff}s`;
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)}min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
    return `Il y a ${Math.floor(diff / 86400)}j`;
  }

  // ==========================================
  // FORMATER LA DISTANCE
  // ==========================================
  formatDistance(distance: number): string {
    if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    }
    return `${distance.toFixed(1)} km`;
  }

  // ==========================================
  // FORMATER LA DURÉE
  // ==========================================
  formatDuration(duration: number): string {
    if (duration < 60) {
      return `${Math.round(duration)} min`;
    }
    const hours = Math.floor(duration / 60);
    const minutes = Math.round(duration % 60);
    return `${hours}h ${minutes}min`;
  }

  // ==========================================
  // TOAST
  // ==========================================
  private async showToast(message: string, color: 'success' | 'danger' | 'medium') {
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
  ngOnDestroy() {
    console.log('🧹 Cleaning up RideRequestsPage...');
    this.isPageActive = false;
    
    // Se désabonner de l'Observable
    if (this.ridesSubscription) {
      this.ridesSubscription.unsubscribe();
      this.ridesSubscription = undefined;
    }
    
    // Arrêter l'écoute Firebase
    this.rideService.stopListeningToPendingRides();
    
    console.log('✅ Cleanup complete');
  }
}