import { Component, signal, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { ClientNavbarComponent } from '@app/shared/components/client-navbar/client-navbar.component';
import { BoutiqueMallMapComponent } from './boutique-mall-map.component';

import { AuthService } from '@app/services/auth.service';
import { BoxService } from '@app/services/box.service';
import { ContratService } from '@app/services/contrat.service';
import { BoutiqueService } from '@app/services/boutique.service';
import { UserService } from '@app/services/user.service';

import { Box, Boutique, Contrat, Etage } from '@app/model/mall-models';

@Component({
  selector: 'app-boutique-mall',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    ClientNavbarComponent,
    BoutiqueMallMapComponent,
  ],
  templateUrl: './boutique-mall.component.html',
  styleUrl:    './boutique-mall.component.scss',
})
export class BoutiqueMallComponent implements OnInit {

  private authService     = inject(AuthService);
  private boxService      = inject(BoxService);
  private contratService  = inject(ContratService);
  private boutiqueService = inject(BoutiqueService);
  private userService     = inject(UserService);

  @ViewChild(BoutiqueMallMapComponent) mallMapComp?: BoutiqueMallMapComponent;

  // ── Identité du gérant ──────────────────────────────────────────────────────
  private readonly boutiqueId = this.authService.getProfileId() ?? '';

  // ── State ───────────────────────────────────────────────────────────────────
  isLoading    = signal(true);
  currentEtage = signal<Etage>('RC');

  // ── Données mall ────────────────────────────────────────────────────────────
  boxs:      Box[]      = [];
  contrats:  Contrat[]  = [];
  boutiques: Boutique[] = [];
  users:     any[]      = [];

  // ── Ma boutique ─────────────────────────────────────────────────────────────
  maBoutique  = signal<Boutique | null>(null);
  maBox       = signal<Box | null>(null);

  // ── Statistiques ────────────────────────────────────────────────────────────
  nbBoxesLibres    = signal(0);
  nbBoxesOccupees  = signal(0);
  nbBoxesTotal     = signal(0);

  // ── Etages disponibles ──────────────────────────────────────────────────────
  readonly etages: { value: Etage; label: string }[] = [
    { value: 'RC', label: 'Rez-de-chaussée' },
    { value: 'FC', label: '1ᵉʳ étage' },
  ];

  /** Set vide immuable — évite new Set() dans le template (invalide en Angular) */
  readonly emptyFavoris = new Set<string>();

  ngOnInit() {
    this.loadAll();
  }

  private loadAll() {
    this.isLoading.set(true);

    forkJoin({
      boxes:     this.boxService.getBoxes(this.currentEtage()).pipe(catchError(() => of([]))),
      contrats:  this.contratService.getContrats({ statut: 'ACTIF' }).pipe(catchError(() => of([]))),
      boutiques: this.boutiqueService.getBoutiques().pipe(catchError(() => of([]))),
      users:     this.userService.getUsers().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ boxes, contrats, boutiques, users }) => {
        this.boxs      = boxes     || [];
        this.contrats  = contrats  || [];
        this.boutiques = boutiques || [];
        this.users     = users     || [];

        this.resoudreContexte();
        this.calculerStats();
        this.isLoading.set(false);
        this.mallMapComp?.forceRedraw();
      },
      error: () => this.isLoading.set(false),
    });
  }

  // ── Résout quelle box/boutique appartient au gérant connecté ───────────────
  private resoudreContexte() {
    // Chercher la boutique du gérant
    const boutique = this.boutiques.find(
      b => b._id?.toString() === this.boutiqueId
    );
    this.maBoutique.set(boutique ?? null);

    // Chercher le contrat actif de cette boutique
    const contrat = this.contrats.find(
      c => c.idBoutique?.toString() === this.boutiqueId && c.statut === 'ACTIF'
    );

    if (contrat) {
      const boxId = (contrat as any).idBox?.toString() ?? (contrat as any).boxId?.toString() ?? '';
      const box = this.boxs.find(b => b._id?.toString() === boxId);
      this.maBox.set(box ?? null);

      // Si la box est sur un autre étage, switcher automatiquement
      if (box?.etage && box.etage !== this.currentEtage()) {
        this.currentEtage.set(box.etage as Etage);
      }
    }
  }

  private calculerStats() {
    const boxesEtage = this.boxs.filter(b => b.etage === this.currentEtage());
    const boxIdsOccupees = new Set(
      this.contrats
        .filter(c => c.statut === 'ACTIF')
        .map(c => (c as any).idBox?.toString() ?? (c as any).boxId?.toString() ?? '')
    );

    const libres   = boxesEtage.filter(b => !boxIdsOccupees.has(b._id?.toString() ?? '')).length;
    const occupees = boxesEtage.filter(b =>  boxIdsOccupees.has(b._id?.toString() ?? '')).length;

    this.nbBoxesLibres.set(libres);
    this.nbBoxesOccupees.set(occupees);
    this.nbBoxesTotal.set(boxesEtage.length);
  }

  // ── Changement d'étage ──────────────────────────────────────────────────────
  setEtage(etage: Etage) {
    if (this.currentEtage() === etage) return;
    this.currentEtage.set(etage);
    this.loadAll();
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  get maBoxEtage(): string {
    return this.maBox()?.etage === 'RC' ? 'Rez-de-chaussée' : '1ᵉʳ étage';
  }

  get tauxOccupation(): number {
    const total = this.nbBoxesTotal();
    return total > 0 ? Math.round((this.nbBoxesOccupees() / total) * 100) : 0;
  }
}