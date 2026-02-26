import { Component, signal, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@app/services/auth.service';

interface NavLink {
  label: string;
  path: string;
  icon?: string;
}

interface NavGroup {
  label: string;
  icon?: string;
  links: NavLink[];
}

@Component({
  selector: 'app-boutique-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './boutique-navbar.component.html',
  styleUrl: './boutique-navbar.component.scss',
})
export class BoutiqueNavbarComponent implements OnInit {
  private authService = inject(AuthService);

  nomBoutique    = signal<string>('Ma Boutique');
  openGroup      = signal<string | null>(null);
  mobileMenuOpen = signal(false);

  readonly navGroups: NavGroup[] = [
    {
      label: 'Boutique',
      icon: 'storefront',
      links: [{ label: 'Gestion du stock', path: '/boutique/gestion-stock', icon: 'inventory_2' }],
    },
    {
      label: 'Fidélité',
      icon: 'loyalty',
      links: [{ label: 'Carte de fidélité', path: '/boutique/carte-fidelite', icon: 'card_membership' }],
    },
    {
      label: 'Finance',
      icon: 'bar_chart',
      links: [
        { label: 'Dashboard',          path: '/boutique/dashboard', icon: 'dashboard' },
        { label: 'Gestion des loyers', path: '/boutique/loyers',    icon: 'receipt_long' },
      ],
    },
    {
      label: 'Administration',
      icon: 'admin_panel_settings',
      links: [
        { label: 'Contrats', path: '/boutique/contrats', icon: 'description' },
        { label: 'Horaires', path: '/boutique/horaires', icon: 'schedule' },
      ],
    },
  ];

  /** Ferme les dropdowns si on clique en dehors */
  @HostListener('document:click', ['$event'])
  onDocumentClick(e: Event) {
    const target = e.target as HTMLElement;
    if (!target.closest('.nav-group') && !target.closest('.mobile-menu')) {
      this.openGroup.set(null);
    }
  }

  ngOnInit() {
    const user = this.authService.getCurrentUser?.();
    if (user) {
      this.nomBoutique.set(user.nomBoutique || user.nom || 'Ma Boutique');
    }
  }

  toggleGroup(label: string) {
    this.openGroup.update(current => (current === label ? null : label));
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.update(v => !v);
    if (!this.mobileMenuOpen()) {
      this.openGroup.set(null);
    }
    // Empêche le scroll du body quand le menu est ouvert
    document.body.style.overflow = this.mobileMenuOpen() ? 'hidden' : '';
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
    this.openGroup.set(null);
    document.body.style.overflow = '';
  }

  /** Première(s) initiale(s) pour l'avatar */
  get userInitials(): string {
    const name = this.nomBoutique();
    return name
      .split(' ')
      .slice(0, 2)
      .map(w => w[0])
      .join('')
      .toUpperCase();
  }

  logout() {
    document.body.style.overflow = '';
    this.authService.logout();
  }
}