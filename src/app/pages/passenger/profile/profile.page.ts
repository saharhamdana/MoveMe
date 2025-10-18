// ==========================================
// PROFILE PAGE - PROFIL UTILISATEUR
// ==========================================
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonCard,
  IonCardContent,
  IonButton,
  IonAvatar,
  IonText,
  IonListHeader,
  AlertController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline,
  mailOutline,
  callOutline,
  starOutline,
  logOutOutline,
  settingsOutline,
  helpCircleOutline,
  informationCircleOutline,
  shieldCheckmarkOutline
} from 'ionicons/icons';

// ==========================================
// IMPORTS
// ==========================================
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../shared/models/interfaces';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonCard,
    IonCardContent,
    IonButton,
    IonAvatar,
    IonText,
    IonListHeader
  ]
})
export class ProfilePage implements OnInit {
  
  // ==========================================
  // PROPRIÉTÉS
  // ==========================================
  currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {
    // Enregistrer les icônes
    addIcons({
      personOutline,
      mailOutline,
      callOutline,
      starOutline,
      logOutOutline,
      settingsOutline,
      helpCircleOutline,
      informationCircleOutline,
      shieldCheckmarkOutline
    });
  }

  // ==========================================
  // INITIALISATION
  // ==========================================
  ngOnInit() {
    // S'abonner à l'utilisateur actuel
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      console.log('Current user:', user);
    });
  }

  // ==========================================
  // DÉCONNEXION
  // ==========================================
  async logout() {
    const alert = await this.alertCtrl.create({
      header: 'Déconnexion',
      message: 'Êtes-vous sûr de vouloir vous déconnecter ?',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Déconnexion',
          role: 'destructive',
          handler: async () => {
            await this.authService.logout();
            this.showToast('Déconnecté avec succès', 'success');
          }
        }
      ]
    });

    await alert.present();
  }

  // ==========================================
  // MODIFIER LE PROFIL
  // ==========================================
  async editProfile() {
    // TODO: Navigation vers page d'édition du profil
    this.showToast('Fonctionnalité à venir', 'warning');
  }

  // ==========================================
  // PARAMÈTRES
  // ==========================================
  openSettings() {
    // TODO: Navigation vers page paramètres
    this.showToast('Fonctionnalité à venir', 'warning');
  }

  // ==========================================
  // AIDE
  // ==========================================
  openHelp() {
    // TODO: Navigation vers page d'aide
    this.showToast('Fonctionnalité à venir', 'warning');
  }

  // ==========================================
  // À PROPOS
  // ==========================================
  openAbout() {
    // TODO: Navigation vers page à propos
    this.showToast('Fonctionnalité à venir', 'warning');
  }

  // ==========================================
  // CONDITIONS D'UTILISATION
  // ==========================================
  openTerms() {
    // TODO: Navigation vers conditions d'utilisation
    this.showToast('Fonctionnalité à venir', 'warning');
  }

  // ==========================================
  // AFFICHER UN TOAST
  // ==========================================
  private async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 2000,
      position: 'top',
      color: color
    });
    await toast.present();
  }

  // ==========================================
  // OBTENIR LES INITIALES
  // ==========================================
  getInitials(name: string): string {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}