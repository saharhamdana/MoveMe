// ==========================================
// PROFILE PAGE CHAUFFEUR - FONCTIONNALITÉS COMPLÈTES
// ==========================================
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  IonBadge,
  AlertController,
  ToastController,
  LoadingController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline,
  mailOutline,
  callOutline,
  starOutline,
  star,
  logOutOutline,
  settingsOutline,
  helpCircleOutline,
  informationCircleOutline,
  shieldCheckmarkOutline,
  carOutline,
  documentTextOutline,
  cardOutline,
  cashOutline
} from 'ionicons/icons';
import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../shared/models/interfaces';
import { Database, ref, onValue, off, update } from '@angular/fire/database';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
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
    IonBadge
  ]
})
export class ProfilePage implements OnInit {

  // ==========================================
  // PROPRIÉTÉS
  // ==========================================
  currentUser: User | null = null;
  driverData: any = null;

  // Injection des services
  private authService = inject(AuthService);
  private database = inject(Database);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  constructor() {
    addIcons({
      personOutline,
      mailOutline,
      callOutline,
      starOutline,
      star,
      logOutOutline,
      settingsOutline,
      helpCircleOutline,
      informationCircleOutline,
      shieldCheckmarkOutline,
      carOutline,
      documentTextOutline,
      cardOutline,
      cashOutline
    });
  }

  // ==========================================
  // INITIALISATION
  // ==========================================
  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      console.log('👤 Current user:', user);

