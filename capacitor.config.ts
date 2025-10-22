import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.votreapp.moveme', // ⚠️ Changez ceci
  appName: 'moveme', // ⚠️ Changez ceci
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    // Configuration de la géolocalisation
    Geolocation: {
      // Permissions pour iOS
      iosBackgroundLocationPermission: true
    },
    // Configuration des notifications push
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    // Configuration de la caméra
    Camera: {
      ios: {
        saveToGallery: false
      },
      android: {
        saveToGallery: false
      }
    }
  }
};

export default config;