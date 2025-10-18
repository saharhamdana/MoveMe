import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-ride-requests',
  templateUrl: './ride-requests.page.html',
  styleUrls: ['./ride-requests.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class RideRequestsPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
