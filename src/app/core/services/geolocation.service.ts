// ==========================================
// GEOLOCATION SERVICE - VERSION GRATUITE (Sans API Key)
// Utilise Nominatim (OpenStreetMap) et calculs géométriques
// ==========================================
import { Injectable, inject, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
}

export interface RouteInfo {
  distance: number; // en km
  duration: number; // en minutes
  distanceText?: string;
  durationText?: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: any;
}

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  
  // ==========================================
  // PROPRIÉTÉS
  // ==========================================
  private currentPositionSubject = new BehaviorSubject<GeolocationPosition | null>(null);
  public currentPosition$: Observable<GeolocationPosition | null> = 
    this.currentPositionSubject.asObservable();

  // API Nominatim (OpenStreetMap) - Gratuit
  private readonly NOMINATIM_API = 'https://nominatim.openstreetmap.org';
  
  // En-têtes requis par Nominatim
  private readonly USER_AGENT = 'MoveMe-RideSharing-App/1.0';

  private ngZone = inject(NgZone);
  private http = inject(HttpClient);

  // Limite de requêtes: 1 par seconde pour Nominatim
  private lastRequestTime = 0;
  private readonly MIN_REQUEST_INTERVAL = 1000; // 1 seconde

  constructor() {}

  // ==========================================
  // OBTENIR LA POSITION ACTUELLE
  // ==========================================
  async getCurrentPosition(highAccuracy = true): Promise<GeolocationPosition> {
    try {
      if (!('geolocation' in navigator)) {
        throw new Error('Geolocation not supported');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const result: GeolocationPosition = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy
            };
            resolve(result);
          },
          (error) => reject(error),
          {
            enableHighAccuracy: highAccuracy,
            timeout: 10000,
            maximumAge: 5000
          }
        );
      });

      // Géocoder pour obtenir l'adresse
      try {
        const address = await this.reverseGeocode(
          position.latitude,
          position.longitude
        );
        position.address = address;
      } catch (error) {
        console.warn('⚠️ Could not get address:', error);
      }

      this.currentPositionSubject.next(position);
      return position;

    } catch (error: any) {
      console.error('❌ Error getting position:', error);
      throw new Error(`Impossible d'obtenir votre position: ${error.message}`);
    }
  }

  // ==========================================
  // RESPECTER LA LIMITE DE REQUÊTES
  // ==========================================
  private async respectRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  // ==========================================
  // GÉOCODAGE (Adresse → Coordonnées) - Nominatim
  // ==========================================
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number; formattedAddress: string }> {
    try {
      await this.respectRateLimit();

      const url = `${this.NOMINATIM_API}/search`;
      const params = {
        q: address,
        format: 'json',
        addressdetails: '1',
        limit: '1',
        countrycodes: 'tn' // Limiter à la Tunisie pour de meilleurs résultats
      };

      const response = await firstValueFrom(
        this.http.get<NominatimResult[]>(url, {
          params,
          headers: {
            'User-Agent': this.USER_AGENT
          }
        })
      );

      if (response && response.length > 0) {
        const result = response[0];
        return {
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          formattedAddress: result.display_name
        };
      } else {
        throw new Error('Address not found');
      }

    } catch (error: any) {
      console.error('❌ Geocoding error:', error);
      throw new Error(`Impossible de trouver l'adresse: ${address}`);
    }
  }

  // ==========================================
  // GÉOCODAGE INVERSE (Coordonnées → Adresse) - Nominatim
  // ==========================================
  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    try {
      await this.respectRateLimit();

      const url = `${this.NOMINATIM_API}/reverse`;
      const params = {
        lat: latitude.toString(),
        lon: longitude.toString(),
        format: 'json',
        addressdetails: '1'
      };

      const response = await firstValueFrom(
        this.http.get<NominatimResult>(url, {
          params,
          headers: {
            'User-Agent': this.USER_AGENT
          }
        })
      );

      if (response && response.display_name) {
        return response.display_name;
      } else {
        throw new Error('Address not found');
      }

    } catch (error: any) {
      console.error('❌ Reverse geocoding error:', error);
      return 'Adresse inconnue';
    }
  }

  // ==========================================
  // CALCULER LA DISTANCE ET LA DURÉE
  // Utilise la formule de Haversine pour la distance
  // Et une estimation du temps basée sur la vitesse moyenne
  // ==========================================
  async calculateRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number }
  ): Promise<RouteInfo> {
    try {
      // Calcul de la distance à vol d'oiseau
      const straightDistance = this.calculateHaversineDistance(origin, destination);
      
      // Majoration pour tenir compte des routes réelles
      // En zone urbaine: +40-50% de distance
      // En zone rurale: +20-30%
      // Moyenne: +35%
      const roadDistance = straightDistance * 1.35;
      
      // Arrondir à 1 décimale
      const distance = Math.round(roadDistance * 10) / 10;
      
      // Calcul de la durée estimée
      // Vitesse moyenne en ville: 25-30 km/h (avec trafic)
      // Vitesse moyenne hors ville: 60-80 km/h
      // On prend une moyenne de 30 km/h pour la sécurité
      const averageSpeedKmh = 30;
      const durationHours = distance / averageSpeedKmh;
      const duration = Math.round(durationHours * 60); // Convertir en minutes
      
      return {
        distance,
        duration,
        distanceText: this.formatDistance(distance),
        durationText: this.formatDuration(duration)
      };

    } catch (error) {
      console.error('❌ Error calculating route:', error);
      throw error;
    }
  }

  // ==========================================
  // CALCUL DE DISTANCE AVEC FORMULE DE HAVERSINE
  // Distance à vol d'oiseau entre deux points GPS
  // ==========================================
  private calculateHaversineDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    const R = 6371; // Rayon de la Terre en km

    const dLat = this.degreesToRadians(point2.lat - point1.lat);
    const dLon = this.degreesToRadians(point2.lng - point1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(point1.lat)) *
        Math.cos(this.degreesToRadians(point2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  // ==========================================
  // CALCULER LA DISTANCE ENTRE DEUX POINTS
  // ==========================================
  getDistanceBetween(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number {
    return this.calculateHaversineDistance(point1, point2);
  }

  // ==========================================
  // CONVERTIR DEGRÉS EN RADIANS
  // ==========================================
  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // ==========================================
  // SURVEILLER LA POSITION (temps réel)
  // ==========================================
  watchPosition(callback: (position: GeolocationPosition) => void): number {
    if (!('geolocation' in navigator)) {
      throw new Error('Geolocation not supported');
    }

    return navigator.geolocation.watchPosition(
      (pos) => {
        this.ngZone.run(() => {
          const position: GeolocationPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          };
          this.currentPositionSubject.next(position);
          callback(position);
        });
      },
      (error) => {
        console.error('❌ Watch position error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }

  // ==========================================
  // ARRÊTER LA SURVEILLANCE
  // ==========================================
  clearWatch(watchId: number): void {
    if ('geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  // ==========================================
  // RECHERCHER DES ADRESSES (Autocomplete)
  // ==========================================
  async searchAddresses(query: string, location?: { lat: number; lng: number }): Promise<any[]> {
    try {
      if (query.length < 3) {
        return [];
      }

      await this.respectRateLimit();

      const url = `${this.NOMINATIM_API}/search`;
      const params: any = {
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '5',
        countrycodes: 'tn'
      };

      // Si une position est fournie, limiter la recherche autour
      if (location) {
        params.lat = location.lat.toString();
        params.lon = location.lng.toString();
        params.radius = '50000'; // 50 km
      }

      const response = await firstValueFrom(
        this.http.get<NominatimResult[]>(url, {
          params,
          headers: {
            'User-Agent': this.USER_AGENT
          }
        })
      );

      return response.map(result => ({
        placeId: result.display_name,
        description: result.display_name,
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        address: result.address
      }));

    } catch (error) {
      console.error('❌ Search addresses error:', error);
      return [];
    }
  }

  // ==========================================
  // FORMATER LA DISTANCE
  // ==========================================
  formatDistance(distanceInKm: number): string {
    if (distanceInKm < 1) {
      return `${Math.round(distanceInKm * 1000)} m`;
    }
    return `${distanceInKm.toFixed(1)} km`;
  }

  // ==========================================
  // FORMATER LA DURÉE
  // ==========================================
  formatDuration(durationInMinutes: number): string {
    if (durationInMinutes < 60) {
      return `${Math.round(durationInMinutes)} min`;
    }
    const hours = Math.floor(durationInMinutes / 60);
    const minutes = Math.round(durationInMinutes % 60);
    return `${hours}h ${minutes}min`;
  }

  // ==========================================
  // CALCULER UNE ESTIMATION AMÉLIORÉE
  // Prend en compte le type de route et le trafic estimé
  // ==========================================
  calculateAdvancedRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    timeOfDay?: Date
  ): RouteInfo {
    const straightDistance = this.calculateHaversineDistance(origin, destination);
    
    // Facteur de distance selon le type de trajet
    let distanceFactor = 1.35; // Par défaut: urbain
    
    if (straightDistance > 20) {
      distanceFactor = 1.25; // Long trajet: moins de détours
    } else if (straightDistance < 5) {
      distanceFactor = 1.45; // Court trajet: plus de détours en ville
    }
    
    const distance = Math.round(straightDistance * distanceFactor * 10) / 10;
    
    // Vitesse moyenne selon l'heure et la distance
    let averageSpeed = 30; // km/h par défaut
    
    if (timeOfDay) {
      const hour = timeOfDay.getHours();
      
      // Heures de pointe: 7h-9h et 17h-19h
      if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
        averageSpeed = 20; // Trafic dense
      } else if (hour >= 0 && hour <= 6) {
        averageSpeed = 50; // Nuit: moins de trafic
      } else if (hour >= 22) {
        averageSpeed = 45; // Soirée: peu de trafic
      }
    }
    
    // Si trajet > 15km, augmenter la vitesse (supposé hors ville)
    if (distance > 15) {
      averageSpeed = Math.min(averageSpeed * 1.5, 60);
    }
    
    const durationHours = distance / averageSpeed;
    const duration = Math.round(durationHours * 60);
    
    return {
      distance,
      duration,
      distanceText: this.formatDistance(distance),
      durationText: this.formatDuration(duration)
    };
  }

  // ==========================================
  // NETTOYER
  // ==========================================
  cleanup(): void {
    this.currentPositionSubject.next(null);
  }
}