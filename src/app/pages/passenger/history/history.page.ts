// ==========================================
// HISTORY PAGE - HISTORIQUE DES COURSES
// ==========================================
import { Component, OnInit } from '@angular/core';
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
  IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  locationOutline, 
  timeOutline, 
  cashOutline,
  starOutline,
  carOutline,
  navigateOutline
} from 'ionicons/icons';

// ==========================================
// IMPORTS
// ==========================================
import { AuthService } from '../../../core/services/auth.service';
import { Ride } from '../../../shared/models/interfaces';
import { Database, ref, query, orderByChild, equalTo, onValue, off } from '@angular/fire/database';
import { inject } from '@angular/core';

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
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
    IonSpinner
  ]
})
export class HistoryPage implements OnInit {
  
  // ==========================================
  // PROPRIÉTÉS
  // ==========================================
  rides: Ride[] = [];              // Liste des courses
  isLoading: boolean = true;       // État de chargement
  currentUserId: string = '';      // ID de l'utilisateur actuel

  // Injection des services
  private authService = inject(AuthService);
  private database = inject(Database);
  private router = inject(Router);

  constructor() {
    // Enregistrer les icônes
    addIcons({ 
      locationOutline, 
      timeOutline, 
      cashOutline, 
      starOutline,
      carOutline,
      navigateOutline
    });
  }

  // ==========================================
  // INITIALISATION
  // ==========================================
  ngOnInit() {
    // Récupérer l'utilisateur actuel
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
    
    // Référence à la collection rides dans Realtime Database
    const ridesRef = ref(this.database, 'rides');
    
    // Query pour récupérer uniquement les courses de cet utilisateur
    // Note: En Realtime Database, on doit filtrer côté client
    // Pour une vraie app, il faudrait structurer différemment
    onValue(ridesRef, (snapshot) => {
      const ridesData: Ride[] = [];
      
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const ride = childSnapshot.val() as Ride;
          
          // Filtrer seulement les courses de cet utilisateur
          if (ride.passengerId === this.currentUserId) {
            ridesData.push({
              ...ride,
              id: childSnapshot.key!,
              // Convertir les timestamps en dates
              requestedAt: ride.requestedAt ? new Date(ride.requestedAt) : new Date(),
              completedAt: ride.completedAt ? new Date(ride.completedAt) : undefined
            });
          }
        });
        
        // Trier par date décroissante (plus récent en premier)
        this.rides = ridesData.sort((a, b) => 
          b.requestedAt.getTime() - a.requestedAt.getTime()
        );
      } else {
        this.rides = [];
      }
      
      this.isLoading = false;
      console.log('✅ Rides loaded:', this.rides.length);
    }, (error) => {
      console.error('❌ Error loading rides:', error);
      this.isLoading = false;
    });
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
    // TODO: Navigation vers la page de détails
    console.log('View ride details:', ride.id);
    // this.router.navigate(['/passenger/ride-details', ride.id]);
  }

  // ==========================================
  // OBTENIR LA COULEUR DU BADGE SELON LE STATUT
  // ==========================================
  getStatusColor(status: string): string {
    switch (status) {
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'danger';
      case 'started':
        return 'warning';
      case 'accepted':
        return 'tertiary';
      default:
        return 'medium';
    }
  }

  // ==========================================
  // OBTENIR LE TEXTE DU STATUT EN FRANÇAIS
  // ==========================================
  getStatusText(status: string): string {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'accepted':
        return 'Acceptée';
      case 'driver-arriving':
        return 'Chauffeur en route';
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
  // NETTOYAGE À LA DESTRUCTION
  // ==========================================
  ngOnDestroy() {
    // Se désabonner des listeners Firebase
    const ridesRef = ref(this.database, 'rides');
    off(ridesRef);
  }
}