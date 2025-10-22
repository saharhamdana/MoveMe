import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar,
  IonCard,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonText,
  IonSpinner,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mailOutline, lockClosedOutline, eyeOutline, eyeOffOutline, carSport } from 'ionicons/icons';

// ==========================================
// IMPORT DU SERVICE D'AUTHENTIFICATION
// ==========================================
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonCard,
    IonCardContent,
    IonItem,
    IonInput,
    IonButton,
    IonIcon,
    IonText,
    IonSpinner
  ]
})
export class LoginPage {
  
  // ==========================================
  // PROPRIÉTÉS DU FORMULAIRE
  // ==========================================
  email: string = '';
  password: string = '';
  showPassword: boolean = false;  // Pour afficher/masquer le mot de passe
  isLoading: boolean = false;     // État de chargement

  // ==========================================
  // CONSTRUCTEUR - INJECTION DES SERVICES
  // ==========================================
  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {
    // Enregistrer les icônes Ionicons
    addIcons({ mailOutline, lockClosedOutline, eyeOutline, eyeOffOutline, carSport });
  }

  // ==========================================
  // MÉTHODE DE CONNEXION
  // ==========================================
  async login() {
    // Validation des champs
    if (!this.email || !this.password) {
      this.showToast('Veuillez remplir tous les champs', 'warning');
      return;
    }

    // Validation email
    if (!this.isValidEmail(this.email)) {
      this.showToast('Email invalide', 'warning');
      return;
    }

    // Afficher le loader
    const loading = await this.loadingCtrl.create({
      message: 'Connexion en cours...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Appel du service d'authentification
      const user = await this.authService.login(this.email, this.password);
      
      // Fermer le loader
      await loading.dismiss();
      
      // Afficher message de succès
      this.showToast(`Bienvenue ${user.displayName} !`, 'success');
      
      // Redirection selon le rôle
      if (user.role === 'passenger') {
        this.router.navigate(['/passenger/tabs/home']);
      } else if (user.role === 'driver') {
        this.router.navigate(['/driver/tabs/home']);
      }
      
    } catch (error: any) {
      // Fermer le loader
      await loading.dismiss();
      
      // Afficher l'erreur
      console.error('Login error:', error);
      this.showToast(error.message || 'Erreur de connexion', 'danger');
    }
  }

  // ==========================================
  // AFFICHER/MASQUER LE MOT DE PASSE
  // ==========================================
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  // ==========================================
  // NAVIGATION VERS L'INSCRIPTION
  // ==========================================
  goToRegister() {
    this.router.navigate(['/register']);
  }

  // ==========================================
  // NAVIGATION VERS MOT DE PASSE OUBLIÉ
  // ==========================================
  goToForgotPassword() {
    // TODO: Créer la page forgot-password
    this.showToast('Fonctionnalité à venir', 'warning');
  }

  // ==========================================
  // VALIDATION EMAIL
  // ==========================================
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // ==========================================
  // AFFICHER UN TOAST (MESSAGE)
  // ==========================================
  private async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      position: 'top',
      color: color,
      cssClass: 'custom-toast'
    });
    await toast.present();
  }
}