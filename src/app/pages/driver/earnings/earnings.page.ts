// ==========================================
// EARNINGS PAGE CHAUFFEUR - GAINS ET STATISTIQUES
// ==========================================
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonText,
  IonButton,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonSegment,
  IonSegmentButton,
  IonList,
  IonItem,
  IonLabel,
  AlertController,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  cashOutline,
  trendingUpOutline,
  calendarOutline,
  walletOutline,
  cardOutline,
  timeOutline,
  carOutline,
  chevronForwardOutline,
  bulbOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';
import { Database, ref, onValue, off, query, orderByChild, equalTo, get } from '@angular/fire/database';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

interface EarningsSummary {
  today: number;
  week: number;
  month: number;
  total: number;
  pending: number;
  ridesCount: {
    today: number;
    week: number;
    month: number;
    total: number;
  };
}

interface RideEarning {
  id: string;
  date: Date;
  amount: number;
  pickupAddress: string;
  dropoffAddress: string;
  distance: number;
  duration: number;
}

@Component({
  selector: 'app-earnings',
  templateUrl: './earnings.page.html',
  styleUrls: ['./earnings.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    IonText,
    IonButton,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    IonSegment,
    IonSegmentButton,
    IonList,
    IonItem,
    IonLabel
  ]
})
export class EarningsPage implements OnInit, OnDestroy {
  
  // ==========================================
  // PROPRIÉTÉS
  // ==========================================
  earnings: EarningsSummary = {
    today: 0,
    week: 0,
    month: 0,
    total: 0,
    pending: 0,
    ridesCount: {
      today: 0,
      week: 0,
      month: 0,
      total: 0
    }
  };
  
  recentRides: RideEarning[] = [];
  isLoading: boolean = true;
  currentUserId: string = '';
  selectedPeriod: string = 'week';
  
  private subscriptions: Subscription[] = [];

  // Injection des services
  private authService = inject(AuthService);
  private database = inject(Database);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  constructor() {
    addIcons({ 
      cashOutline,
      trendingUpOutline,
      calendarOutline,
      walletOutline,
      cardOutline,
      timeOutline,
      carOutline,
      chevronForwardOutline,
      bulbOutline,
      checkmarkCircleOutline
    });
  }

  // ==========================================
  // INITIALISATION
  // ==========================================
  ngOnInit() {
    const user = this.authService.currentUser;
    if (user) {
      this.currentUserId = user.uid;
      this.loadEarnings();
    }
  }

  // ==========================================
  // CHARGER LES GAINS
  // ==========================================
  async loadEarnings() {
    this.isLoading = true;
    
    try {
      // Charger les données du chauffeur
      const driverRef = ref(this.database, `drivers/${this.currentUserId}`);
      const driverSnapshot = await get(driverRef);
      
      if (driverSnapshot.exists()) {
        const driverData = driverSnapshot.val();
        
        // Charger les courses complétées
        await this.loadCompletedRides();
        
        // Calculer les gains
        this.calculateEarnings();
        
        // Si des données existent déjà dans Firebase, les utiliser
        if (driverData.earnings) {
          this.earnings.pending = driverData.earnings.pendingAmount || 0;
        }
        
        console.log('✅ Earnings loaded:', this.earnings);
      }
    } catch (error) {
      console.error('❌ Error loading earnings:', error);
      this.showToast('Erreur lors du chargement des gains', 'danger');
    } finally {
      this.isLoading = false;
    }
  }

  // ==========================================
  // CHARGER LES COURSES COMPLÉTÉES
  // ==========================================
  async loadCompletedRides() {
    try {
      const ridesRef = ref(this.database, 'rides');
      const completedQuery = query(
        ridesRef,
        orderByChild('driverId'),
        equalTo(this.currentUserId)
      );
      
      const snapshot = await get(completedQuery);
      
      if (snapshot.exists()) {
        this.recentRides = [];
        const ridesData = snapshot.val();
        
        Object.keys(ridesData).forEach(key => {
          const ride = ridesData[key];
          
          // Ne prendre que les courses complétées
          if (ride.status === 'completed' && ride.completedAt) {
            this.recentRides.push({
              id: key,
              date: new Date(ride.completedAt),
              amount: ride.fare || ride.estimatedPrice || 0,
              pickupAddress: ride.pickupLocation?.address || 'Adresse inconnue',
              dropoffAddress: ride.dropoffLocation?.address || 'Adresse inconnue',
              distance: ride.estimatedDistance || 0,
              duration: ride.estimatedDuration || 0
            });
          }
        });
        
        // Trier par date (plus récent d'abord)
        this.recentRides.sort((a, b) => b.date.getTime() - a.date.getTime());
        
        console.log('✅ Loaded', this.recentRides.length, 'completed rides');
      }
    } catch (error) {
      console.error('❌ Error loading completed rides:', error);
    }
  }

  // ==========================================
  // CALCULER LES GAINS
  // ==========================================
  calculateEarnings() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Réinitialiser
    this.earnings = {
      today: 0,
      week: 0,
      month: 0,
      total: 0,
      pending: this.earnings.pending, // Garder la valeur pending
      ridesCount: {
        today: 0,
        week: 0,
        month: 0,
        total: 0
      }
    };
    
