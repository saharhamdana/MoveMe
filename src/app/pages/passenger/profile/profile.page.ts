// ==========================================
// PROFILE PAGE - PROFIL UTILISATEUR
// VERSION AVEC CAPACITOR
// ==========================================
import { Component, OnInit, OnDestroy } from '@angular/core';
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
  IonActionSheet,
  AlertController,
  ToastController,
  ActionSheetController
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
  shieldCheckmarkOutline,
  cameraOutline,
  imagesOutline,
  trashOutline
} from 'ionicons/icons';

// ==========================================
// IMPORTS
// ==========================================
import { AuthService } from '../../../core/services/auth.service';

import { CapacitorService } from '../../../core/services/capacitor.service';
import { User } from '../../../shared/models/interfaces';

/**
 * Page de profil utilisateur
 * Utilise Capacitor pour :
 * - Prendre/modifier la photo de profil
 * - Afficher les informations de l'app
 * - Feedback tactile sur les actions
 * - Sauvegarder les préférences localement
 */
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
export class ProfilePage implements OnInit, OnDestroy {
  
  // ==========================================
  // PROPRIÉTÉS
  // ==========================================
  
  /**
   * Utilisateur actuellement connecté
   */
  currentUser: User | null = null;

  /**
   * Photo de profil locale (stockée avec Capacitor Preferences)
   * Format: base64 string ou URL
   */
  profilePhoto: string | null = null;

  /**
   * Informations de l'application
   */
  appInfo: any = null;

  /**
   * Indique si une photo est en cours de chargement
   */
  isLoadingPhoto: boolean = false;

  constructor(
    private authService: AuthService,
    private capacitorService: CapacitorService,
    private router: Router,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private actionSheetCtrl: ActionSheetController
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
      shieldCheckmarkOutline,
      cameraOutline,
      imagesOutline,
      trashOutline
    });
  }

  // ==========================================
  // LIFECYCLE HOOKS
  // ==========================================
  
  /**
   * Initialisation du composant
   * - Charge l'utilisateur actuel
   * - Charge la photo de profil depuis le stockage local
   * - Récupère les informations de l'app
   */
  async ngOnInit() {
    console.log('👤 Initialisation ProfilePage');

    // S'abonner à l'utilisateur actuel
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      console.log('Current user:', user);

      // Charger la photo de profil si l'utilisateur est connecté
      if (user) {
        this.loadProfilePhoto();
      }
    });

    // Charger les informations de l'application
    await this.loadAppInfo();

    // Feedback tactile à l'ouverture de la page
    await this.capacitorService.vibrate();
  }

  /**
   * Nettoyage lors de la destruction du composant
   */
  ngOnDestroy() {
    console.log('🛑 Destruction ProfilePage');
  }

  // ==========================================
  // PHOTO DE PROFIL
  // ==========================================
  
  /**
   * Charge la photo de profil depuis le stockage local
   * La photo est stockée en base64 dans Capacitor Preferences
   */
  async loadProfilePhoto() {
    try {
      // Récupérer la photo depuis le stockage local
      const photo = await this.capacitorService.getPreference('profilePhoto');
      
      if (photo) {
        this.profilePhoto = photo;
        console.log('📸 Photo de profil chargée depuis le stockage local');
      } else if (this.currentUser?.photoURL) {
        // Sinon, utiliser la photo URL de Firebase si disponible
        this.profilePhoto = this.currentUser.photoURL;
        console.log('📸 Photo de profil chargée depuis Firebase');
      }
    } catch (error) {
      console.error('❌ Erreur loadProfilePhoto:', error);
    }
  }

  /**
   * Affiche un ActionSheet pour choisir comment modifier la photo
   * - Prendre une photo
   * - Choisir depuis la galerie
   * - Supprimer la photo
   */
  async changeProfilePicture() {
    // Feedback tactile
    await this.capacitorService.vibrate();

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Photo de profil',
      buttons: [
        {
          text: 'Prendre une photo',
          icon: 'camera-outline',
          handler: async () => {
            await this.takePictureFromCamera();
          }
        },
        {
          text: 'Choisir depuis la galerie',
          icon: 'images-outline',
          handler: async () => {
            await this.selectPictureFromGallery();
          }
        },
        {
          text: 'Supprimer la photo',
          icon: 'trash-outline',
          role: 'destructive',
          handler: async () => {
            await this.deleteProfilePicture();
          }
        },
        {
          text: 'Annuler',
          role: 'cancel',
          handler: async () => {
            await this.capacitorService.vibrate();
          }
        }
      ]
    });

    await actionSheet.present();
  }

  /**
   * Prend une photo avec la caméra
   */
