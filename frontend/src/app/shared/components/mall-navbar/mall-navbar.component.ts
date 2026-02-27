import { Component, signal, inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '@app/services/auth.service';

interface NavLink {
  label: string;
  path:  string;
}

interface NavGroup {
  label: string;
  links: NavLink[];
}

@Component({
  selector: 'app-mall-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './mall-navbar.component.html',
  styleUrl:    './mall-navbar.component.scss',
})
export class MallNavbarComponent implements OnInit {
  private authService = inject(AuthService);

  nomMall        = signal<string>('Dyve');
  openGroup      = signal<string | null>(null);
  mobileMenuOpen = signal(false);

  readonly navGroups: NavGroup[] = [
    {
      label: 'Gestion',
      links: [
        { label: 'Demandes de location', path: '/mall/rental-requests' },
        { label: 'Frais de livraison',   path: '/mall/frais'           },
      ],
    },
    {
      label: 'Administration',
      links: [
        { label: 'Horaires',   path: '/mall/horaires'   },
        { label: 'Dashboard',  path: '/mall/dashboard'  },
      ],
    },
  ];

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
      this.nomMall.set(user.nom || 'Dyve');
    }
  }

  toggleGroup(label: string) {
    this.openGroup.update(current => (current === label ? null : label));
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.update(v => !v);
    if (!this.mobileMenuOpen()) this.openGroup.set(null);
    document.body.style.overflow = this.mobileMenuOpen() ? 'hidden' : '';
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
    this.openGroup.set(null);
    document.body.style.overflow = '';
  }

  get userInitials(): string {
    return this.nomMall()
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