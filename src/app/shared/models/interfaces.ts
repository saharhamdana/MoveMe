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
  id: string;
  passengerId: string;
  passengerName: string;
  passengerPhone: string;
  passengerPhotoURL?: string;
  
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  driverPhotoURL?: string;
  vehicleInfo?: VehicleInfo;
  
  pickupLocation: Location;
  dropoffLocation: Location;
  
  status: RideStatus;
  
  estimatedPrice: number;
  finalPrice?: number;
  
  estimatedDistance: number;
  actualDistance?: number;
  
  estimatedDuration: number;
  actualDuration?: number;        // ✅ AJOUTE CETTE LIGNE
  
  vehicleType: VehicleType;
  
  requestedAt: Date;
  acceptedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  
  rating?: number;
  review?: string;
  
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed';
  
  cancellationReason?: string;
  cancelledBy?: 'passenger' | 'driver' | 'system';
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