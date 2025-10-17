// ==========================================
// INTERFACES - MODÈLES DE DONNÉES
// ==========================================

// ==========================================
// INTERFACE UTILISATEUR DE BASE
// ==========================================
export interface User {
  uid: string;                    // ID unique Firebase
  email: string;                  // Email
  displayName: string;            // Nom complet
  phoneNumber: string;            // Téléphone
  photoURL?: string;              // Photo de profil (optionnel)
  role: 'passenger' | 'driver';   // Rôle : passager ou chauffeur
  rating: number;                 // Note moyenne (sur 5)
  totalRides: number;             // Nombre total de courses
  createdAt: Date;                // Date de création du compte
  updatedAt: Date;                // Dernière modification
  isActive: boolean;              // Compte actif ou non
}

// ==========================================
// INTERFACE PASSAGER
// ==========================================
export interface Passenger extends User {
  role: 'passenger';
  favoriteAddresses?: Address[];  // Adresses favorites
}

// ==========================================
// INTERFACE CHAUFFEUR
// ==========================================
export interface Driver extends User {
  role: 'driver';
  vehicleInfo: VehicleInfo;       // Infos du véhicule
  licenseNumber: string;          // Numéro de permis
  isOnline: boolean;              // En ligne ou hors ligne
  currentLocation?: Location;     // Position actuelle
  status: DriverStatus;           // Statut actuel
}

// ==========================================
// TYPES
// ==========================================
export type DriverStatus = 'offline' | 'available' | 'busy' | 'on-ride';
export type RideStatus = 'pending' | 'accepted' | 'driver-arriving' | 'started' | 'completed' | 'cancelled';
export type VehicleType = 'economy' | 'comfort' | 'premium';

// ==========================================
// INTERFACE VÉHICULE
// ==========================================
export interface VehicleInfo {
  make: string;                   // Marque (ex: Toyota)
  model: string;                  // Modèle (ex: Corolla)
  year: number;                   // Année
  color: string;                  // Couleur
  licensePlate: string;           // Plaque d'immatriculation
  type: VehicleType;              // Type de véhicule
  seats: number;                  // Nombre de places
  photoURL?: string;              // Photo du véhicule
}

// ==========================================
// INTERFACE LOCALISATION
// ==========================================
export interface Location {
  latitude: number;               // Latitude
  longitude: number;              // Longitude
  address?: string;               // Adresse formatée
  timestamp?: Date;               // Horodatage
}

// ==========================================
// INTERFACE ADRESSE
// ==========================================
export interface Address {
  id?: string;
  label: string;                  // Ex: "Maison", "Travail"
  address: string;                // Adresse complète
  location: Location;             // Coordonnées GPS
  isDefault?: boolean;
}

// ==========================================
// INTERFACE COURSE (RIDE)
// ==========================================
export interface Ride {
  id: string;                     // ID unique
  passengerId: string;            // ID du passager
  passengerName: string;          // Nom du passager
  passengerPhone: string;
  
  driverId?: string;              // ID du chauffeur (null si pas accepté)
  driverName?: string;
  driverPhone?: string;
  vehicleInfo?: VehicleInfo;
  
  pickupLocation: Location;       // Point de départ
  dropoffLocation: Location;      // Destination
  
  status: RideStatus;             // Statut actuel
  
  estimatedPrice: number;         // Prix estimé
  finalPrice?: number;            // Prix final
  
  estimatedDistance: number;      // Distance en km
  estimatedDuration: number;      // Durée en minutes
  
  vehicleType: VehicleType;       // Type demandé
  
  requestedAt: Date;              // Date de demande
  acceptedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  
  rating?: number;                // Note (1-5)
  review?: string;                // Commentaire
  
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
}

// ==========================================
// INTERFACE DEMANDE DE COURSE
// ==========================================
export interface RideRequest {
  id?: string;
  passengerId: string;
  pickupLocation: Location;
  dropoffLocation: Location;
  vehicleType: VehicleType;
  estimatedPrice: number;
  estimatedDistance: number;
  estimatedDuration: number;
  paymentMethod: string;
  notes?: string;
  createdAt: Date;
}