// ==========================================
// RIDE SERVICE - GESTION DES COURSES
// ==========================================
import { Injectable, inject, NgZone } from '@angular/core';
import { 
  Database, 
  ref, 
  push, 
  set, 
  update, 
  get,
  onValue,
  query,
  orderByChild,
  equalTo,
  Unsubscribe
} from '@angular/fire/database';
import { BehaviorSubject, Observable } from 'rxjs';
import { Ride, RideRequest, VehicleType } from '../../shared/models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class RideService {
  
  // ==========================================
  // INJECTION DE DÉPENDANCES
  // ==========================================
  private database = inject(Database);
  private ngZone = inject(NgZone);
  
  // ==========================================
  // ÉTAT RÉACTIF DES COURSES
  // ==========================================
  private currentRideSubject = new BehaviorSubject<Ride | null>(null);
  public currentRide$: Observable<Ride | null> = this.currentRideSubject.asObservable();
  
  private pendingRidesSubject = new BehaviorSubject<Ride[]>([]);
  public pendingRides$: Observable<Ride[]> = this.pendingRidesSubject.asObservable();

  // Listener Firebase en temps réel
  private pendingRidesListener: Unsubscribe | null = null;

  // ==========================================
  // CONSTRUCTEUR
  // ==========================================
  constructor() {}

  // ==========================================
  // CRÉER UNE DEMANDE DE COURSE (PASSAGER)
  // ==========================================
  async createRide(rideRequest: RideRequest): Promise<string> {
    try {
      console.log('📝 Creating ride request...', rideRequest);
      
      const ridesRef = ref(this.database, 'rides');
      const newRideRef = push(ridesRef);
      
      const ride: Ride = {
        id: newRideRef.key!,
        passengerId: rideRequest.passengerId,
        passengerName: '',
        passengerPhone: '',
        
        pickupLocation: rideRequest.pickupLocation,
        dropoffLocation: rideRequest.dropoffLocation,
        
        status: 'pending',
        
        estimatedPrice: rideRequest.estimatedPrice,
        estimatedDistance: rideRequest.estimatedDistance,
        estimatedDuration: rideRequest.estimatedDuration,
        
        vehicleType: rideRequest.vehicleType,
        
        requestedAt: new Date(),
        
        paymentMethod: rideRequest.paymentMethod,
        paymentStatus: 'pending'
      };
      
      await set(newRideRef, {
        ...ride,
        requestedAt: new Date().toISOString()
      });
      
      console.log('✅ Ride created:', newRideRef.key);
      return newRideRef.key!;
      
    } catch (error) {
      console.error('❌ Error creating ride:', error);
      throw error;
    }
  }

  // ==========================================
  // DÉMARRER L'ÉCOUTE DES COURSES EN ATTENTE (TEMPS RÉEL)
  // ==========================================
  startListeningToPendingRides(): void {
    // Si déjà en cours, ne pas relancer
    if (this.pendingRidesListener) {
      console.log('⚠️ Already listening to pending rides');
      return;
    }
    
    console.log('🔄 Starting real-time listener for pending rides...');
    
    try {
      const ridesRef = ref(this.database, 'rides');
      const pendingQuery = query(
        ridesRef,
        orderByChild('status'),
        equalTo('pending')
      );
      
      // ✅ Écoute en temps réel avec onValue
      this.pendingRidesListener = onValue(
        pendingQuery,
        (snapshot) => {
          // Exécuter dans NgZone pour la détection de changements Angular
          this.ngZone.run(() => {
            const rides: Ride[] = [];
            
            if (snapshot.exists()) {
              snapshot.forEach((childSnapshot) => {
                const rideData = childSnapshot.val();
                const ride = {
                  ...rideData,
                  id: childSnapshot.key,
                  requestedAt: rideData.requestedAt ? new Date(rideData.requestedAt) : new Date()
                } as Ride;
                
                rides.push(ride);
              });
            }
            
            // Trier par date (plus récent en premier)
            rides.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
            
            console.log('📋 Pending rides updated:', rides.length);
            this.pendingRidesSubject.next(rides);
          });
        },
        (error) => {
          console.error('❌ Error listening to pending rides:', error);
        }
      );
      
      console.log('✅ Real-time listener started');
      
    } catch (error) {
      console.error('❌ Error starting listener:', error);
    }
  }

  // ==========================================
  // ARRÊTER L'ÉCOUTE
  // ==========================================
  stopListeningToPendingRides(): void {
    if (this.pendingRidesListener) {
      console.log('🛑 Stopping pending rides listener');
      this.pendingRidesListener();
      this.pendingRidesListener = null;
      this.pendingRidesSubject.next([]);
    }
  }

  // ==========================================
  // ACCEPTER UNE COURSE (CHAUFFEUR)
  // ==========================================
  async acceptRide(
    rideId: string, 
    driverId: string, 
    driverData: {
      name: string;
      phone: string;
      photoURL?: string;
      vehicleInfo: any;
    }
  ): Promise<void> {
    try {
      console.log('✅ Accepting ride:', rideId);
      
      const rideRef = ref(this.database, `rides/${rideId}`);
      
      // Vérifier que la course existe et est toujours pending
      const snapshot = await get(rideRef);
      if (!snapshot.exists() || snapshot.val().status !== 'pending') {
        throw new Error('Cette course n\'est plus disponible');
      }
      
      await update(rideRef, {
        driverId: driverId,
        driverName: driverData.name,
        driverPhone: driverData.phone,
        driverPhotoURL: driverData.photoURL || null,
        vehicleInfo: driverData.vehicleInfo,
        status: 'accepted',
        acceptedAt: new Date().toISOString()
      });
      
      console.log('✅ Ride accepted successfully');
      
    } catch (error) {
      console.error('❌ Error accepting ride:', error);
      throw error;
    }
  }

  // ==========================================
  // DÉMARRER LA COURSE (CHAUFFEUR)
  // ==========================================
  async startRide(rideId: string): Promise<void> {
    try {
      const rideRef = ref(this.database, `rides/${rideId}`);
      
      await update(rideRef, {
        status: 'started',
        startedAt: new Date().toISOString()
      });
      
      console.log('✅ Ride started');
      
    } catch (error) {
      console.error('❌ Error starting ride:', error);
      throw error;
    }
  }

  // ==========================================
  // TERMINER LA COURSE (CHAUFFEUR)
  // ==========================================
  async completeRide(rideId: string, finalPrice: number, actualDistance: number): Promise<void> {
    try {
      const rideRef = ref(this.database, `rides/${rideId}`);
      
      await update(rideRef, {
        status: 'completed',
        completedAt: new Date().toISOString(),
        finalPrice: finalPrice,
        actualDistance: actualDistance,
        paymentStatus: 'completed'
      });
      
      console.log('✅ Ride completed');
      
    } catch (error) {
      console.error('❌ Error completing ride:', error);
      throw error;
    }
  }

  // ==========================================
  // ANNULER UNE COURSE
  // ==========================================
  async cancelRide(
    rideId: string, 
    cancelledBy: 'passenger' | 'driver' | 'system',
    reason?: string
  ): Promise<void> {
    try {
      const rideRef = ref(this.database, `rides/${rideId}`);
      
      await update(rideRef, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledBy: cancelledBy,
        cancellationReason: reason || 'Non spécifié'
      });
      
      console.log('✅ Ride cancelled');
      
    } catch (error) {
      console.error('❌ Error cancelling ride:', error);
      throw error;
    }
  }

  // ==========================================
  // NOTER UNE COURSE (PASSAGER)
  // ==========================================
  async rateRide(rideId: string, rating: number, review?: string): Promise<void> {
    try {
      const rideRef = ref(this.database, `rides/${rideId}`);
      
      await update(rideRef, {
        rating: rating,
        review: review || ''
      });
      
      console.log('✅ Ride rated:', rating);
      
    } catch (error) {
      console.error('❌ Error rating ride:', error);
      throw error;
    }
  }

  // ==========================================
  // OBTENIR UNE COURSE PAR ID
  // ==========================================
  async getRideById(rideId: string): Promise<Ride | null> {
    try {
      const rideRef = ref(this.database, `rides/${rideId}`);
      const snapshot = await get(rideRef);
      
      if (snapshot.exists()) {
        const rideData = snapshot.val();
        return {
          ...rideData,
          id: snapshot.key,
          requestedAt: new Date(rideData.requestedAt)
        } as Ride;
      }
      
      return null;
      
    } catch (error) {
      console.error('❌ Error getting ride:', error);
      return null;
    }
  }

  // ==========================================
  // ÉCOUTER UNE COURSE SPÉCIFIQUE (TEMPS RÉEL)
  // ==========================================
  listenToRide(rideId: string, callback: (ride: Ride | null) => void): Unsubscribe {
    const rideRef = ref(this.database, `rides/${rideId}`);
    
    return onValue(
      rideRef,
      (snapshot) => {
        this.ngZone.run(() => {
          if (snapshot.exists()) {
            const rideData = snapshot.val();
            const ride = {
              ...rideData,
              id: snapshot.key,
              requestedAt: new Date(rideData.requestedAt)
            } as Ride;
            callback(ride);
          } else {
            callback(null);
          }
        });
      },
      (error) => {
        console.error('❌ Error listening to ride:', error);
        callback(null);
      }
    );
  }

  // ==========================================
  // CALCULER LE PRIX ESTIMÉ
  // ==========================================
  calculateEstimatedPrice(distance: number, duration: number, vehicleType: VehicleType): number {
    const baseFare = 2.5;
    const perKm = 0.8;
    const perMinute = 0.2;
    
    const vehicleMultipliers = {
      economy: 1.0,
      comfort: 1.3,
      premium: 1.8
    };
    
    const multiplier = vehicleMultipliers[vehicleType] || 1.0;
    const price = (baseFare + (distance * perKm) + (duration * perMinute)) * multiplier;
    
    return Math.round(price * 100) / 100;
  }

  // ==========================================
  // OBTENIR LES COURSES D'UN UTILISATEUR
  // ==========================================
  async getUserRides(userId: string, role: 'passenger' | 'driver'): Promise<Ride[]> {
    try {
      const ridesRef = ref(this.database, 'rides');
      const snapshot = await get(ridesRef);
      const rides: Ride[] = [];
      
      if (snapshot.exists()) {
        snapshot.forEach((childSnapshot) => {
          const rideData = childSnapshot.val();
          const fieldName = role === 'passenger' ? 'passengerId' : 'driverId';
          
          if (rideData[fieldName] === userId) {
            rides.push({
              ...rideData,
              id: childSnapshot.key,
              requestedAt: new Date(rideData.requestedAt)
            } as Ride);
          }
        });
      }
      
      return rides.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
      
    } catch (error) {
      console.error('❌ Error getting user rides:', error);
      return [];
    }
  }

  // ==========================================
  // NETTOYER
  // ==========================================
  cleanup(): void {
    this.stopListeningToPendingRides();
    this.currentRideSubject.next(null);
    this.pendingRidesSubject.next([]);
  }
  
  // ==========================================
  // ON DESTROY
  // ==========================================
  ngOnDestroy(): void {
    this.cleanup();
  }
}