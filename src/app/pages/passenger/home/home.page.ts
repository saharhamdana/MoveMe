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
  IonText,
  IonList,
  IonItem,
  IonLabel
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  carSportOutline, 
  logOutOutline,
  addOutline,
  timeOutline,
  cashOutline,
  starOutline,
  callOutline,
  bulbOutline,
  chevronForwardOutline
} from 'ionicons/icons';

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
    IonIcon,
    IonList,
    IonItem,
    IonLabel
  ]
})
export class HomePage implements OnInit {
  
  // Utilisateur actuel
  currentUser: User | null = null;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    addIcons({ 
      carSportOutline, 
      logOutOutline,
      addOutline,
      timeOutline,
      cashOutline,
      starOutline,
      callOutline,
      bulbOutline,
      chevronForwardOutline,
    });
  }

  ngOnInit() {
    // S'abonner à l'utilisateur actuel
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  // ==========================================
  // DEMANDER UNE COURSE
  // ==========================================
  requestRide() {
    this.router.navigate(['/passenger/search-ride']);
  }

  // ==========================================
  // DÉCONNEXION
  // ==========================================
  async logout() {
    await this.authService.logout();
  }
}