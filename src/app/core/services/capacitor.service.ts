import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Preferences } from '@capacitor/preferences';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Toast } from '@capacitor/toast';
import { App } from '@capacitor/app';

/**
 * Service centralisé pour gérer tous les plugins Capacitor
 * Ce service encapsule les fonctionnalités natives de l'appareil
 * et fournit des méthodes simplifiées pour les utiliser dans l'app
 * 
 * ⚠️ Gère automatiquement les différences entre web et natif
 */
@Injectable({
  providedIn: 'root'
})
export class CapacitorService {

  constructor() {
    console.log('✅ CapacitorService initialisé');
    console.log('📱 Plateforme:', this.getPlatform());
  }

  // ==================== INFORMATIONS PLATEFORME ====================

  /**
   * Vérifie si l'app tourne sur une plateforme native
   * @returns true si iOS ou Android, false si web
   */
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Retourne le nom de la plateforme
   * @returns 'ios', 'android', ou 'web'
   */
  getPlatform(): string {
    return Capacitor.getPlatform();
  }

  /**
   * Vérifie si une fonctionnalité est disponible
   * @param plugin - Nom du plugin à vérifier
   * @returns true si disponible
   */
  isPluginAvailable(plugin: string): boolean {
    return Capacitor.isPluginAvailable(plugin);
  }

  // ==================== GÉOLOCALISATION ====================

  /**
   * Demande les permissions de géolocalisation à l'utilisateur
   * @returns Promise<boolean> - true si permission accordée, false sinon
   */
  async requestLocationPermissions(): Promise<boolean> {
    try {
      // Sur web, les permissions sont gérées automatiquement par le navigateur
      if (!this.isNative()) {
        console.log('🌐 Permissions web - gérées par le navigateur');
        return true;
      }

      const permission = await Geolocation.requestPermissions();
      console.log('📍 Permission localisation:', permission);
      return permission.location === 'granted';
    } catch (error) {
      console.error('❌ Erreur permission localisation:', error);
      return false;
    }
  }

  /**
   * Récupère la position GPS actuelle de l'utilisateur
   * @returns Promise<Position | null> - Position GPS ou null si erreur
   */
  async getCurrentPosition(): Promise<Position | null> {
    try {
      const coordinates = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });

