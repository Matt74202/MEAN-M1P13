import { Component, signal, inject, OnInit, OnDestroy, HostListener, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from '@app/services/auth.service';
import { PanierService } from '@app/services/panier.service';

import { filter, Subscription } from 'rxjs';

interface NavLink {
  label: string;
  path: string;
  icon: string;
}

@Component({
  selector: 'app-client-navbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    MatIconModule,
    MatBadgeModule,
    MatTooltipModule,
  ],
  templateUrl: './client-navbar.component.html',
  styleUrl: './client-navbar.component.scss',
})
export class ClientNavbarComponent implements OnInit, OnDestroy {
  private authService   = inject(AuthService);
  private panierService = inject(PanierService);
  private router        = inject(Router);

  nomClient      = signal<string>('Mon compte');
  mobileMenuOpen = signal(false);

  // ── Contexte boutique ─────────────────────────────────────────────────────
  // Quand l'URL est /client/boutique/:id, on affiche le nom + panier + favoris
  estSurBoutique = signal(false);
  nomBoutique    = signal<string>('');

  // Signal panier global (depuis le service)
  readonly nbArticles = this.panierService.nbArticles;

  // Output pour communiquer avec client-boutique sans couplage fort
  readonly panierClick   = output<void>();
  readonly favorisClick  = output<void>();

  private routerSub?: Subscription;

  readonly navLinks: NavLink[] = [
    { label: 'Accueil',            path: '/client',           icon: 'home' },
    { label: 'Dashboard',          path: '/client/dashboard', icon: 'dashboard' },
    { label: 'Mes commandes',      path: '/client/commandes', icon: 'receipt_long' },
    { label: 'Cartes de fidélité', path: '/client/fidelite',  icon: 'loyalty' },
    { label: 'Favoris',            path: '/client/favoris',   icon: 'favorite' },
  ];

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: Event) {
    const target = e.target as HTMLElement;
    if (!target.closest('.client-navbar') && !target.closest('.mobile-menu')) {
      // ne ferme pas le menu ici — géré par closeMobileMenu()
    }
  }

  ngOnInit() {
    const user = this.authService.getCurrentUser?.();
    if (user) {
      this.nomClient.set(user.prenom || user.nom || user.email || 'Mon compte');
    }

    this.updateContextFromUrl(this.router.url);

    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => this.updateContextFromUrl(e.urlAfterRedirects));
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
  }

  private updateContextFromUrl(url: string) {
    const isBoutique = /\/client\/boutique\//.test(url);
    this.estSurBoutique.set(isBoutique);

    if (isBoutique) {
      const nom = window.history.state?.nomBoutique
        || localStorage.getItem('nomBoutique')
        || 'Boutique';
      this.nomBoutique.set(nom);
    } else {
      this.nomBoutique.set('');
    }
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.update(v => !v);
    document.body.style.overflow = this.mobileMenuOpen() ? 'hidden' : '';
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
    document.body.style.overflow = '';
  }

  get userInitials(): string {
    return this.nomClient()
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  }

  onPanierClick()  { this.panierClick.emit(); }
  onFavorisClick() { this.favorisClick.emit(); }

  logout() {
    document.body.style.overflow = '';
    this.authService.logout();
  }
}