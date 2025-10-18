import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'home',
        loadComponent: () => import('../home/home.page').then(m => m.HomePage)
      },
      {
        path: 'history',
        loadComponent: () => import('../history/history.page').then(m => m.HistoryPage)
      },
      {
        path: 'earnings',
        loadComponent: () => import('../earnings/earnings.page').then(m => m.EarningsPage)
      },
      {
        path: 'profile',
        loadComponent: () => import('../profile/profile.page').then(m => m.ProfilePage)
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  }
];