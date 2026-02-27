import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSliderModule } from '@angular/material/slider';

import { CarteFideliteService, CarteFidelite, Palier } from '@app/services/carte-fidelite.service';
import { AuthService } from '@app/services/auth.service';
import { BoutiqueNavbarComponent } from '@app/shared/components/boutique-navbar/boutique-navbar.component';

@Component({
  selector: 'app-carte-fidelite-config',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSliderModule,
    MatSnackBarModule,
    BoutiqueNavbarComponent,
  ],
  templateUrl: './carte-fidelite-config.component.html',
  styleUrl: './carte-fidelite-config.component.scss',
})
export class CarteFideliteConfigComponent implements OnInit {

  private carteService = inject(CarteFideliteService);
  private authService  = inject(AuthService);
  private snackBar     = inject(MatSnackBar);

  readonly boutiqueId = this.authService.getProfileId() ?? '';

  carte     = signal<CarteFidelite | null>(null);
  isLoading = signal(false);
  nomBoutique = signal('');

  // ── Form data ──
  design = {
    couleur1:    '#7d936c',
    couleur2:    '#3a4a2f',
    slogan:      'Votre fidélité, nos récompenses',
    nombreCases: 10,
  };

  paliers: Palier[] = [
    { achatNumero: 10, type: 'pourcentage', valeur: 10 },
  ];

  actif = true;

  // ── Démo visuelle ──
  casesRemplies = signal(0);

  // ── Lifecycle ──
  ngOnInit() {
    this.loadBoutique();
    this.loadCarte();
  }

  loadBoutique() {
    this.carteService.getBoutique(this.boutiqueId).subscribe({
      next: boutique => {
        console.log('boutique reçue:', boutique); // ← regarde la structure réelle
        this.nomBoutique.set(boutique.nom);
      },
      error: () => this.nomBoutique.set('Boutique'),
    });
  }

  loadCarte() {
    this.isLoading.set(true);
    this.carteService.getCarte(this.boutiqueId).subscribe({
      next: carte => {
        this.carte.set(carte);
        this.design  = { ...carte.design };
        this.paliers = carte.paliers?.length
          ? carte.paliers.map(p => ({ ...p }))
          : [{ achatNumero: carte.design.nombreCases, type: 'pourcentage', valeur: 10 }];
        this.actif   = carte.actif;
        this.isLoading.set(false);
      },
      error: () => {
        this.snackBar.open('Erreur de chargement', '', { duration: 2000 });
        this.isLoading.set(false);
      },
    });
  }

  save() {
    const data: Partial<CarteFidelite> = {
      design:  this.design,
      paliers: this.paliers,
      actif:   this.actif,
    };

    this.carteService.updateCarte(this.boutiqueId, data).subscribe({
      next: () => {
        this.snackBar.open('✓ Carte de fidélité mise à jour', '', { duration: 2000 });
        this.loadCarte();
      },
      error: () => {
        this.snackBar.open('Erreur lors de la sauvegarde', '', { duration: 2000 });
      },
    });
  }

  // ── Gestion des paliers ──
  ajouterPalier() {
    this.paliers.push({
      achatNumero: this.design.nombreCases,
      type:        'pourcentage',
      valeur:      10,
    });
  }

  supprimerPalier(index: number) {
    if (this.paliers.length > 1) {
      this.paliers.splice(index, 1);
    }
  }

  getPalierLabel(palier: Palier): string {
    if (palier.type === 'pourcentage') return `-${palier.valeur}%`;
    if (palier.type === 'montant')     return `-${palier.valeur.toLocaleString()} Ar`;
    return 'GRATUIT';
  }

  getPalierPourCase(caseIndex: number): Palier | null {
    return this.paliers.find(p => p.achatNumero === caseIndex + 1) ?? null;
  }

  // ── Helpers template ──
  formatLabel(value: number): string {
    return `${value}`;
  }

  get maxColumns(): number {
    return Math.min(5, this.design.nombreCases);
  }

  get casesArray(): number[] {
    return Array(this.design.nombreCases).fill(0).map((_, i) => i);
  }

  // ── Démo tampons ──
  toggleCase(index: number) {
    if (index < this.casesRemplies()) {
      this.casesRemplies.set(index);
    } else if (index === this.casesRemplies()) {
      this.casesRemplies.update(v => v + 1);
    }
  }

  reinitialiserDemo() {
    this.casesRemplies.set(0);
  }
}