async takePictureFromCamera() {
  try {
    this.isLoadingPhoto = true;
    await this.capacitorService.vibrate();

    let photo: string | null = null;

    // Vérifier si c'est web (desktop)
    if (!this.capacitorService.isNative()) {
      // Créer un élément vidéo pour afficher la caméra
      const video = document.createElement('video');
      video.autoplay = true;
      video.width = 320;
      video.height = 240;

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;

      // Afficher la vidéo dans un modal temporaire ou div
      const modal = document.createElement('div');
      modal.style.position = 'fixed';
      modal.style.top = '50%';
      modal.style.left = '50%';
      modal.style.transform = 'translate(-50%, -50%)';
      modal.style.backgroundColor = '#fff';
      modal.style.padding = '10px';
      modal.style.zIndex = '10000';
      modal.appendChild(video);

      // Bouton pour capturer la photo
      const btn = document.createElement('button');
      btn.innerText = 'Prendre la photo';
      modal.appendChild(btn);
      document.body.appendChild(modal);

      photo = await new Promise<string | null>((resolve) => {
        btn.onclick = () => {
          // Capturer l'image depuis la vidéo
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg'));

          // Nettoyer
          stream.getTracks().forEach(track => track.stop());
          document.body.removeChild(modal);
        };
      });
    }

    if (!photo) {
      console.log('⚠️ Utilisateur a annulé la capture de photo');
      this.isLoadingPhoto = false;
      return;
    }

    // Sauvegarder la photo localement
    this.profilePhoto = photo;
    await this.capacitorService.setPreference('profilePhoto', photo);

    // Feedback de succès
    await this.capacitorService.vibrateLight();
    await this.capacitorService.showToast('📸 Photo mise à jour !', 'short');

    this.isLoadingPhoto = false;
  } catch (error) {
    console.error('❌ Erreur takePictureFromCamera (web desktop) :', error);
    this.isLoadingPhoto = false;
    await this.capacitorService.showToast('❌ Erreur lors de la prise de photo', 'short');
  }
}




  /**
   * Sélectionne une photo depuis la galerie
   */
  async selectPictureFromGallery() {
    try {
      this.isLoadingPhoto = true;
      await this.capacitorService.vibrate();

      // Ouvrir la galerie
      const photo = await this.capacitorService.takePicture('gallery');

      if (photo) {
        // Sauvegarder la photo localement
        this.profilePhoto = photo;
        await this.capacitorService.setPreference('profilePhoto', photo);

        // TODO: Upload vers Firebase Storage
        // await this.uploadPhotoToFirebase(photo);

        // Feedback de succès
        await this.capacitorService.vibrateLight();
        await this.capacitorService.showToast('🖼️ Photo mise à jour !', 'short');
        
        console.log('✅ Photo de profil mise à jour depuis la galerie');
      }

      this.isLoadingPhoto = false;
    } catch (error) {
      console.error('❌ Erreur selectPictureFromGallery:', error);
      this.isLoadingPhoto = false;
      await this.capacitorService.showToast('❌ Erreur lors de la sélection de photo', 'short');
    }
  }

  /**
   * Supprime la photo de profil
   */
  async deleteProfilePicture() {
  await this.capacitorService.vibrate();

  const alert = await this.alertCtrl.create({
    header: 'Supprimer la photo',
    message: 'Voulez-vous vraiment supprimer votre photo de profil ?',
    buttons: [
      {
        text: 'Annuler',
        role: 'cancel',
        handler: async () => {
          await this.capacitorService.vibrate();
        }
      },
      {
        text: 'Supprimer',
        role: 'destructive',
        handler: async () => {
          try {
            // Supprimer la photo locale
            this.profilePhoto = null;
            await this.capacitorService.removePreference('profilePhoto');

            // Supprimer temporairement la photo du user pour forcer le placeholder
            if (this.currentUser) {
              this.currentUser.photoURL = '';
            }

            // Feedback de succès
            await this.capacitorService.vibrateLight();
            await this.capacitorService.showToast('🗑️ Photo supprimée', 'short');

            console.log('✅ Photo de profil supprimée');
          } catch (error) {
            console.error('❌ Erreur lors de la suppression de la photo:', error);
            await this.capacitorService.showToast('❌ Impossible de supprimer la photo', 'short');
          }
        }
      }
    ]
  });

  await alert.present();
}

  // ==========================================
  // INFORMATIONS APP
  // ==========================================
  
  /**
   * Charge les informations de l'application
   * Version, nom, build number, etc.
   */
 /**
 * Charge les informations de l'application
 * Version, nom, build number, etc.
 */