      console.log('📍 Position actuelle:', coordinates);
      return coordinates;
    } catch (error) {
      console.error('❌ Erreur getCurrentPosition:', error);
      await this.showToast('Impossible de récupérer votre position');
      return null;
    }
  }

  /**
   * Surveille la position GPS en temps réel
   * @param callback - Fonction appelée à chaque changement de position
   * @returns Promise<string> - ID du watcher (pour pouvoir l'arrêter plus tard)
   */
  async watchPosition(callback: (position: Position | null) => void): Promise<string> {
    try {
      const watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        },
        (position, err) => {
          if (err) {
            console.error('❌ Erreur watchPosition:', err);
            callback(null);
            return;
          }
          
          console.log('📍 Nouvelle position:', position);
          callback(position);
        }
      );

      return watchId;
    } catch (error) {
      console.error('❌ Erreur watchPosition:', error);
      callback(null);
      return '';
    }
  }

  /**
   * Arrête la surveillance de la position GPS
   * @param watchId - ID du watcher à arrêter (retourné par watchPosition)
   */
  async clearWatch(watchId: string): Promise<void> {
    try {
      await Geolocation.clearWatch({ id: watchId });
      console.log('🛑 Watch position arrêté:', watchId);
    } catch (error) {
      console.error('❌ Erreur clearWatch:', error);
    }
  }

  // ==================== CAMÉRA ====================

  /**
   * Ouvre la caméra ou la galerie pour prendre/sélectionner une photo
   * @param source - 'camera' ou 'gallery'
   * @returns Promise<string | null> - URL base64 de l'image ou null
   */
  async takePicture(source: 'camera' | 'gallery' = 'camera'): Promise<string | null> {
    try {
      const cameraSource = source === 'camera' ? CameraSource.Camera : CameraSource.Photos;
      
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: CameraResultType.Base64,
        source: cameraSource
      });

      return `data:image/jpeg;base64,${image.base64String}`;
    } catch (error) {
      console.error('❌ Erreur takePicture:', error);
      
      // Sur web, proposer une alternative
      if (!this.isNative()) {
        await this.showToast('Fonctionnalité disponible sur mobile uniquement');
      } else {
        await this.showToast('Erreur lors de la prise de photo');
      }
      
      return null;
    }
  }

  // ==================== STOCKAGE LOCAL ====================

  /**
   * Sauvegarde une valeur dans le stockage local
   * @param key - Clé de stockage
   * @param value - Valeur à stocker (sera convertie en JSON)
   */
  async setPreference(key: string, value: any): Promise<void> {
    try {
      await Preferences.set({
        key: key,
        value: JSON.stringify(value)
      });
      console.log(`💾 Préférence sauvegardée: ${key}`);
    } catch (error) {
      console.error('❌ Erreur setPreference:', error);
    }
  }

  /**
   * Récupère une valeur du stockage local
   * @param key - Clé de stockage
   * @returns Promise<any> - Valeur stockée ou null
   */
  async getPreference(key: string): Promise<any> {
    try {
      const { value } = await Preferences.get({ key: key });
      
      if (!value) return null;
      
      return JSON.parse(value);
    } catch (error) {
      console.error('❌ Erreur getPreference:', error);
      return null;
    }
  }

  /**
   * Supprime une valeur du stockage local
   * @param key - Clé de stockage à supprimer
   */
  async removePreference(key: string): Promise<void> {
    try {
      await Preferences.remove({ key: key });
      console.log(`🗑️ Préférence supprimée: ${key}`);
    } catch (error) {
      console.error('❌ Erreur removePreference:', error);
    }
  }

  /**
   * Efface toutes les préférences stockées
   */
  async clearAllPreferences(): Promise<void> {
    try {
      await Preferences.clear();
      console.log('🗑️ Toutes les préférences effacées');
    } catch (error) {
      console.error('❌ Erreur clearAllPreferences:', error);
    }
  }

  // ==================== VIBRATIONS (HAPTICS) ====================

  /**
   * Déclenche une vibration légère (feedback tactile)
   * Utile pour confirmer une action utilisateur
   */
  async vibrate(): Promise<void> {
    try {
      // Les vibrations ne fonctionnent que sur mobile
      if (this.isNative()) {
        await Haptics.impact({ style: ImpactStyle.Light });
      }
    } catch (error) {
      console.error('❌ Erreur vibrate:', error);
    }
  }

  /**
   * Alias pour vibrate() - pour compatibilité
   */
  async vibrateLight(): Promise<void> {
    await this.vibrate();
  }

  /**
   * Déclenche une vibration moyenne
   * Utile pour les notifications importantes
   */
  async vibrateMedium(): Promise<void> {
    try {
      if (this.isNative()) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      }
    } catch (error) {
      console.error('❌ Erreur vibrateMedium:', error);
    }
  }

  /**
   * Déclenche une vibration forte
   * Utile pour les alertes critiques
   */
  async vibrateHeavy(): Promise<void> {
    try {
      if (this.isNative()) {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      }
    } catch (error) {
      console.error('❌ Erreur vibrateHeavy:', error);
    }
  }

  // ==================== NOTIFICATIONS TOAST ====================

  /**
   * Affiche une notification toast en bas de l'écran
   * @param message - Message à afficher
   * @param duration - Durée d'affichage ('short' ou 'long')
   */
  async showToast(message: string, duration: 'short' | 'long' = 'short'): Promise<void> {
    try {
      // Sur web, les toasts peuvent ne pas fonctionner
      if (this.isNative()) {
        await Toast.show({
          text: message,
          duration: duration,
          position: 'bottom'
        });
      } else {
        // Fallback pour le web - utiliser console.log
        console.log('🔔 Toast:', message);
        // Vous pouvez aussi utiliser un service de notification Angular
      }
    } catch (error) {
      console.error('❌ Erreur showToast:', error);
    }
  }

  // ==================== INFORMATIONS APP ====================

  /**
   * Récupère les informations de l'application
   * @returns Promise avec id, name, version, build
   */
  async getAppInfo(): Promise<any> {
    try {
      // Vérifier si on est sur une plateforme native
      if (this.isNative()) {
        const info = await App.getInfo();
        console.log('📱 Info app (native):', info);
        return info;
      } else {
        // Retourner des informations par défaut pour le web
        const webInfo = {
          name: 'MoveMe',
          version: '1.0.0',
          build: 'web',
          id: 'tn.moveme.app'
        };
        console.log('🌐 Info app (web):', webInfo);
        return webInfo;
      }
    } catch (error) {
      console.error('❌ Erreur getAppInfo:', error);
      // Retourner des valeurs par défaut en cas d'erreur
      return {
        name: 'MoveMe',
        version: '1.0.0',
        build: 'unknown',
        id: 'tn.moveme.app'
      };
    }
  }

  /**
   * Écoute l'événement de mise en arrière-plan de l'app
   * Utile pour arrêter le tracking GPS quand l'app n'est pas active
   * @param callback - Fonction appelée quand l'app passe en arrière-plan
   */
  listenToAppStateChange(callback: (isActive: boolean) => void): void {
    // Ces événements ne fonctionnent que sur mobile
    if (!this.isNative()) {
      console.log('🌐 App state change non disponible sur web');
      return;
    }

    // Écoute quand l'app passe en arrière-plan
    App.addListener('appStateChange', ({ isActive }) => {
      console.log('📱 État app changé:', isActive ? 'active' : 'arrière-plan');
      callback(isActive);
    });

    // Écoute quand on appuie sur le bouton retour (Android)
    App.addListener('backButton', () => {
      console.log('📱 Bouton retour pressé');
      // Vous pouvez gérer le comportement du bouton retour ici
    });
  }

  // ==================== UTILITAIRES ====================

  /**
   * Calcule la distance entre deux points GPS (en kilomètres)
   * Utilise la formule de Haversine
   * @param lat1 - Latitude point 1
   * @param lon1 - Longitude point 1
   * @param lat2 - Latitude point 2
   * @param lon2 - Longitude point 2
   * @returns Distance en kilomètres
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Rayon de la Terre en kilomètres
    const R = 6371;
    
    // Conversion en radians
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    
    // Formule de Haversine
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return Math.round(distance * 100) / 100; // Arrondi à 2 décimales
  }

  /**
   * Convertit des degrés en radians
   * @param degrees - Angle en degrés
   * @returns Angle en radians
   */
  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}