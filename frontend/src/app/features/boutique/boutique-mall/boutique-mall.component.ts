import { Component, signal, inject, OnInit, ViewChild, computed } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { BoutiqueNavbarComponent } from '@app/shared/components/boutique-navbar/boutique-navbar.component';
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
    DecimalPipe,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatSnackBarModule,
    BoutiqueNavbarComponent,
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
  private snackBar        = inject(MatSnackBar);

  @ViewChild(BoutiqueMallMapComponent) mallMapComp?: BoutiqueMallMapComponent;

  private readonly boutiqueId = this.authService.getProfileId() ?? '';

  // ── State ───────────────────────────────────────────────────────────────────
  isLoading    = signal(true);
  currentEtage = signal<Etage>('RC');
  viewMode     = signal<'map' | 'list'>('map');

  // ── Données mall (TOUS étages) ──────────────────────────────────────────────
  private toutesBoxes: Box[] = [];
  boxs      = signal<Box[]>([]);   // ← signal pour que computed() le track
  contrats:  Contrat[]  = [];
  boutiques: Boutique[] = [];
  users:     any[]      = [];

  // ── Ma boutique (persistante, ne change pas avec l'étage) ──────────────────
  maBoutique  = signal<Boutique | null>(null);
  maBox       = signal<Box | null>(null);

  // ── Statistiques (étage courant) ────────────────────────────────────────────
  nbBoxesLibres    = signal(0);
  nbBoxesOccupees  = signal(0);
  nbBoxesTotal     = signal(0);

  // ── Filtre taille ───────────────────────────────────────────────────────────
  filtreTaille = signal<'Petit' | 'Moyen' | 'Grand' | null>(null);

  // ── Mapping dimensions → taille réelle ─────────────────────────────────────
  // 140×140 = Petit (4m×4m) | 200×140 = Moyen (4m×8m) | 250×140 = Grand (10m×12m)
  private readonly TAILLES: { w: number; h: number; label: 'Petit' | 'Moyen' | 'Grand'; reel: string }[] = [
    { w: 140, h: 140, label: 'Petit', reel: '4m × 4m'   },
    { w: 200, h: 140, label: 'Moyen', reel: '4m × 8m'   },
    { w: 250, h: 140, label: 'Grand', reel: '10m × 12m'  },
  ];

  // ── Boxes libres pour la vue liste (réactif car dépend de boxs signal) ──────
  boxesLibres = computed(() => {
    const boxIdsOccupees = new Set(
      this.contrats
        .filter(c => c.statut === 'ACTIF')
        .map(c => (c as any).idBox?.toString() ?? (c as any).boxId?.toString() ?? '')
    );
    const filtre = this.filtreTaille();
    return this.boxs()
      .filter(b => b.statut === 'LIBRE' && !boxIdsOccupees.has(b._id?.toString() ?? ''))
      .filter(b => !filtre || this.getTailleLabel(b) === filtre);
  });

  readonly etages: { value: Etage; label: string }[] = [
    { value: 'RC', label: 'Rez-de-chaussée' },
    { value: 'FC', label: '1ᵉʳ étage' },
  ];

  readonly tailles: ('Petit' | 'Moyen' | 'Grand')[] = ['Petit', 'Moyen', 'Grand'];
  readonly emptyFavoris = new Set<string>();

  ngOnInit() {
    this.loadAll();
  }

  private loadAll() {
    this.isLoading.set(true);

    forkJoin({
      // Charger les boxes des DEUX étages en parallèle
      boxesRC:   this.boxService.getBoxes('RC').pipe(catchError(() => of([]))),
      boxesFC:   this.boxService.getBoxes('FC').pipe(catchError(() => of([]))),
      contrats:  this.contratService.getContrats({ statut: 'ACTIF' }).pipe(catchError(() => of([]))),
      boutiques: this.boutiqueService.getBoutiques().pipe(catchError(() => of([]))),
      users:     this.userService.getUsers().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ boxesRC, boxesFC, contrats, boutiques, users }) => {
        this.toutesBoxes = [...(boxesRC || []), ...(boxesFC || [])];
        this.contrats    = contrats  || [];
        this.boutiques   = boutiques || [];
        this.users       = users     || [];

        // Résoudre ma boutique/box UNE SEULE FOIS sur toutes les boxes
        this.resoudreContexte();

        // Filtrer les boxes affichées pour l'étage courant
        this.filtrerBoxesEtage();
        this.calculerStats();
        this.isLoading.set(false);

        setTimeout(() => this.mallMapComp?.forceRedraw(), 50);
      },
      error: () => this.isLoading.set(false),
    });
  }

  // ── Résout ma boutique/box sur l'ensemble des boxes (tous étages) ──────────
  private resoudreContexte() {
    const boutique = this.boutiques.find(
      b => b._id?.toString() === this.boutiqueId
    );
    this.maBoutique.set(boutique ?? null);

    const contrat = this.contrats.find(
      c => c.idBoutique?.toString() === this.boutiqueId && c.statut === 'ACTIF'
    );

    if (contrat) {
      const boxId = (contrat as any).idBox?.toString() ?? (contrat as any).boxId?.toString() ?? '';
      // Cherche dans TOUTES les boxes, pas juste celles de l'étage
      const box = this.toutesBoxes.find(b => b._id?.toString() === boxId);
      this.maBox.set(box ?? null);
    }
  }

  // ── Met à jour boxs (signal) pour l'étage affiché ─────────────────────────
  private filtrerBoxesEtage() {
    this.boxs.set(this.toutesBoxes.filter(b => b.etage === this.currentEtage()));
  }

  private calculerStats() {
    const boxIdsOccupees = new Set(
      this.contrats
        .filter(c => c.statut === 'ACTIF')
        .map(c => (c as any).idBox?.toString() ?? (c as any).boxId?.toString() ?? '')
    );
    const current = this.boxs();
    const libres   = current.filter(b => !boxIdsOccupees.has(b._id?.toString() ?? '') && b.statut === 'LIBRE').length;
    const occupees = current.filter(b =>  boxIdsOccupees.has(b._id?.toString() ?? '')).length;

    this.nbBoxesLibres.set(libres);
    this.nbBoxesOccupees.set(occupees);
    this.nbBoxesTotal.set(current.length);
  }

  // ── Changement d'étage — PAS de rechargement, juste un filtre ─────────────
  setEtage(etage: Etage) {
    if (this.currentEtage() === etage) return;
    this.currentEtage.set(etage);
    this.filtrerBoxesEtage();
    this.calculerStats();
    // maBox reste inchangé — il pointe toujours vers la box du gérant
    setTimeout(() => this.mallMapComp?.forceRedraw(), 50);
  }

  setViewMode(mode: 'map' | 'list') {
    this.viewMode.set(mode);
  }

  // ── Louer une box ──────────────────────────────────────────────────────────
  louerBox(box: Box) {
    // À connecter à votre logique métier (ex: ouvrir un dialog de contrat)
    this.snackBar.open(
      `Demande de location pour la box ${box.nom} envoyée`,
      'OK',
      { duration: 3000 }
    );
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  get maBoxEtage(): string {
    return this.maBox()?.etage === 'RC' ? 'Rez-de-chaussée' : '1ᵉʳ étage';
  }

  get tauxOccupation(): number {
    const total = this.nbBoxesTotal();
    return total > 0 ? Math.round((this.nbBoxesOccupees() / total) * 100) : 0;
  }

  getTailleLabel(box: Box): 'Petit' | 'Moyen' | 'Grand' {
    const w = box.width  ?? 0;
    const h = box.height ?? 0;
    const match = this.TAILLES.find(t =>
      (t.w === w && t.h === h) || (t.w === h && t.h === w)
    );
    if (match) return match.label;
    // Fallback par surface si dimensions inconnues
    const s = w * h;
    if (s <= 140 * 140) return 'Petit';
    if (s <= 200 * 140) return 'Moyen';
    return 'Grand';
  }

  getDimensionReelle(box: Box): string {
    const w = box.width  ?? 0;
    const h = box.height ?? 0;
    const match = this.TAILLES.find(t =>
      (t.w === w && t.h === h) || (t.w === h && t.h === w)
    );
    return match?.reel ?? `${w} × ${h}`;
  }

  getSurface(box: Box): string {
    const w = box.width  ?? 0;
    const h = box.height ?? 0;
    const match = this.TAILLES.find(t =>
      (t.w === w && t.h === h) || (t.w === h && t.h === w)
    );
    if (match) {
      // Calculer la surface réelle à partir du label
      const surfaces: Record<string, number> = { Petit: 16, Moyen: 32, Grand: 120 };
      return surfaces[match.label]?.toString() ?? '—';
    }
    return Math.round((w * h) / 10000).toString();
  }

  setFiltreTaille(t: 'Petit' | 'Moyen' | 'Grand' | null) {
    this.filtreTaille.set(this.filtreTaille() === t ? null : t);
  }
}