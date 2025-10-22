// ==========================================
// HISTORY PAGE CHAUFFEUR - HISTORIQUE DES COURSES
// ==========================================
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonText,
  IonButton,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonSegment,
  IonSegmentButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  locationOutline, 
  timeOutline, 
  cashOutline,
  starOutline,
  navigateOutline,
  personOutline,
  calendarOutline,
  carOutline
} from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';
import { Ride } from '../../../shared/models/interfaces';
import { Database, ref, query, orderByChild, onValue, off } from '@angular/fire/database';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonLabel,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonText,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    IonSegment,
    IonSegmentButton
  ]
})
export class HistoryPage implements OnInit, OnDestroy {
  
  // ==========================================
  // PROPRIÉTÉS
  // ==========================================
  rides: Ride[] = [];
  filteredRides: Ride[] = [];
  isLoading: boolean = true;
  currentUserId: string = '';
  selectedSegment: string = 'all'; // all, completed, cancelled
  
  // Statistiques
  totalRides: number = 0;
  totalEarnings: number = 0;
  averageRating: number = 0;

  // Injection des services
  private authService = inject(AuthService);
  private database = inject(Database);
  private router = inject(Router);

  constructor() {
    addIcons({ 
      locationOutline, 
      timeOutline, 
      cashOutline, 
      starOutline,
      navigateOutline,
      personOutline,
      calendarOutline,
      carOutline
    });
  }

  // ==========================================
  // INITIALISATION
  // ==========================================
  ngOnInit() {
    const user = this.authService.currentUser;
    if (user) {
      this.currentUserId = user.uid;
      this.loadRides();
    }
  }

  // ==========================================
  // CHARGER LES COURSES
  // ==========================================
  loadRides() {
    this.isLoading = true;
    
    const ridesRef = ref(this.database, 'rides');
    
    onValue(ridesRef, (snapshot) => {
      const ridesData: Ride[] = [];
      
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const ride = childSnapshot.val() as Ride;
          
          // Filtrer seulement les courses de ce chauffeur
          if (ride.driverId === this.currentUserId) {
            ridesData.push({
              ...ride,
              id: childSnapshot.key!,
              requestedAt: ride.requestedAt ? new Date(ride.requestedAt) : new Date(),
              completedAt: ride.completedAt ? new Date(ride.completedAt) : undefined,
              acceptedAt: ride.acceptedAt ? new Date(ride.acceptedAt) : undefined,
              startedAt: ride.startedAt ? new Date(ride.startedAt) : undefined
            });
          }
        });
        
        // Trier par date décroissante
        this.rides = ridesData.sort((a, b) => 
          b.requestedAt.getTime() - a.requestedAt.getTime()
        );
        
        // Calculer les statistiques
        this.calculateStats();
        
        // Appliquer le filtre
        this.filterRides(this.selectedSegment);
      } else {
        this.rides = [];
        this.filteredRides = [];
      }
      
      this.isLoading = false;
      console.log('✅ Rides loaded:', this.rides.length);
    });
  }

  // ==========================================
  // CALCULER LES STATISTIQUES
  // ==========================================
  calculateStats() {
    this.totalRides = this.rides.length;
    
    // Total des gains
    this.totalEarnings = this.rides
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + (r.finalPrice || r.estimatedPrice), 0);
    
    // Note moyenne
    const ratedRides = this.rides.filter(r => r.rating);
    if (ratedRides.length > 0) {
      const totalRating = ratedRides.reduce((sum, r) => sum + (r.rating || 0), 0);
      this.averageRating = totalRating / ratedRides.length;
    } else {
      this.averageRating = 5.0;
    }
  }

  // ==========================================
  // FILTRER LES COURSES
  // ==========================================
  filterRides(segment: string) {
    this.selectedSegment = segment;
    
    switch(segment) {
      case 'completed':
        this.filteredRides = this.rides.filter(r => r.status === 'completed');
        break;
      case 'cancelled':
        this.filteredRides = this.rides.filter(r => r.status === 'cancelled');
        break;
      default:
        this.filteredRides = [...this.rides];
    }
  }

  // ==========================================
  // RAFRAÎCHIR LA LISTE
  // ==========================================
  handleRefresh(event: any) {
    this.loadRides();
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  // ==========================================
  // VOIR LES DÉTAILS D'UNE COURSE
  // ==========================================
  viewRideDetails(ride: Ride) {
    console.log('View ride details:', ride.id);
    // TODO: Navigation vers détails
  }

  // ==========================================
  // OBTENIR LA COULEUR DU BADGE
  // ==========================================
  getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'danger';
      case 'started':
        return 'warning';
      default:
        return 'medium';
    }
  }

  // ==========================================
  // OBTENIR LE TEXTE DU STATUT
  // ==========================================
  getStatusText(status: string): string {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'accepted':
        return 'Acceptée';
      case 'driver-arriving':
        return 'En route vers client';
      case 'started':
        return 'En cours';
      case 'completed':
        return 'Terminée';
      case 'cancelled':
        return 'Annulée';
      default:
        return status;
    }
  }

  // ==========================================
  // FORMATER LA DATE
  // ==========================================
  formatDate(date: Date): string {
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Intl.DateTimeFormat('fr-FR', options).format(date);
  }

  // ==========================================
  // FORMATER LA DURÉE
  // ==========================================
  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  }

  // ==========================================
  // NETTOYAGE
  // ==========================================
  ngOnDestroy() {
    const ridesRef = ref(this.database, 'rides');
    off(ridesRef);
  }
}