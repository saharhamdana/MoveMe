// ==========================================
// EARNINGS PAGE CHAUFFEUR - GAINS ET STATISTIQUES
// VERSION CORRIGÉE AVEC CAPACITOR
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
  checkmarkCircleOutline,
  reloadOutline,
  location,
  radioButtonOn
} from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';
import { CapacitorService } from '../../../core/services/capacitor.service';
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
  status: string;
}

/**
 * Page des gains du chauffeur
 * Utilise Capacitor pour :
 * - Feedback tactile lors des actions
 * - Rafraîchissement pull-to-refresh
 * - Sauvegarder les préférences d'affichage
 * - Notifications des gains
 */
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
  private capacitorService = inject(CapacitorService);
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
      checkmarkCircleOutline,
      reloadOutline,
      location,
      radioButtonOn
    });
  }

  // ==========================================
  // INITIALISATION
  // ==========================================
  async ngOnInit() {
    console.log('💰 Initialisation EarningsPage');
    
    // Feedback tactile
    await this.capacitorService.vibrate();

    const user = this.authService.currentUser;
    if (user) {
      this.currentUserId = user.uid;
      await this.loadEarnings();
      
      // Charger la période sauvegardée
      await this.loadSavedPeriod();
      
      // Écouter les changements en temps réel
      this.listenToRidesChanges();
    }
  }

  // ==========================================
  // ÉCOUTER LES CHANGEMENTS EN TEMPS RÉEL
  // ==========================================
  
  /**
   * Écoute les changements de courses en temps réel
   * Met à jour automatiquement les gains
   */
  listenToRidesChanges() {
    const ridesRef = ref(this.database, 'rides');
    
    onValue(ridesRef, async (snapshot) => {
      if (snapshot.exists()) {
        console.log('🔄 Mise à jour des courses détectée');
        await this.loadEarnings();
      }
    });
  }

  // ==========================================
  // CHARGER LES GAINS
  // ==========================================
  async loadEarnings() {
    this.isLoading = true;
    
    try {
      // Charger les courses du chauffeur
      await this.loadDriverRides();
      
      // Calculer les gains
      this.calculateEarnings();
      
      // Sauvegarder dans le cache local
      await this.capacitorService.setPreference('lastEarnings', this.earnings);
      
      console.log('✅ Earnings loaded:', this.earnings);
      
      // Notification si gains > 0
      if (this.earnings.total > 0) {
        await this.capacitorService.showToast(
          `💰 Total: ${this.earnings.total.toFixed(2)} DT`,
          'short'
        );
      }
      
    } catch (error) {
      console.error('❌ Error loading earnings:', error);
      
      // Essayer de charger depuis le cache
      const cachedEarnings = await this.capacitorService.getPreference('lastEarnings');
      if (cachedEarnings) {
        this.earnings = cachedEarnings;
        await this.capacitorService.showToast('📦 Données chargées du cache', 'short');
      } else {
        await this.capacitorService.showToast('❌ Erreur de chargement', 'short');
      }
    } finally {
      this.isLoading = false;
    }
  }

  // ==========================================
  // CHARGER LES COURSES DU CHAUFFEUR
  // ==========================================
  
  /**
   * Charge TOUTES les courses du chauffeur (pas seulement completed)

   */
  async loadDriverRides() {
    try {
      const ridesRef = ref(this.database, 'rides');
      const snapshot = await get(ridesRef);
      
      if (snapshot.exists()) {
        this.recentRides = [];
        const ridesData = snapshot.val();
        
        Object.keys(ridesData).forEach(key => {
          const ride = ridesData[key];
          
         
          if (ride.driverId === this.currentUserId) {
            
         
            const validStatuses = ['completed', 'started', 'driver-arriving', 'accepted'];
            
            if (validStatuses.includes(ride.status)) {
              
              // Date de la course (utiliser différentes propriétés selon le statut)
              let rideDate = new Date();
              if (ride.completedAt) {
                rideDate = new Date(ride.completedAt);
              } else if (ride.startedAt) {
                rideDate = new Date(ride.startedAt);
              } else if (ride.acceptedAt) {
                rideDate = new Date(ride.acceptedAt);
              } else if (ride.requestedAt) {
                rideDate = new Date(ride.requestedAt);
              }

              // ✅ CORRECTION: Utiliser le prix estimé si pas de prix final
              const amount = ride.finalPrice || ride.estimatedPrice || 0;

              this.recentRides.push({
                id: key,
                date: rideDate,
                amount: amount,
                pickupAddress: ride.pickupLocation?.address || 'Adresse inconnue',
                dropoffAddress: ride.dropoffLocation?.address || 'Adresse inconnue',
                distance: ride.estimatedDistance || 0,
                duration: ride.actualDuration || ride.estimatedDuration || 0,
                status: ride.status
              });
            }
          }
        });
        
        // Trier par date (plus récent d'abord)
        this.recentRides.sort((a, b) => b.date.getTime() - a.date.getTime());
        
        console.log('✅ Loaded', this.recentRides.length, 'rides for driver');
        
        // Debug: Afficher les courses chargées
        if (this.recentRides.length > 0) {
          console.log('📊 Courses chargées:', this.recentRides.map(r => ({
            status: r.status,
            amount: r.amount,
            date: r.date
          })));
        }
      } else {
        console.log('⚠️ Aucune course trouvée dans Firebase');
      }
    } catch (error) {
      console.error('❌ Error loading driver rides:', error);
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
      pending: 0,
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
      
      // ✅ Total (toutes les courses)
      this.earnings.total += amount;
      this.earnings.ridesCount.total++;
      
      // ✅ Courses non complétées = pending
      if (ride.status !== 'completed') {
        this.earnings.pending += amount;
      }
      
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
  // GESTION DES PÉRIODES
  // ==========================================
  
  /**
   * Charge la période sauvegardée
   */
  async loadSavedPeriod() {
    const saved = await this.capacitorService.getPreference('selectedPeriod');
    if (saved) {
      this.selectedPeriod = saved;
    }
  }

  /**
   * Sauvegarde la période sélectionnée
   */
  async onPeriodChange() {
    await this.capacitorService.vibrate();
    await this.capacitorService.setPreference('selectedPeriod', this.selectedPeriod);
  }

  /**
   * Obtenir les gains selon la période
   */
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

  /**
   * Obtenir le nombre de courses selon la période
   */
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

  /**
   * Calculer le gain moyen par course
   */
  getAverageEarningPerRide(): number {
    const earnings = this.getEarningsForPeriod();
    const rides = this.getRidesForPeriod();
    return rides > 0 ? earnings / rides : 0;
  }

  /**
   * Obtenir les courses récentes pour la période
   */
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
    // Feedback tactile
    await this.capacitorService.vibrateLight();
    
    await this.loadEarnings();
    
    event.target.complete();
    
    await this.capacitorService.showToast('🔄 Mis à jour', 'short');
  }

  // ==========================================
  // DEMANDER UN RETRAIT
  // ==========================================
  async requestPayout() {
    // Feedback tactile
    await this.capacitorService.vibrateMedium();
    
    if (this.earnings.pending === 0 && this.earnings.total === 0) {
      await this.capacitorService.showToast(
        '⚠️ Aucun montant disponible pour le retrait',
        'short'
      );
      return;
    }
    
    // Utiliser le total si pending est 0
    const amountToWithdraw = this.earnings.pending > 0 
      ? this.earnings.pending 
      : this.earnings.total;
    
    const alert = await this.alertCtrl.create({
      header: '💳 Demande de retrait',
      message: `
        <div style="text-align: left; line-height: 1.8;">
          <p><strong>Montant à retirer:</strong></p>
          <h2 style="color: #2dd36f; margin: 12px 0;">${amountToWithdraw.toFixed(2)} DT</h2>
          
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
          role: 'cancel',
          handler: async () => {
            await this.capacitorService.vibrate();
          }
        },
        {
          text: 'Confirmer',
          handler: async () => {
            await this.processPayout(amountToWithdraw);
          }
        }
      ]
    });
    
    await alert.present();
  }

  // ==========================================
  // TRAITER LE RETRAIT
  // ==========================================
  async processPayout(amount: number) {
    const loading = await this.loadingCtrl.create({
      message: 'Traitement de la demande...',
      spinner: 'crescent'
    });
    await loading.present();
    
    try {
      // Simulation du traitement
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // TODO: Créer une demande de paiement dans Firebase
      const payoutRequest = {
        driverId: this.currentUserId,
        amount: amount,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        method: 'bank_transfer'
      };
      
      console.log('💳 Payout request created:', payoutRequest);
      
      await loading.dismiss();
      
      // Vibration forte de succès
      await this.capacitorService.vibrateHeavy();
      
      // Afficher une confirmation
      const successAlert = await this.alertCtrl.create({
        header: '✅ Demande envoyée',
        message: `
          <div style="text-align: center; line-height: 1.8;">
            <p style="margin-top: 16px;">Votre demande de retrait de <strong>${amount.toFixed(2)} DT</strong> a été envoyée avec succès.</p>
            <p style="color: #666; font-size: 0.9em; margin-top: 12px;">
              Vous recevrez un email de confirmation sous peu.
            </p>
          </div>
        `,
        buttons: ['OK']
      });
      
      await successAlert.present();
      
      // Toast de confirmation
      await this.capacitorService.showToast('✅ Demande envoyée', 'short');
      
      // Recharger les gains
      await this.loadEarnings();
      
    } catch (error) {
      await loading.dismiss();
      console.error('❌ Error processing payout:', error);
      await this.capacitorService.showToast('❌ Erreur de traitement', 'short');
      await this.capacitorService.vibrateMedium();
    }
  }

  // ==========================================
  // FORMATERS
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

  formatTime(date: Date): string {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * Retourne le badge de statut de la course
   */
  getStatusBadge(status: string): string {
    switch (status) {
      case 'completed': return '✅';
      case 'started': return '🚗';
      case 'driver-arriving': return '🏃';
      case 'accepted': return '👍';
      default: return '⏳';
    }
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
    console.log('🛑 Destruction EarningsPage');
    
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    if (this.currentUserId) {
      const ridesRef = ref(this.database, 'rides');
      off(ridesRef);
    }
  }
}