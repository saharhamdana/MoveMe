// ==========================================
// HOME PASSAGER
// ==========================================
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { 
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonText
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { carSportOutline, logOutOutline } from 'ionicons/icons';

import { AuthService } from '../../../core/services/auth.service';
import { User } from '../../../shared/models/interfaces';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardContent,
    IonButton,
    IonIcon
  ]
})
export class HomePage implements OnInit {
  
  // Utilisateur actuel
  currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    addIcons({ carSportOutline, logOutOutline });
  }

  ngOnInit() {
    // S'abonner à l'utilisateur actuel
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  // Déconnexion
  async logout() {
    await this.authService.logout();
  }
}