async loadAppInfo() {
  try {
    this.appInfo = await this.capacitorService.getAppInfo();
    console.log('📱 Informations app:', this.appInfo);
  } catch (error) {
    console.error('❌ Erreur loadAppInfo:', error);
    // Définir des valeurs par défaut
    this.appInfo = {
      name: 'MoveMe',
      version: '1.0.0',
      build: 'dev'
    };
  }
}

  /**
   * Retourne la version de l'app à afficher
   * Format: "NomApp vVersion (Build)"
   */
  getAppVersion(): string {
    if (!this.appInfo) {
      return 'MoveMe v1.0.0';
    }
    return `${this.appInfo.name} v${this.appInfo.version} (${this.appInfo.build})`;
  }

  // ==========================================
  // DÉCONNEXION
  // ==========================================
  
  /**
   * Déconnecte l'utilisateur après confirmation
   */
  async logout() {
    // Feedback tactile
    await this.capacitorService.vibrate();

    const alert = await this.alertCtrl.create({
      header: 'Déconnexion',
      message: 'Êtes-vous sûr de vouloir vous déconnecter ?',
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
          handler: async () => {
            await this.capacitorService.vibrate();
          }
        },
        {
          text: 'Déconnexion',
          role: 'destructive',
          handler: async () => {
            // Feedback tactile fort
            await this.capacitorService.vibrateHeavy();

            // Optionnel: Nettoyer certaines données locales
            // await this.capacitorService.removePreference('pickupLocation');
            // await this.capacitorService.removePreference('recentSearches');

            // Déconnexion Firebase
            await this.authService.logout();
            
            // Notification
            this.showToast('Déconnecté avec succès', 'success');
            
            console.log('👋 Utilisateur déconnecté');
          }
        }
      ]
    });

    await alert.present();
  }

  // ==========================================
  // MODIFIER LE PROFIL
  // ==========================================
  
  /**
   * Ouvre la page d'édition du profil
   * Permet de modifier : nom, téléphone, email, etc.
   */
  async editProfile() {
    await this.capacitorService.vibrate();
    
    // TODO: Implémenter une modale ou page d'édition
    const alert = await this.alertCtrl.create({
      header: 'Modifier le profil',
      inputs: [
        {
          name: 'displayName',
          type: 'text',
          placeholder: 'Nom complet',
          value: this.currentUser?.displayName || ''
        },
        {
          name: 'phoneNumber',
          type: 'tel',
          placeholder: 'Numéro de téléphone',
          value: this.currentUser?.phoneNumber || ''
        }
      ],
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
          handler: async () => {
            await this.capacitorService.vibrate();
          }
        },
        {
          text: 'Sauvegarder',
          handler: async (data) => {
            if (data.displayName || data.phoneNumber) {
              // TODO: Mettre à jour dans Firebase
              await this.capacitorService.vibrateLight();
              this.showToast('Profil mis à jour', 'success');
              console.log('Données à sauvegarder:', data);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // ==========================================
  // PARAMÈTRES
  // ==========================================
  
  /**
   * Ouvre la page des paramètres
   */
  async openSettings() {
    await this.capacitorService.vibrate();
    
    // TODO: Créer une vraie page de paramètres
    const alert = await this.alertCtrl.create({
      header: 'Paramètres',
      message: 'Options de l\'application',
      inputs: [
        {
          name: 'notifications',
          type: 'checkbox',
          label: 'Notifications push',
          value: 'notifications',
          checked: true
        },
        {
          name: 'location',
          type: 'checkbox',
          label: 'Localisation en arrière-plan',
          value: 'location',
          checked: true
        },
        {
          name: 'sound',
          type: 'checkbox',
          label: 'Sons et vibrations',
          value: 'sound',
          checked: true
        }
      ],
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Sauvegarder',
          handler: async (data) => {
            // Sauvegarder les paramètres localement
            await this.capacitorService.setPreference('settings', data);
            await this.capacitorService.vibrateLight();
            this.showToast('Paramètres sauvegardés', 'success');
            console.log('Paramètres:', data);
          }
        }
      ]
    });

    await alert.present();
  }

  // ==========================================
  // AIDE ET SUPPORT
  // ==========================================
  
  /**
   * Ouvre la page d'aide
   */
  async openHelp() {
    await this.capacitorService.vibrate();
    
    const alert = await this.alertCtrl.create({
      header: 'Aide et Support',
      message: `
        <strong>Comment pouvons-nous vous aider ?</strong><br><br>
        📧 Email: support@moveme.tn<br>
        📞 Téléphone: +216 XX XXX XXX<br>
        💬 Chat en ligne disponible 24/7
      `,
      buttons: [
        {
          text: 'Envoyer un email',
          handler: () => {
            // TODO: Ouvrir l'app email
            console.log('Ouvrir email');
          }
        },
        {
          text: 'Fermer',
          role: 'cancel'
        }
      ]
    });

    await alert.present();
  }

  // ==========================================
  // À PROPOS
  // ==========================================
  
  /**
   * Affiche les informations sur l'application
   */
  async openAbout() {
    await this.capacitorService.vibrate();
    
    const alert = await this.alertCtrl.create({
      header: 'À propos',
      message: `
        <strong>${this.getAppVersion()}</strong><br><br>
        MoveMe est une application de covoiturage moderne et sécurisée.<br><br>
        Développé avec ❤️ en Tunisie<br><br>
        © 2024 MoveMe. Tous droits réservés.
      `,
      buttons: ['Fermer']
    });

    await alert.present();
  }

  // ==========================================
  // CONDITIONS D'UTILISATION
  // ==========================================
  
  /**
   * Affiche les conditions d'utilisation
   */
  async openTerms() {
    await this.capacitorService.vibrate();
    
    const alert = await this.alertCtrl.create({
      header: 'Conditions d\'utilisation',
      message: `
        En utilisant MoveMe, vous acceptez nos conditions d'utilisation.<br><br>
        <strong>Points clés :</strong><br>
        • Respect mutuel entre passagers et chauffeurs<br>
        • Interdiction de partager vos identifiants<br>
        • Signaler tout comportement inapproprié<br>
        • Paiement sécurisé<br><br>
        <a href="https://moveme.tn/terms" target="_blank">Lire les conditions complètes</a>
      `,
      buttons: ['Fermer']
    });

    await alert.present();
  }

  // ==========================================
  // SUPPRIMER LE COMPTE
  // ==========================================
  
  /**
   * Permet à l'utilisateur de supprimer définitivement son compte
   * ⚠️ Action irréversible
   */
  async deleteAccount() {
    await this.capacitorService.vibrateHeavy();
    
    const alert = await this.alertCtrl.create({
      header: '⚠️ Supprimer le compte',
      message: `
        <strong>ATTENTION : Cette action est irréversible !</strong><br><br>
        Toutes vos données seront définitivement supprimées :<br>
        • Historique des courses<br>
        • Informations personnelles<br>
        • Moyens de paiement<br>
        • Statistiques<br><br>
        Êtes-vous absolument sûr ?
      `,
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel',
          handler: async () => {
            await this.capacitorService.vibrate();
          }
        },
        {
          text: 'Supprimer définitivement',
          role: 'destructive',
          handler: async () => {
            // TODO: Implémenter la suppression du compte
            await this.capacitorService.vibrateHeavy();
            console.log('⚠️ Suppression du compte demandée');
            this.showToast('Fonctionnalité à venir', 'warning');
          }
        }
      ]
    });

    await alert.present();
  }

  // ==========================================
  // HELPERS
  // ==========================================
  
  /**
   * Affiche un toast de notification
   */
  private async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 2000,
      position: 'top',
      color: color
    });
    await toast.present();
  }

  /**
   * Obtient les initiales à partir d'un nom
   * Utilisé pour l'avatar placeholder
   */
  getInitials(name: string): string {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  /**
   * Retourne l'URL de la photo de profil à afficher
   * Priorité : photo locale > photo Firebase > initiales
   */
  getProfilePhotoURL(): string | null {
    if (this.profilePhoto) {
      return this.profilePhoto;
    }
    if (this.currentUser?.photoURL) {
      return this.currentUser.photoURL;
    }
    return null;
  }
}