    // Calculer pour chaque course
    this.recentRides.forEach(ride => {
      const rideDate = ride.date;
      const amount = ride.amount;
      
      // Total
      this.earnings.total += amount;
      this.earnings.ridesCount.total++;
      
      // Aujourd'hui
      if (rideDate >= todayStart) {
        this.earnings.today += amount;
        this.earnings.ridesCount.today++;
      }
      
      // Cette semaine
      if (rideDate >= weekStart) {
        this.earnings.week += amount;
        this.earnings.ridesCount.week++;
      }
      
      // Ce mois
      if (rideDate >= monthStart) {
        this.earnings.month += amount;
        this.earnings.ridesCount.month++;
      }
    });
    
    console.log('📊 Calculated earnings:', this.earnings);
  }

  // ==========================================
  // OBTENIR LES GAINS SELON LA PÉRIODE
  // ==========================================
  getEarningsForPeriod(): number {
    switch(this.selectedPeriod) {
      case 'today':
        return this.earnings.today;
      case 'week':
        return this.earnings.week;
      case 'month':
        return this.earnings.month;
      default:
        return this.earnings.week;
    }
  }

  // ==========================================
  // OBTENIR LES COURSES SELON LA PÉRIODE
  // ==========================================
  getRidesForPeriod(): number {
    switch(this.selectedPeriod) {
      case 'today':
        return this.earnings.ridesCount.today;
      case 'week':
        return this.earnings.ridesCount.week;
      case 'month':
        return this.earnings.ridesCount.month;
      default:
        return this.earnings.ridesCount.week;
    }
  }

  // ==========================================
  // CALCULER LE GAIN MOYEN PAR COURSE
  // ==========================================
  getAverageEarningPerRide(): number {
    const earnings = this.getEarningsForPeriod();
    const rides = this.getRidesForPeriod();
    return rides > 0 ? earnings / rides : 0;
  }

  // ==========================================
  // OBTENIR LES COURSES RÉCENTES POUR LA PÉRIODE
  // ==========================================
  getRecentRidesForPeriod(): RideEarning[] {
    const now = new Date();
    let startDate: Date;
    
    switch(this.selectedPeriod) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
    
    return this.recentRides
      .filter(ride => ride.date >= startDate)
      .slice(0, 10); // Limiter à 10 courses
  }

  // ==========================================
  // RAFRAÎCHIR
  // ==========================================
  async handleRefresh(event: any) {
    await this.loadEarnings();
    event.target.complete();
  }

  // ==========================================
  // DEMANDER UN RETRAIT
  // ==========================================
  async requestPayout() {
    if (this.earnings.pending === 0) {
      this.showToast('Aucun montant disponible pour le retrait', 'warning');
      return;
    }
    
    const alert = await this.alertCtrl.create({
      header: '💳 Demande de retrait',
      message: `
        <div style="text-align: left; line-height: 1.8;">
          <p><strong>Montant à retirer:</strong></p>
          <h2 style="color: #2dd36f; margin: 12px 0;">${this.earnings.pending.toFixed(2)} DT</h2>
          
          <p style="margin-top: 16px;"><strong>Informations:</strong></p>
          <ul style="margin-left: 20px; font-size: 0.9em;">
            <li>Le retrait sera traité sous 2-3 jours ouvrables</li>
            <li>Le montant sera viré sur votre compte bancaire</li>
            <li>Un email de confirmation vous sera envoyé</li>
          </ul>
          
          <p style="color: #666; font-size: 0.85em; margin-top: 12px;">
            Assurez-vous que vos informations bancaires sont à jour.
          </p>
        </div>
      `,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Confirmer',
          handler: async () => {
            await this.processPayout();
          }
        }
      ]
    });
    
    await alert.present();
  }

  // ==========================================
  // TRAITER LE RETRAIT
  // ==========================================
  async processPayout() {
    const loading = await this.loadingCtrl.create({
      message: 'Traitement de la demande...',
      spinner: 'crescent'
    });
    await loading.present();
    
    try {
      // TODO: Implémenter la logique de retrait avec votre backend
      // Pour l'instant, on simule juste le processus
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Créer une demande de paiement dans Firebase
      const payoutRequest = {
        driverId: this.currentUserId,
        amount: this.earnings.pending,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        method: 'bank_transfer'
      };
      
      console.log('💳 Payout request created:', payoutRequest);
      
      await loading.dismiss();
      
      // Afficher une confirmation
      const successAlert = await this.alertCtrl.create({
        header: '✅ Demande envoyée',
        message: `
          <div style="text-align: center; line-height: 1.8;">
            <ion-icon name="checkmark-circle-outline" style="font-size: 64px; color: #2dd36f;"></ion-icon>
            <p style="margin-top: 16px;">Votre demande de retrait de <strong>${this.earnings.pending.toFixed(2)} DT</strong> a été envoyée avec succès.</p>
            <p style="color: #666; font-size: 0.9em; margin-top: 12px;">
              Vous recevrez un email de confirmation sous peu.
            </p>
          </div>
        `,
        buttons: ['OK']
      });
      
      await successAlert.present();
      
      // Réinitialiser le montant en attente
      this.earnings.pending = 0;
      
    } catch (error) {
      await loading.dismiss();
      console.error('❌ Error processing payout:', error);
      this.showToast('Erreur lors du traitement de la demande', 'danger');
    }
  }

  // ==========================================
  // FORMATER LA DATE
  // ==========================================
  formatDate(date: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Aujourd\'hui';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    } else {
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'short' 
      });
    }
  }

  // ==========================================
  // FORMATER L'HEURE
  // ==========================================
  formatTime(date: Date): string {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
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
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    if (this.currentUserId) {
      const driverRef = ref(this.database, `drivers/${this.currentUserId}`);
      off(driverRef);
    }
  }
}