import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-profile',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Profil</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-card>
        <ion-card-content>
          <h2>Mon profil</h2>
          <p>Chauffeur</p>
        </ion-card-content>
      </ion-card>
    </ion-content>
  `,
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardContent]
})
export class ProfilePage {}