import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { 
  Auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  sendPasswordResetEmail
} from '@angular/fire/auth';
import { 
  Firestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp
} from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from '../../shared/models/interfaces';

// ==========================================
// SERVICE D'AUTHENTIFICATION
// ==========================================
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  // ==========================================
  // INJECTION DES DÉPENDANCES
  // ==========================================
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);
  
  // ==========================================
  // ÉTAT DE L'UTILISATEUR (RÉACTIF)
  // ==========================================
  // BehaviorSubject = permet aux composants de s'abonner
  // et recevoir les changements en temps réel
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();
  
  // État de chargement
  private isLoadingSubject = new BehaviorSubject<boolean>(true);
  public isLoading$ = this.isLoadingSubject.asObservable();

  // ==========================================
  // CONSTRUCTEUR
  // ==========================================
  constructor() {
    // Écoute automatiquement les changements d'authentification
    this.initAuthListener();
  }

  // ==========================================
  // GETTER : Utilisateur actuel (synchrone)
  // ==========================================
  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // ==========================================
  // ÉCOUTER LES CHANGEMENTS D'AUTH FIREBASE
  // ==========================================
  private initAuthListener(): void {
    onAuthStateChanged(this.auth, async (firebaseUser: FirebaseUser | null) => {
      console.log('🔄 Auth state changed:', firebaseUser?.email);
      
      if (firebaseUser) {
        // Utilisateur connecté → charger ses données
        await this.loadUserData(firebaseUser.uid);
      } else {
        // Pas d'utilisateur → reset
        this.currentUserSubject.next(null);
      }
      
      this.isLoadingSubject.next(false);
    });
  }

  // ==========================================
  // CHARGER LES DONNÉES UTILISATEUR DEPUIS FIRESTORE
  // ==========================================
  private async loadUserData(uid: string): Promise<void> {
    try {
      // Référence au document dans Firestore
      const userDocRef = doc(this.firestore, `users/${uid}`);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = {
          ...userDoc.data(),
          uid: userDoc.id,
          // Convertir les timestamps Firestore en Date
          createdAt: userDoc.data()['createdAt']?.toDate(),
          updatedAt: userDoc.data()['updatedAt']?.toDate()
        } as User;
        
        console.log('✅ User data loaded:', userData.displayName);
        this.currentUserSubject.next(userData);
      }
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      this.currentUserSubject.next(null);
    }
  }

  // ==========================================
  // INSCRIPTION (REGISTER)
  // ==========================================
  async register(
    email: string, 
    password: string, 
    userData: {
      displayName: string;
      phoneNumber: string;
      role: 'passenger' | 'driver';
    }
  ): Promise<User> {
    try {
      console.log('📝 Registering user...', email);
      
      // 1. Créer le compte Firebase Auth
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);
      const firebaseUser = credential.user;

      // 2. Mettre à jour le profil Firebase
      await updateProfile(firebaseUser, {
        displayName: userData.displayName
      });

      // 3. Créer le document utilisateur dans Firestore
      const newUser: User = {
        uid: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: userData.displayName,
        phoneNumber: userData.phoneNumber,
        role: userData.role,
        rating: 5.0,
        totalRides: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true
      };

      const userDocRef = doc(this.firestore, `users/${firebaseUser.uid}`);
      await setDoc(userDocRef, {
        ...newUser,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 4. Si chauffeur, créer profil chauffeur
      if (userData.role === 'driver') {
        await this.createDriverProfile(firebaseUser.uid);
      }

      console.log('✅ Registration successful');
      this.currentUserSubject.next(newUser);
      return newUser;
    } catch (error: any) {
      console.error('❌ Registration error:', error);
      throw this.handleAuthError(error);
    }
  }

  // ==========================================
  // CONNEXION (LOGIN)
  // ==========================================
  async login(email: string, password: string): Promise<User> {
    try {
      console.log('🔐 Logging in...', email);
      
      // Authentifier avec Firebase
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      
      // Charger les données
      await this.loadUserData(credential.user.uid);
      
      const user = this.currentUserSubject.value;
      if (!user) {
        throw new Error('Unable to load user data');
      }

      // Vérifier que le compte est actif
      if (!user.isActive) {
        await this.logout();
        throw new Error('Account disabled');
      }

      console.log('✅ Login successful');
      return user;
    } catch (error: any) {
      console.error('❌ Login error:', error);
      throw this.handleAuthError(error);
    }
  }

  // ==========================================
  // DÉCONNEXION (LOGOUT)
  // ==========================================
  async logout(): Promise<void> {
    try {
      const currentUser = this.currentUserSubject.value;
      console.log('👋 Logging out...');
      
      // Si chauffeur, le mettre hors ligne
      if (currentUser?.role === 'driver') {
        await this.setDriverOffline(currentUser.uid);
      }

      await signOut(this.auth);
      this.currentUserSubject.next(null);
      this.router.navigate(['/login']);
      
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  }

  // ==========================================
  // RÉINITIALISATION MOT DE PASSE
  // ==========================================
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
      console.log('✅ Password reset email sent');
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  // ==========================================
  // CRÉER LE PROFIL CHAUFFEUR
  // ==========================================
  private async createDriverProfile(uid: string): Promise<void> {
    const driverDocRef = doc(this.firestore, `drivers/${uid}`);
    
    await setDoc(driverDocRef, {
      userId: uid,
      isOnline: false,
      status: 'offline',
      currentLocation: null,
      vehicleInfo: null,
      licenseNumber: '',
      documents: [],
      earnings: {
        totalEarnings: 0,
        weeklyEarnings: 0,
        monthlyEarnings: 0,
        pendingAmount: 0,
        totalRides: 0
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  // ==========================================
  // METTRE CHAUFFEUR HORS LIGNE
  // ==========================================
  private async setDriverOffline(uid: string): Promise<void> {
    try {
      const driverDocRef = doc(this.firestore, `drivers/${uid}`);
      await updateDoc(driverDocRef, {
        isOnline: false,
        status: 'offline',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error setting driver offline:', error);
    }
  }

  // ==========================================
  // GESTION DES ERREURS FIREBASE
  // ==========================================
  private handleAuthError(error: any): Error {
    let message = 'An error occurred';

    switch (error.code) {
      case 'auth/email-already-in-use':
        message = 'Cet email est déjà utilisé';
        break;
      case 'auth/invalid-email':
        message = 'Email invalide';
        break;
      case 'auth/operation-not-allowed':
        message = 'Opération non autorisée';
        break;
      case 'auth/weak-password':
        message = 'Mot de passe trop faible';
        break;
      case 'auth/user-not-found':
        message = 'Utilisateur introuvable';
        break;
      case 'auth/wrong-password':
        message = 'Mot de passe incorrect';
        break;
      default:
        message = error.message;
    }

    return new Error(message);
  }
}