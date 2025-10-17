import { bootstrapApplication } from '@angular/platform-browser';
import { RouteReuseStrategy, provideRouter, withPreloading, PreloadAllModules } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

// ==========================================
// IMPORTS FIREBASE
// ==========================================
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideStorage, getStorage } from '@angular/fire/storage';

// ==========================================
// IMPORTS HTTP CLIENT
// ==========================================
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
    
    // ==========================================
    // AJOUT: HTTP CLIENT
    // ==========================================
    provideHttpClient(),
    
    // ==========================================
    // AJOUT: CONFIGURATION FIREBASE
    // ==========================================
    // Initialise Firebase avec tes credentials
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    
    // Active l'authentification
    provideAuth(() => getAuth()),
    
    // Active Firestore (base de données)
    provideFirestore(() => getFirestore()),
    
    // Active Storage (pour les images)
    provideStorage(() => getStorage()),
  ],
});