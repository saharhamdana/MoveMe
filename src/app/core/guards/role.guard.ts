// ==========================================
// ROLE GUARD - VÉRIFICATION DU RÔLE
// ==========================================
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

// ==========================================
// GUARD FONCTIONNEL
// ==========================================
// Vérifie que l'utilisateur a le bon rôle
// Exemple: un passager ne peut pas accéder aux routes /driver/*
export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Récupérer le rôle requis depuis les données de la route
  const requiredRole = route.data['role'] as 'passenger' | 'driver';

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (!user) {
        // Pas d'utilisateur
        console.log('❌ Role Guard: No user');
        router.navigate(['/login']);
        return false;
      }

      if (user.role === requiredRole) {
        // ✅ Bon rôle
        console.log(`✅ Role Guard: Correct role (${requiredRole})`);
        return true;
      } else {
        // ❌ Mauvais rôle → Redirection
        console.log(`❌ Role Guard: Wrong role. Required: ${requiredRole}, Got: ${user.role}`);
        
        // Rediriger vers l'espace approprié
        if (user.role === 'passenger') {
          router.navigate(['/passenger/tabs/home']);
        } else {
          router.navigate(['/driver/tabs/home']);
        }
        
        return false;
      }
    })
  );
};