      if (user && user.role === 'driver') {
        this.loadDriverData(user.uid);
      }
    });
  }

  // ==========================================
  // CHARGER LES DONNÉES DU CHAUFFEUR
  // ==========================================
  loadDriverData(driverId: string) {
    const driverRef = ref(this.database, `drivers/${driverId}`);

    onValue(driverRef, (snapshot) => {
      if (snapshot.exists()) {
        this.driverData = snapshot.val();
        console.log('✅ Driver data loaded:', this.driverData);
      } else {
        console.log('⚠️ No driver data found, creating default...');
        // Créer des données par défaut
        this.driverData = {
          name: this.currentUser?.displayName || 'Chauffeur',
          phone: this.currentUser?.phoneNumber || '',
          email: this.currentUser?.email || '',
          rating: 5.0,
          totalRides: 0,
          earnings: {
            totalEarnings: 0,
            totalRides: 0
          }
        };
      }
    });
  }

  // ==========================================
  // MODIFIER LE PROFIL
  // ==========================================
  async editProfile() {
    const alert = await this.alertCtrl.create({
      header: '✏️ Modifier le profil',
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
          placeholder: 'Téléphone',
          value: this.currentUser?.phoneNumber || ''
        }
      ],
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Enregistrer',
          handler: async (data) => {
            if (!data.displayName || !data.phoneNumber) {
              this.showToast('⚠️ Veuillez remplir tous les champs', 'warning');
              return false;
            }
            await this.updateProfile(data);
            return true; // ✅ correction
          }

        }
      ]
    });

    await alert.present();
  }

  // ==========================================
  // METTRE À JOUR LE PROFIL
  // ==========================================
  async updateProfile(data: any) {
    if (!this.currentUser) return;

    const loading = await this.loadingCtrl.create({
      message: 'Mise à jour...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const driverRef = ref(this.database, `drivers/${this.currentUser.uid}`);
      await update(driverRef, {
        name: data.displayName,
        phone: data.phoneNumber,
        updatedAt: new Date().toISOString()
      });

      await loading.dismiss();
      this.showToast('✅ Profil mis à jour avec succès', 'success');
    } catch (error) {
      await loading.dismiss();
      console.error('❌ Error updating profile:', error);
      this.showToast('❌ Erreur lors de la mise à jour', 'danger');
    }
  }

  // ==========================================
  // GÉRER LE VÉHICULE
  // ==========================================
  async manageVehicle() {
    const currentVehicle = this.driverData?.vehicleInfo;

    const alert = await this.alertCtrl.create({
      header: '🚗 Informations du véhicule',
      inputs: [
        {
          name: 'make',
          type: 'text',
          placeholder: 'Marque (ex: Peugeot)',
          value: currentVehicle?.make || ''
        },
        {
          name: 'model',
          type: 'text',
          placeholder: 'Modèle (ex: 208)',
          value: currentVehicle?.model || ''
        },
        {
          name: 'year',
          type: 'number',
          placeholder: 'Année (ex: 2020)',
          value: currentVehicle?.year || new Date().getFullYear(),
          min: 2000,
          max: new Date().getFullYear() + 1
        },
        {
          name: 'color',
          type: 'text',
          placeholder: 'Couleur (ex: Blanc)',
          value: currentVehicle?.color || ''
        },
        {
          name: 'plateNumber',
          type: 'text',
          placeholder: 'Immatriculation (ex: 123 TU 1234)',
          value: currentVehicle?.plateNumber || ''
        }
      ],
      buttons: [
        {
          text: 'Annuler',
          role: 'cancel'
        },
        {
          text: 'Enregistrer',
          handler: async (data) => {
            if (!data.make || !data.model || !data.year || !data.color || !data.plateNumber) {
              this.showToast('⚠️ Veuillez remplir tous les champs', 'warning');
              return false;
            }

            const year = parseInt(data.year);
            if (year < 2000 || year > new Date().getFullYear() + 1) {
              this.showToast('⚠️ Année invalide', 'warning');
              return false;
            }

            await this.saveVehicleInfo(data);
            return true; // ✅ correction
          }

        }
      ]
    });

    await alert.present();
  }

  // ==========================================
  // ENREGISTRER LES INFOS DU VÉHICULE
  // ==========================================
  async saveVehicleInfo(vehicleData: any) {
    if (!this.currentUser) return;

    const loading = await this.loadingCtrl.create({
      message: 'Enregistrement du véhicule...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const driverRef = ref(this.database, `drivers/${this.currentUser.uid}`);

      const vehicleInfo = {
        make: vehicleData.make.trim(),
        model: vehicleData.model.trim(),
        year: parseInt(vehicleData.year),
        color: vehicleData.color.trim(),
        plateNumber: vehicleData.plateNumber.trim().toUpperCase(),
        type: 'economy', // Type par défaut
        seats: 4
      };

      await update(driverRef, {
        vehicleInfo: vehicleInfo,
        updatedAt: new Date().toISOString()
      });

      await loading.dismiss();
      this.showToast('✅ Véhicule enregistré avec succès !', 'success');

      console.log('✅ Vehicle saved:', vehicleInfo);
    } catch (error) {
      await loading.dismiss();
      console.error('❌ Error saving vehicle:', error);
      this.showToast('❌ Erreur lors de l\'enregistrement', 'danger');
    }
  }

  // ==========================================
  // GÉRER LES DOCUMENTS
  // ==========================================
  async manageDocuments() {
    const alert = await this.alertCtrl.create({
      header: '📄 Mes documents',
      message: `
        <div style="text-align: left; line-height: 1.8;">
          <p><strong>Documents requis pour être chauffeur:</strong></p>
          <ul style="margin-left: 20px; margin-top: 12px;">
            <li style="margin-bottom: 8px;">✅ Permis de conduire valide (Catégorie B)</li>
            <li style="margin-bottom: 8px;">✅ Carte grise du véhicule</li>
            <li style="margin-bottom: 8px;">✅ Assurance automobile à jour</li>
            <li style="margin-bottom: 8px;">✅ Visite technique (moins de 12 mois)</li>
            <li style="margin-bottom: 8px;">✅ Extrait de casier judiciaire (moins de 3 mois)</li>
          </ul>
          <p style="color: #666; font-size: 0.9em; margin-top: 16px;">
            📧 Pour soumettre vos documents, contactez:<br>
            <strong>support@moveme.tn</strong>
          </p>
        </div>
      `,
      buttons: [
        {
          text: 'Fermer',
          role: 'cancel'
        },
        {
          text: 'Contacter le support',
          handler: () => {
            this.showToast('📧 Email: support@moveme.tn', 'medium');
          }
        }
      ]
    });

    await alert.present();
  }

  // ==========================================
  // PARAMÈTRES
  // ==========================================
  async openSettings() {
    const alert = await this.alertCtrl.create({
      header: '⚙️ Paramètres',
      message: `
        <div style="text-align: left; line-height: 1.6;">
          <p><strong>Paramètres disponibles:</strong></p>
          <ul style="margin-left: 20px; margin-top: 8px;">
            <li>🔔 Notifications</li>
            <li>📍 Localisation</li>
            <li>🌙 Mode sombre</li>
            <li>🔊 Sons et vibrations</li>
          </ul>
          <p style="color: #666; font-size: 0.9em; margin-top: 12px;">
            Fonctionnalité en développement
          </p>
        </div>
      `,
      buttons: ['OK']
    });
    await alert.present();
  }

  // ==========================================
  // AIDE ET SUPPORT
  // ==========================================
  async openHelp() {
    const alert = await this.alertCtrl.create({
      header: '❓ Aide & Support',
      message: `
        <div style="text-align: left; line-height: 1.8;">
          <p><strong>Besoin d'aide ?</strong></p>
          <div style="margin-top: 12px;">
            <p>📧 <strong>Email:</strong> support@moveme.tn</p>
            <p>📞 <strong>Téléphone:</strong> +216 XX XXX XXX</p>
            <p>💬 <strong>Chat:</strong> Disponible dans l'app</p>
          </div>
          <p style="color: #666; font-size: 0.9em; margin-top: 12px;">
            🕐 Disponible 7j/7, de 8h à 22h
          </p>
        </div>
      `,
      buttons: [
        {
          text: 'Fermer',
          role: 'cancel'
        },
        {
          text: 'Contacter',
          handler: () => {
            this.showToast('📧 Email: support@moveme.tn', 'medium');
          }
        }
      ]
    });
    await alert.present();
  }

  // ==========================================
  // À PROPOS
  // ==========================================
  async openAbout() {
    const alert = await this.alertCtrl.create({
      header: 'ℹ️ À propos de MoveMe',
      message: `
        <div style="text-align: center; line-height: 1.8;">
          <h3 style="margin: 16px 0;">🚖 MoveMe Chauffeur</h3>
          <p><strong>Version:</strong> 1.0.0</p>
          <p><strong>Build:</strong> 2025.01.22</p>
          <p style="margin-top: 16px;">
            La solution de transport moderne pour les chauffeurs professionnels en Tunisie
          </p>
          <p style="color: #666; margin-top: 16px; font-size: 0.9em;">
            © 2025 MoveMe. Tous droits réservés.
          </p>
        </div>
      `,
      buttons: ['OK']
    });
    await alert.present();
  }

  // ==========================================
  // CONDITIONS D'UTILISATION
  // ==========================================
  async openTerms() {
    const alert = await this.alertCtrl.create({
      header: '📜 Conditions d\'utilisation',
      message: `
        <div style="text-align: left; line-height: 1.6; font-size: 0.9em; max-height: 300px; overflow-y: auto;">
          <p><strong>En utilisant MoveMe Chauffeur, vous acceptez:</strong></p>
          <ol style="margin-left: 20px; margin-top: 12px;">
            <li style="margin-bottom: 8px;">Respecter le code de la route tunisien</li>
            <li style="margin-bottom: 8px;">Être courtois et professionnel avec les passagers</li>
            <li style="margin-bottom: 8px;">Maintenir votre véhicule propre et en bon état</li>
            <li style="margin-bottom: 8px;">Accepter les courses selon votre disponibilité</li>
            <li style="margin-bottom: 8px;">Respecter les tarifs de l'application</li>
            <li style="margin-bottom: 8px;">Protéger les données personnelles des passagers</li>
          </ol>
          <p style="margin-top: 16px; color: #666;">
            Pour consulter les conditions complètes, visitez:<br>
            <strong>www.moveme.tn/terms</strong>
          </p>
        </div>
      `,
      buttons: ['Fermer']
    });
    await alert.present();
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
          text: 'Se déconnecter',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingCtrl.create({
              message: 'Déconnexion...',
              spinner: 'crescent'
            });
            await loading.present();

            try {
              await this.authService.logout();
              await loading.dismiss();
              this.showToast('✅ Déconnecté avec succès', 'success');
              this.router.navigate(['/login']);
            } catch (error) {
              await loading.dismiss();
              console.error('❌ Error logging out:', error);
              this.showToast('❌ Erreur lors de la déconnexion', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  // ==========================================
  // OBTENIR LES INITIALES
  // ==========================================
  getInitials(name: string | null | undefined): string {
    if (!name) return '?';
    const names = name.split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  // ==========================================
  // OBTENIR LE STATUT DU VÉHICULE
  // ==========================================
  getVehicleStatus(): string {
    if (!this.driverData?.vehicleInfo) {
      return 'Non configuré';
    }
    return 'Configuré';
  }

  // ==========================================
  // OBTENIR LA COULEUR DU STATUT
  // ==========================================
  getVehicleStatusColor(): string {
    return this.driverData?.vehicleInfo ? 'success' : 'warning';
  }

  // ==========================================
  // AFFICHER UN TOAST
  // ==========================================
  private async showToast(message: string, color: 'success' | 'danger' | 'warning' | 'medium') {
    const toast = await this.toastCtrl.create({
      message: message,
      duration: 3000,
      position: 'top',
      color: color
    });
    await toast.present();
  }

  // ==========================================
  // NETTOYAGE
  // ==========================================
  ngOnDestroy() {
    if (this.currentUser) {
      const driverRef = ref(this.database, `drivers/${this.currentUser.uid}`);
      off(driverRef);
    }
  }
}