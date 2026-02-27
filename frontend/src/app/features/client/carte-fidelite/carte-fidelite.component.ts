import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

import { ClientNavbarComponent } from '@app/shared/components/client-navbar/client-navbar.component';
import { CarteClientService, CarteClientAvecBoutique } from '@app/services/carteClient.service';
import { AuthService } from '@app/services/auth.service';
import { Palier } from '@app/services/carte-fidelite.service';

@Component({
  selector: 'app-carte-fidelite',
  standalone: true,
  imports: [CommonModule, MatIconModule, ClientNavbarComponent],
  templateUrl: './carte-fidelite.component.html',
  styleUrl: './carte-fidelite.component.scss',
})
export class MesCartesFideliteComponent implements OnInit {
  private carteClientService = inject(CarteClientService);
  private authService        = inject(AuthService);
  private router             = inject(Router);

  private readonly clientId = this.authService.getProfileId() ?? '';

  cartes    = signal<CarteClientAvecBoutique[]>([]);
  isLoading = signal(true);

  ngOnInit() {
    this.carteClientService.getAllCartes(this.clientId).subscribe({
      next: res => {
        this.cartes.set(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  /** Cases remplies pour la progression (tableau de booléens) */
  getCases(carte: CarteClientAvecBoutique): boolean[] {
    const n = carte.carteFidelite.design.nombreCases;
    const fait = carte.carteClient.nombreAchat % n || (carte.carteClient.nombreAchat > 0 && carte.carteClient.nombreAchat % n === 0 ? n : carte.carteClient.nombreAchat % n);
    return Array.from({ length: n }, (_, i) => i < fait);
  }

  /** Prochain palier à atteindre */
  getProchainPalier(carte: CarteClientAvecBoutique): Palier | null {
    const actuel = carte.carteClient.nombreAchat;
    const paliers = carte.carteFidelite.paliers ?? [];
    return paliers
      .filter(p => p.achatNumero > actuel)
      .sort((a, b) => a.achatNumero - b.achatNumero)[0] ?? null;
  }

  /** Palier actif (récompense débloquée sur ce cycle) */
  getPalierActif(carte: CarteClientAvecBoutique): Palier | null {
    const actuel = carte.carteClient.nombreAchat;
    const paliers = carte.carteFidelite.paliers ?? [];
    return paliers.find(p => p.achatNumero === actuel) ?? null;
  }

  /** Vrai si le numéro de case correspond à un palier */
  isPalier(carte: CarteClientAvecBoutique, num: number): boolean {
    return (carte.carteFidelite.paliers ?? []).some(p => p.achatNumero === num);
  }

  /** Libellé de la récompense */
  getRecompenseLabel(palier: Palier): string {
    if (palier.type === 'pourcentage') return `-${palier.valeur}% sur le prochain achat`;
    if (palier.type === 'montant')     return `-${palier.valeur} Ar de réduction`;
    if (palier.type === 'gratuit')     return `Article offert`;
    return palier.description ?? '';
  }

  /** Couleur de texte adaptée au fond (luminosité) */
  getTextColor(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.92)';
  }

  /** Libellé court (pour les badges sur les cases) */
  getPalierLabel(palier: Palier): string {
    if (palier.type === 'pourcentage') return `-${palier.valeur}%`;
    if (palier.type === 'montant')     return `-${palier.valeur.toLocaleString()} Ar`;
    return 'GRATUIT';
  }

  /** Tableau d'indices des cases */
  getCasesArray(carte: CarteClientAvecBoutique): number[] {
    return Array(carte.carteFidelite.design.nombreCases).fill(0).map((_, i) => i);
  }

  /** Nombre de colonnes max dans la grille */
  getMaxColumns(carte: CarteClientAvecBoutique): number {
    return Math.min(5, carte.carteFidelite.design.nombreCases);
  }

  /** Palier pour un index de case donné */
  getPalierPourCase(carte: CarteClientAvecBoutique, index: number): Palier | null {
    return (carte.carteFidelite.paliers ?? []).find(p => p.achatNumero === index + 1) ?? null;
  }

  /** Nombre d'achats sur le cycle actuel */
  getCasesRemplies(carte: CarteClientAvecBoutique): number {
    const n = carte.carteFidelite.design.nombreCases;
    const nb = carte.carteClient.nombreAchat;
    if (nb === 0) return 0;
    const reste = nb % n;
    return reste === 0 ? n : reste;
  }

  /** Achats restants avant le prochain palier */
  prochainPalierRestant(carte: CarteClientAvecBoutique): number {
    const actuel = carte.carteClient.nombreAchat;
    const paliers = (carte.carteFidelite.paliers ?? [])
      .filter(p => p.achatNumero > actuel)
      .sort((a, b) => a.achatNumero - b.achatNumero);
    return paliers.length > 0 ? paliers[0].achatNumero - actuel : 0;
  }

  allerBoutique(boutiqueId: string, nomBoutique: string) {
    this.router.navigate(['/client/boutique', boutiqueId], {
      state: { nomBoutique },
    });
  }
}