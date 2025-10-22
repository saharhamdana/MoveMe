// ==========================================
// SEARCH RIDE PAGE - DEMANDER UNE COURSE
// VERSION AVEC CAPACITOR GÉOLOCALISATION
// ==========================================
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonText,
  IonSelect,
  IonSelectOption,
  IonButtons,
  IonBackButton,
  IonSpinner,
  IonBadge,
  LoadingController,
  ToastController,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  locationOutline,
  navigateOutline,
  carOutline,
  cashOutline,
  timeOutline,
  searchOutline,
  locateOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';

import { AuthService } from '../../../core/services/auth.service';
import { RideService } from '../../../core/services/ride.service';
import { CapacitorService } from '../../../core/services/capacitor.service';
import { Location, VehicleType, RideRequest } from '../../../shared/models/interfaces';

/**
 * Page de recherche et demande de course
 * Utilise Capacitor pour :
 * - Récupérer automatiquement la position GPS actuelle
 * - Charger les recherches récentes
 * - Feedback tactile lors des actions
 */
@Component({
  selector: 'app-search-ride',
  templateUrl: './search-ride.page.html',
  styleUrls: ['./search-ride.page.scss'],
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
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonButtons,
    IonBackButton,
    IonSpinner,
    IonBadge,
    IonText
  ]
})
export class SearchRidePage implements OnInit, OnDestroy {
  
  // ==========================================
  // PROPRIÉTÉS
  // ==========================================
  
  /**
   * Adresse de départ (texte)
   */
  pickupAddress: string = '';
  
  /**
   * Adresse d'arrivée (texte)
   */
  dropoffAddress: string = '';
  
  /**
   * Type de véhicule sélectionné
   */
  vehicleType: VehicleType = 'economy';
  
  /**
   * Moyen de paiement
   */
  paymentMethod: string = 'cash';
  
  /**
   * Coordonnées GPS du point de départ
   * Récupérées automatiquement via Capacitor Geolocation
   */
  pickupLocation: Location = {
    latitude: 0,
    longitude: 0,
    address: ''
  };
  
  /**
   * Coordonnées GPS de la destination
   * TODO: À récupérer via Google Places API ou géocodage
   */
  dropoffLocation: Location = {
    latitude: 0,
    longitude: 0,
    address: ''
  };
  
  /**
   * Distance estimée en kilomètres
   */
  estimatedDistance: number = 0;
  
  /**
   * Durée estimée en minutes
   */
  estimatedDuration: number = 0;
  
  /**
   * Prix estimé en DT
   */
  estimatedPrice: number = 0;
  
  /**
   * Affiche ou cache la section d'estimation
   */
  showEstimation: boolean = false;

  /**
   * Indique si la position GPS est en cours de chargement
   */
  isLoadingPosition: boolean = true;

  /**
   * Indique si la position GPS a été récupérée avec succès
   */
  hasPosition: boolean = false;

  /**
   * Message d'erreur de localisation
   */
  locationError: string | null = null;

  /**
   * Historique des recherches récentes (5 dernières)
   */
  recentSearches: string[] = [];

  /**
   * Types de véhicules avec leurs caractéristiques
   */
  vehicleTypes = [
    {
      value: 'economy',
      label: 'Économique',
      description: '1-4 passagers',
      priceMultiplier: 1.0,
      icon: '🚗'
    },
    {
      value: 'comfort',
      label: 'Confort',
      description: '1-4 passagers, Plus d\'espace',
      priceMultiplier: 1.3,
      icon: '🚙'
    },
    {
      value: 'premium',
      label: 'Premium',
      description: '1-4 passagers, Luxe',
      priceMultiplier: 1.6,
      icon: '🚘'
    }
  ];

