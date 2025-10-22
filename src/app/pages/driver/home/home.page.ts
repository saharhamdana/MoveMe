// ==========================================
// HOME DRIVER - PAGE PRINCIPALE CHAUFFEUR
// ==========================================
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
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
  carOutline
} from 'ionicons/icons';

// ==========================================
// IMPORTS
// ==========================================
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../shared/models/interfaces';
import { Database, ref, update, onValue, off } from '@angular/fire/database';
import { FormsModule } from '@angular/forms';

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
  currentUser: User | null = null;
  driverData: any = null;
  isOnline: boolean = false;
  pendingRides: number = 0;
  
  // Statistiques rapides
  todayEarnings: number = 0;
  todayRides: number = 0;

  // Injection des services
  private authService = inject(AuthService);
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
      carOutline
    });
  }

  // ==========================================
  // INITIALISATION
  // ==========================================
  ngOnInit() {
    // Récupérer l'utilisateur actuel
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user && user.role === 'driver') {
        this.loadDriverData(user.uid);
        this.loadPendingRides();
      }
    });
  }

  // ==========================================
  // CHARGER LES DONNÉES DU CHAUFFEUR
  // ==========================================
  loadDriverData(driverId: string) {
    const driverRef = ref(this.database, `drivers/${driverId}`);
    
    onValue(driverRef, (snapshot) => {
      if (snapshot.exists()) {
        this.driverData = snapshot.val();
        this.isOnline = this.driverData.isOnline || false;
        
        // Calculer les gains du jour
        this.todayEarnings = this.calculateTodayEarnings();
        this.todayRides = this.calculateTodayRides();
        
        console.log('✅ Driver data loaded:', this.driverData);
      }
    });
  }

  // ==========================================
  // CHARGER LES DEMANDES EN ATTENTE
  // ==========================================
  loadPendingRides() {
    // TODO: Implémenter le comptage des rides en attente
    // Pour l'instant, on simule avec 0
    this.pendingRides = 0;
  }

  // ==========================================
  // CALCULER LES GAINS DU JOUR
  // ==========================================
  calculateTodayEarnings(): number {
    // TODO: Calculer depuis les rides complétées aujourd'hui
    return 0;
  }

  // ==========================================
  // CALCULER LES COURSES DU JOUR
  // ==========================================
  calculateTodayRides(): number {
    // TODO: Compter les rides complétées aujourd'hui
    return 0;
  }

  // ==========================================
  // TOGGLE STATUT ONLINE/OFFLINE
  // ==========================================
  async toggleOnlineStatus(event: any) {
    const newStatus = event.detail.checked;
    
    if (!this.currentUser) return;

    // Si on passe en ligne, demander confirmation
    if (newStatus) {
      const alert = await this.alertCtrl.create({
        header: 'Passer en ligne',
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
              await this.updateOnlineStatus(true);
            }
          }
        ]
      });
      await alert.present();
    } else {
      // Passer hors ligne directement
      await this.updateOnlineStatus(false);
    }
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
        status: status ? 'available' : 'offline',
        updatedAt: new Date().toISOString()
      });

      this.isOnline = status;
      
      const message = status 
        ? '🟢 Vous êtes maintenant EN LIGNE ! Vous allez recevoir des demandes.' 
        : '🔴 Vous êtes HORS LIGNE. Vous ne recevrez plus de demandes.';
      
      this.showToast(message, status ? 'success' : 'warning');
      
    } catch (error) {
      console.error('❌ Error updating status:', error);
      this.showToast('Erreur lors du changement de statut', 'danger');
      // Revenir à l'ancien statut
      this.isOnline = !status;
    }
  }

  // ==========================================
  // VOIR LES DEMANDES DE COURSES
  // ==========================================
  viewRideRequests() {
  if (!this.isOnline) {
    this.showToast('Vous devez être en ligne pour voir les demandes', 'warning');
    return;
  }
  // Navigation vers la page des demandes
  this.router.navigate(['/driver/ride-requests']);
}

  // ==========================================
  // RAFRAÎCHIR
  // ==========================================
  handleRefresh(event: any) {
    if (this.currentUser) {
      this.loadDriverData(this.currentUser.uid);
      this.loadPendingRides();
    }
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  // ==========================================
  // DÉCONNEXION
  // ==========================================
  async logout() {
    // Si en ligne, avertir
    if (this.isOnline) {
      const alert = await this.alertCtrl.create({
        header: 'Attention',
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
              await this.authService.logout();
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
              await this.authService.logout();
            }
          }
        ]
      });
      await alert.present();
    }
  }

  // ==========================================
  // AFFICHER UN TOAST
  // ==========================================
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
  ngOnDestroy() {
    if (this.currentUser) {
      const driverRef = ref(this.database, `drivers/${this.currentUser.uid}`);
      off(driverRef);
    }
  }
}