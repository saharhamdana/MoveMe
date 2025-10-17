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
  IonButtons,
  IonBackButton,
  IonSelect,
  IonSelectOption,
  LoadingController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  personOutline, 
  mailOutline, 
  lockClosedOutline, 
  eyeOutline, 
  eyeOffOutline,
  callOutline,
  arrowBackOutline
} from 'ionicons/icons';

// ==========================================
// IMPORT DU SERVICE D'AUTHENTIFICATION
// ==========================================
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
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
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonText,
    IonSpinner,
    IonButtons,
    IonBackButton,
    IonSelect,
    IonSelectOption
  ]
})
export class RegisterPage {
  
  // ==========================================
  // PROPRIÉTÉS DU FORMULAIRE
  // ==========================================
  displayName: string = '';
  email: string = '';
  phoneNumber: string = '';
  password: string = '';
  confirmPassword: string = '';
  role: 'passenger' | 'driver' = 'passenger';  // Rôle par défaut
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  isLoading: boolean = false;

  // ==========================================
  // CONSTRUCTEUR
  // ==========================================
  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {
    // Enregistrer les icônes
    addIcons({ 
      personOutline, 
      mailOutline, 
      lockClosedOutline, 
      eyeOutline, 
      eyeOffOutline,
      callOutline,
      arrowBackOutline
    });
  }

  // ==========================================
  // MÉTHODE D'INSCRIPTION
  // ==========================================
  async register() {
    // Validation des champs
    if (!this.validateForm()) {
      return;
    }

    // Afficher le loader
    const loading = await this.loadingCtrl.create({
      message: 'Création du compte...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      // Appel du service d'authentification
      const user = await this.authService.register(
        this.email,
        this.password,
        {
          displayName: this.displayName,
          phoneNumber: this.phoneNumber,
          role: this.role
        }
      );
      
      // Fermer le loader
      await loading.dismiss();
      
      // Afficher message de succès
      this.showToast(`Compte créé avec succès ! Bienvenue ${user.displayName}`, 'success');
      
      // Redirection selon le rôle
      if (user.role === 'passenger') {
        this.router.navigate(['/passenger/tabs/home']);
      } else if (user.role === 'driver') {
        // Pour le chauffeur, rediriger vers la config du véhicule
        this.router.navigate(['/driver/vehicle-setup']);
      }
      
    } catch (error: any) {
      // Fermer le loader
      await loading.dismiss();
      
      // Afficher l'erreur
      console.error('Registration error:', error);
      this.showToast(error.message || 'Erreur lors de l\'inscription', 'danger');
    }
  }

  // ==========================================
  // VALIDATION DU FORMULAIRE
  // ==========================================
  private validateForm(): boolean {
    // Vérifier que tous les champs sont remplis
    if (!this.displayName || !this.email || !this.phoneNumber || !this.password || !this.confirmPassword) {
      this.showToast('Veuillez remplir tous les champs', 'warning');
      return false;
    }

    // Validation du nom (minimum 3 caractères)
    if (this.displayName.length < 3) {
      this.showToast('Le nom doit contenir au moins 3 caractères', 'warning');
      return false;
    }

    // Validation de l'email
    if (!this.isValidEmail(this.email)) {
      this.showToast('Email invalide', 'warning');
      return false;
    }

    // Validation du téléphone (format tunisien par exemple)
    if (!this.isValidPhone(this.phoneNumber)) {
      this.showToast('Numéro de téléphone invalide', 'warning');
      return false;
    }

    // Validation du mot de passe (minimum 6 caractères)
    if (this.password.length < 6) {
      this.showToast('Le mot de passe doit contenir au moins 6 caractères', 'warning');
      return false;
    }

    // Vérification que les mots de passe correspondent
    if (this.password !== this.confirmPassword) {
      this.showToast('Les mots de passe ne correspondent pas', 'warning');
      return false;
    }

    return true;
  }

  // ==========================================
  // AFFICHER/MASQUER LE MOT DE PASSE
  // ==========================================
  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // ==========================================
  // NAVIGATION VERS LA CONNEXION
  // ==========================================
  goToLogin() {
    this.router.navigate(['/login']);
  }

  // ==========================================
  // VALIDATION EMAIL
  // ==========================================
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // ==========================================
  // VALIDATION TÉLÉPHONE
  // ==========================================
  private isValidPhone(phone: string): boolean {
    // Format tunisien : +216 ou 216 suivi de 8 chiffres
    // Ou simplement 8 chiffres
    const phoneRegex = /^(\+?216)?[0-9]{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  // ==========================================
  // AFFICHER UN TOAST
  // ==========================================
  private async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      position: 'top',
      color: color
    });
    await toast.present();
  }
}