  // Injection de services
  private authService = inject(AuthService);
  private rideService = inject(RideService);
  private capacitorService = inject(CapacitorService);
  private router = inject(Router);
  private loadingCtrl = inject(LoadingController);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);

  constructor() {
    // Enregistrement des icônes
    addIcons({ 
      locationOutline,
      navigateOutline,
      carOutline,
      cashOutline,
      timeOutline,
      searchOutline,
      locateOutline,
      checkmarkCircleOutline
    });
  }

  // ==========================================
  // LIFECYCLE HOOKS
  // ==========================================
  
  /**
   * Initialisation de la page
   * - Récupère la position GPS actuelle
   * - Charge les recherches récentes
   * - Charge la position sauvegardée (depuis home.page)
   */
  async ngOnInit() {
    console.log('🔍 Initialisation SearchRidePage');

    // Charger les recherches récentes
    await this.loadRecentSearches();

    // Récupérer la position GPS actuelle
    await this.getCurrentLocation();

    // Feedback tactile à l'ouverture de la page
    await this.capacitorService.vibrate();
  }

  /**
   * Nettoyage lors de la destruction du composant
   */
  ngOnDestroy() {
    console.log('🛑 Destruction SearchRidePage');
  }

  // ==========================================
  // GÉOLOCALISATION
  // ==========================================
  
  /**
   * Récupère la position GPS actuelle de l'utilisateur
   * Utilise Capacitor Geolocation
   */
  async getCurrentLocation() {
    try {
      console.log('📍 Récupération de la position actuelle...');
      this.isLoadingPosition = true;
      this.locationError = null;

      // Vérifier si une position est déjà sauvegardée (depuis home.page)
      const savedLocation = await this.capacitorService.getPreference('pickupLocation');
      
      if (savedLocation) {
        console.log('📍 Position sauvegardée trouvée:', savedLocation);
        this.pickupLocation = {
          latitude: savedLocation.lat,
          longitude: savedLocation.lng,
          address: this.pickupAddress || 'Ma position actuelle'
        };
        this.hasPosition = true;
        this.isLoadingPosition = false;
        
        // Mettre à jour l'adresse de départ
        if (!this.pickupAddress) {
          this.pickupAddress = 'Ma position actuelle';
        }
        
        await this.capacitorService.showToast('📍 Position chargée', 'short');
        return;
      }

      // Sinon, récupérer la position en temps réel
      const position = await this.capacitorService.getCurrentPosition();

      if (position) {
        this.pickupLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          address: this.pickupAddress || 'Ma position actuelle'
        };

        this.hasPosition = true;
        this.isLoadingPosition = false;

        // Mettre à jour l'adresse de départ
        if (!this.pickupAddress) {
          this.pickupAddress = 'Ma position actuelle';
        }

        console.log('✅ Position récupérée:', this.pickupLocation);
        await this.capacitorService.showToast('📍 Position détectée', 'short');

        // Sauvegarder la position pour une utilisation ultérieure
        await this.capacitorService.setPreference('pickupLocation', {
          lat: this.pickupLocation.latitude,
          lng: this.pickupLocation.longitude
        });

      } else {
        throw new Error('Position non disponible');
      }

    } catch (error) {
      console.error('❌ Erreur getCurrentLocation:', error);
      this.locationError = 'Impossible de récupérer votre position';
      this.isLoadingPosition = false;
      this.hasPosition = false;
      
      await this.capacitorService.showToast(
        '⚠️ Activez la localisation pour continuer',
        'long'
      );
    }
  }

  /**
   * Réessaye de récupérer la position GPS
   */
  async retryLocation() {
    await this.capacitorService.vibrate();
    await this.getCurrentLocation();
  }

  /**
   * Utilise ma position actuelle comme point de départ
   */
  async useMyLocation() {
    await this.capacitorService.vibrate();
    this.pickupAddress = 'Ma position actuelle';
    await this.getCurrentLocation();
  }

  // ==========================================
  // RECHERCHES RÉCENTES
  // ==========================================
  
  /**
   * Charge les recherches récentes depuis le stockage local
   */
  async loadRecentSearches() {
    try {
      const searches = await this.capacitorService.getPreference('recentSearches');
      if (searches && Array.isArray(searches)) {
        this.recentSearches = searches;
        console.log('📜 Recherches récentes chargées:', this.recentSearches);
      }
    } catch (error) {
      console.error('❌ Erreur loadRecentSearches:', error);
    }
  }

  /**
   * Sauvegarde une recherche dans l'historique
   * @param address - Adresse recherchée
   */
  async saveRecentSearch(address: string) {
    try {
      // Ajouter au début du tableau
      this.recentSearches.unshift(address);
      
      // Supprimer les doublons
      this.recentSearches = [...new Set(this.recentSearches)];
      
      // Garder seulement les 5 dernières
      this.recentSearches = this.recentSearches.slice(0, 5);

      // Sauvegarder dans le stockage local
      await this.capacitorService.setPreference('recentSearches', this.recentSearches);
      
      console.log('💾 Recherche sauvegardée:', address);
    } catch (error) {
      console.error('❌ Erreur saveRecentSearch:', error);
    }
  }

  /**
   * Utilise une recherche récente
   * @param address - Adresse à utiliser
   */
  async useRecentSearch(address: string) {
    await this.capacitorService.vibrate();
    this.dropoffAddress = address;
  }

  // ==========================================
  // CALCUL D'ESTIMATION
  // ==========================================
  
  /**
   * Calcule l'estimation de la course
   * - Distance
   * - Durée
   * - Prix
   */
  async calculateEstimation() {
    // Validation des champs
    if (!this.pickupAddress || !this.dropoffAddress) {
      await this.capacitorService.showToast(
        '⚠️ Veuillez remplir les adresses',
        'short'
      );
      await this.capacitorService.vibrateMedium();
      return;
    }

    // Vérifier qu'on a bien une position GPS
    if (!this.hasPosition) {
      await this.capacitorService.showToast(
        '⚠️ Position GPS non disponible',
        'short'
      );
      await this.capacitorService.vibrateMedium();
      return;
    }

    // Feedback tactile
    await this.capacitorService.vibrate();

    // Afficher un loading
    const loading = await this.loadingCtrl.create({
      message: 'Calcul en cours...',
      duration: 1000,
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // TODO: Utiliser Google Maps Distance Matrix API pour un calcul réel
      // Pour l'instant, simulation basée sur des coordonnées aléatoires
      
      // Simuler des coordonnées pour la destination
      // (En production, utiliser Google Places API pour géocoder l'adresse)
      this.dropoffLocation = {
        latitude: this.pickupLocation.latitude + (Math.random() * 0.1 - 0.05),
        longitude: this.pickupLocation.longitude + (Math.random() * 0.1 - 0.05),
        address: this.dropoffAddress
      };

      // Calculer la distance en ligne droite (approximation)
      this.estimatedDistance = this.capacitorService.calculateDistance(
        this.pickupLocation.latitude,
        this.pickupLocation.longitude,
        this.dropoffLocation.latitude,
        this.dropoffLocation.longitude
      );

      // Si la distance est trop petite, mettre un minimum
      if (this.estimatedDistance < 1) {
        this.estimatedDistance = Math.random() * 4 + 2; // 2-6 km
      }

      // Durée estimée (environ 3 min par km en ville)
      this.estimatedDuration = Math.round(this.estimatedDistance * 3);

      // Calcul du prix via le RideService
      this.estimatedPrice = this.rideService.calculateEstimatedPrice(
        this.estimatedDistance,
        this.estimatedDuration,
        this.vehicleType
      );

      // Mettre à jour les adresses dans les locations
      this.pickupLocation.address = this.pickupAddress;
      this.dropoffLocation.address = this.dropoffAddress;

      // Afficher l'estimation
      this.showEstimation = true;

      // Sauvegarder dans l'historique
      await this.saveRecentSearch(this.dropoffAddress);

      await loading.dismiss();

      // Feedback tactile de succès
      await this.capacitorService.vibrateLight();
      await this.capacitorService.showToast('✅ Estimation calculée', 'short');

      console.log('📊 Estimation:', {
        distance: this.estimatedDistance,
        duration: this.estimatedDuration,
        price: this.estimatedPrice,
        pickup: this.pickupLocation,
        dropoff: this.dropoffLocation
      });

    } catch (error) {
      await loading.dismiss();
      console.error('❌ Erreur calculateEstimation:', error);
      await this.capacitorService.showToast('❌ Erreur de calcul', 'short');
      await this.capacitorService.vibrateMedium();
    }
  }

  // ==========================================
  // CONFIRMATION DE LA COURSE
  // ==========================================
  
  /**
   * Affiche une alerte de confirmation avant de créer la demande
   */
  async confirmRide() {
    const user = this.authService.currentUser;
    if (!user) {
      await this.capacitorService.showToast(
        '❌ Erreur: Utilisateur non connecté',
        'short'
      );
      return;
    }

    // Feedback tactile
    await this.capacitorService.vibrate();

    // Afficher l'alerte de confirmation
    const alert = await this.alertCtrl.create({
      header: 'Confirmer la course',
      message: `
        <strong>Détails de la course:</strong><br>
        📍 Départ: ${this.pickupAddress}<br>
        🎯 Arrivée: ${this.dropoffAddress}<br>
        🚗 Type: ${this.getVehicleLabel()}<br>
        💰 Prix estimé: ${this.estimatedPrice.toFixed(2)} DT<br>
        📏 Distance: ${this.estimatedDistance.toFixed(1)} km<br>
        ⏱️ Durée: ~${this.estimatedDuration} min
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
            await this.capacitorService.vibrateLight();
            await this.createRideRequest();
          }
        }
      ]
    });

    await alert.present();
  }

  // ==========================================
  // CRÉATION DE LA DEMANDE
  // ==========================================
  
  /**
   * Crée la demande de course dans Firebase
   * Redirige vers la page de suivi en temps réel
   */
  async createRideRequest() {
    const user = this.authService.currentUser;
    if (!user) return;

    const loading = await this.loadingCtrl.create({
      message: 'Recherche d\'un chauffeur...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Préparer l'objet RideRequest
      const rideRequest: RideRequest = {
        passengerId: user.uid,
        pickupLocation: this.pickupLocation,
        dropoffLocation: this.dropoffLocation,
        vehicleType: this.vehicleType,
        estimatedPrice: this.estimatedPrice,
        estimatedDistance: this.estimatedDistance,
        estimatedDuration: this.estimatedDuration,
        paymentMethod: this.paymentMethod,
        createdAt: new Date()
      };

      console.log('📤 Création de la demande:', rideRequest);

      // Créer la course dans Firebase
      const rideId = await this.rideService.createRide(rideRequest);

      await loading.dismiss();

      // Feedback tactile de succès
      await this.capacitorService.vibrateHeavy();
      await this.capacitorService.showToast(
        '✅ Demande créée ! En attente d\'un chauffeur...',
        'long'
      );

      // Rediriger vers le suivi en temps réel
      this.router.navigate(['/passenger/ride-tracking', rideId]);

    } catch (error: any) {
      await loading.dismiss();
      console.error('❌ Erreur création course:', error);
      
      await this.capacitorService.vibrateMedium();
      await this.capacitorService.showToast(
        '❌ Erreur lors de la création de la demande',
        'long'
      );
    }
  }

  // ==========================================
  // RÉINITIALISATION
  // ==========================================
  
  /**
   * Réinitialise le formulaire
   */
  async reset() {
    await this.capacitorService.vibrate();
    
    this.dropoffAddress = '';
    this.showEstimation = false;
    this.estimatedDistance = 0;
    this.estimatedDuration = 0;
    this.estimatedPrice = 0;
    
    await this.capacitorService.showToast('🔄 Formulaire réinitialisé', 'short');
  }

  // ==========================================
  // HELPERS
  // ==========================================
  
  /**
   * Retourne le label du type de véhicule sélectionné
   */
  getVehicleLabel(): string {
    const vehicle = this.vehicleTypes.find(v => v.value === this.vehicleType);
    return vehicle ? vehicle.label : 'Économique';
  }

  /**
   * Retourne l'icône du type de véhicule sélectionné
   */
  getVehicleIcon(): string {
    const vehicle = this.vehicleTypes.find(v => v.value === this.vehicleType);
    return vehicle ? vehicle.icon : '🚗';
  }
}