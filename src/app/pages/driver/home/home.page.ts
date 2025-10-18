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
  ToastController,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  carSportOutline,
  logOutOutline,
  notificationsOutline,
  cashOutline,
  timeOutline,
  locationOutline
} from 'ionicons/icons';

// ==========================================
// IMPORTS
// ==========================================
import { AuthService } from '../../../core/services/auth.service';
import { User, Driver } from '../../../shared/models/interfaces';
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
    IonText,
    IonToggle,
    IonList,
    IonItem,
    IonLabel
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

  // Injection des services
  private authService = inject(AuthService);
  private database = inject(Database);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);

  constructor() {
    // Enregistrer les icônes
    addIcons({
      carSportOutline,
      logOutOutline,
      notificationsOutline,
      cashOutline,
      timeOutline,
      locationOutline
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
        console.log('✅ Driver data loaded:', this.driverData);
      }
    });
  }

  // ==========================================
  // TOGGLE STATUT ONLINE/OFFLINE
  // ==========================================
  async toggleOnlineStatus(event: any) {
    const newStatus = event.detail.checked;
    
    if (!this.currentUser) return;

    try {
      const driverRef = ref(this.database, `drivers/${this.currentUser.uid}`);
      
      await update(driverRef, {
        isOnline: newStatus,
        status: newStatus ? 'available' : 'offline',
        updatedAt: new Date().toISOString()
      });

      this.isOnline = newStatus;
      
      const message = newStatus 
        ? '🟢 Vous êtes en ligne ! Vous allez recevoir des demandes de courses.' 
        : '🔴 Vous êtes hors ligne.';
      
      this.showToast(message, newStatus ? 'success' : 'warning');
      
    } catch (error) {
      console.error('❌ Error updating status:', error);
      this.showToast('Erreur lors du changement de statut', 'danger');
      // Revenir à l'ancien statut en cas d'erreur
      this.isOnline = !newStatus;
    }
  }

  // ==========================================
  // VOIR LES DEMANDES DE COURSES
  // ==========================================
  viewRideRequests() {
    // TODO: Navigation vers la page des demandes
    this.showToast('Fonctionnalité à venir', 'warning');
    // this.router.navigate(['/driver/ride-requests']);
  }

  // ==========================================
  // DÉCONNEXION
  // ==========================================
  async logout() {
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

  // ==========================================
  // AFFICHER UN TOAST
  // ==========================================
  private async showToast(message: string, color: 'success' | 'danger' | 'warning') {
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