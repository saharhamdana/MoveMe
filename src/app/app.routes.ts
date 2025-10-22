import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then(m => m.RegisterPage)
  },
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then(m => m.HomePage)
  },
  {
    // ✅ ROUTES PASSAGER
    path: 'passenger',
    canActivate: [authGuard, roleGuard],
    data: { role: 'passenger' },
    children: [
      {
        path: 'tabs',
        loadChildren: () => import('./pages/passenger/tabs/tabs.routes').then(m => m.routes)
      },
      {
        // ✅ ROUTE DEMANDE DE COURSE
        path: 'search-ride',
        loadComponent: () => import('./pages/passenger/search-ride/search-ride.page').then(m => m.SearchRidePage)
      },
      {
        path: '',
        redirectTo: 'tabs',
        pathMatch: 'full'
      }
    ]
  },
  {
    // ✅ ROUTES CHAUFFEUR
    path: 'driver',
    canActivate: [authGuard, roleGuard],
    data: { role: 'driver' },
    children: [
      {
        path: 'tabs',
        loadChildren: () => import('./pages/driver/tabs/tabs.routes').then(m => m.routes)
      },
      {
        path: 'ride-requests',
        loadComponent: () => import('./pages/driver/ride-requests/ride-requests.page').then(m => m.RideRequestsPage)
      },
      {
        path: '',
        redirectTo: 'tabs',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  },
  {
    path: 'ride-requests',
    loadComponent: () => import('./pages/driver/ride-requests/ride-requests.page').then(m => m.RideRequestsPage)
  }
];