// ==========================================
// AUTH GUARD - PROTECTION DES ROUTES
// ==========================================
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

// ==========================================
// GUARD FONCTIONNEL
// ==========================================
// Vérifie si l'utilisateur est authentifié
// Si NON → Redirige vers /login
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    map(user => {
      if (user) {
        // ✅ Utilisateur connecté
        console.log('✅ Auth Guard: User authenticated');
        return true;
      } else {
        // ❌ Pas d'utilisateur → Redirection
        console.log('❌ Auth Guard: Not authenticated');
        router.navigate(['/login']);
        return false;
      }
    })
  );
};