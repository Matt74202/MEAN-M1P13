import {
  Component, signal, inject, OnInit, ViewChild, computed, effect
} from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

type FluxEtape = 'contrat' | 'duree' | 'confirmation' | null;

@Component({
  selector: 'app-boutique-mall',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    DatePipe,
    FormsModule,
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
  private http            = inject(HttpClient);
  private boxService      = inject(BoxService);
  private contratService  = inject(ContratService);
  private boutiqueService = inject(BoutiqueService);
  private userService     = inject(UserService);
  private snackBar        = inject(MatSnackBar);

  @ViewChild(BoutiqueMallMapComponent) mallMapComp?: BoutiqueMallMapComponent;

  private readonly boutiqueId = this.authService.getProfileId() ?? '';
  private readonly API        = 'http://localhost:5000/api';

  // ── State global ──────────────────────────────────────────────────────────
  isLoading    = signal(true);
  currentEtage = signal<Etage>('RC');
  viewMode     = signal<'map' | 'list'>('map');

  // ── Données mall ──────────────────────────────────────────────────────────
  private toutesBoxes: Box[] = [];
  boxs      = signal<Box[]>([]);
  contrats:  Contrat[]  = [];
  boutiques: Boutique[] = [];
  users:     any[]      = [];

  maBoutique  = signal<Boutique | null>(null);
  maBox       = signal<Box | null>(null);

  nbBoxesLibres   = signal(0);
  nbBoxesOccupees = signal(0);
  nbBoxesTotal    = signal(0);

  filtreTaille = signal<'Petit' | 'Moyen' | 'Grand' | null>(null);

  // ── Flux demande ──────────────────────────────────────────────────────────
  fluxEtape         = signal<FluxEtape>(null);
  boxSelectionnee   = signal<Box | null>(null);
  contratLuApprouve = signal(false);
  dureeSelectionnee = signal<number>(24);
  isEnvoi           = signal(false);

  // ── Dates estimées ────────────────────────────────────────────────────────
  // Dates calculées une seule fois via effect — stable, pas de boucle
  readonly dateDebut = new Date();
  dateFin = signal<Date>(this._calculerDateFin(24));

  private _calculerDateFin(duree: number): Date {
    const d = new Date();
    d.setMonth(d.getMonth() + duree);
    d.setDate(d.getDate() - 1);
    d.setHours(23, 59, 59, 999);
    return d;
  }

  private readonly TAILLES: { w: number; h: number; label: 'Petit' | 'Moyen' | 'Grand'; reel: string }[] = [
    { w: 140, h: 140, label: 'Petit', reel: '4m × 4m'   },
    { w: 200, h: 140, label: 'Moyen', reel: '4m × 8m'   },
    { w: 250, h: 140, label: 'Grand', reel: '10m × 12m'  },
  ];

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
    { value: 'FC', label: '1ᵉʳ étage'       },
  ];
  readonly tailles: ('Petit' | 'Moyen' | 'Grand')[] = ['Petit', 'Moyen', 'Grand'];
  readonly emptyFavoris = new Set<string>();
  readonly durees = [6, 12, 18, 24, 36];

  constructor() {
    // Recalcule dateFin uniquement quand dureeSelectionnee change — UNE SEULE FOIS
    effect(() => {
      this.dateFin.set(this._calculerDateFin(this.dureeSelectionnee()));
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  ngOnInit() { this.loadAll(); }

  private loadAll() {
    this.isLoading.set(true);
    forkJoin({
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
        this.resoudreContexte();
        this.filtrerBoxesEtage();
        this.calculerStats();
        this.isLoading.set(false);
        setTimeout(() => { try { this.mallMapComp?.forceRedraw(); } catch(e) {} }, 100);
      },
      error: () => this.isLoading.set(false),
    });
  }

  private resoudreContexte() {
    const boutique = this.boutiques.find(b => b._id?.toString() === this.boutiqueId);
    this.maBoutique.set(boutique ?? null);
    const contrat = this.contrats.find(
      c => c.idBoutique?.toString() === this.boutiqueId && c.statut === 'ACTIF'
    );
    if (contrat) {
      const boxId = (contrat as any).idBox?.toString() ?? (contrat as any).boxId?.toString() ?? '';
      this.maBox.set(this.toutesBoxes.find(b => b._id?.toString() === boxId) ?? null);
    }
  }

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
    this.nbBoxesLibres.set(current.filter(b => !boxIdsOccupees.has(b._id?.toString() ?? '') && b.statut === 'LIBRE').length);
    this.nbBoxesOccupees.set(current.filter(b => boxIdsOccupees.has(b._id?.toString() ?? '')).length);
    this.nbBoxesTotal.set(current.length);
  }

  setEtage(etage: Etage) {
    if (this.currentEtage() === etage) return;
    this.currentEtage.set(etage);
    this.filtrerBoxesEtage();
    this.calculerStats();
    setTimeout(() => { try { this.mallMapComp?.forceRedraw(); } catch(e) {} }, 100);
  }

  setViewMode(mode: 'map' | 'list') { this.viewMode.set(mode); }

  // ─────────────────────────────────────────────────────────────────────────
  // FLUX DEMANDE
  // ─────────────────────────────────────────────────────────────────────────

  /** Étape 1 — ouvrir le modal avec les clauses */
  louerBox(box: Box) {
    this.boxSelectionnee.set(box);
    this.contratLuApprouve.set(false);
    this.dureeSelectionnee.set(24);
    this.fluxEtape.set('contrat');
  }

  fermerFlux() {
    this.fluxEtape.set(null);
    this.boxSelectionnee.set(null);
    this.contratLuApprouve.set(false);
    this.isEnvoi.set(false);
  }

  /** Étape 2 — passer au choix de durée (checkbox validée) */
  passerADuree() {
    if (!this.contratLuApprouve()) return;
    this.fluxEtape.set('duree');
  }

  retourContrat() { this.fluxEtape.set('contrat'); }

  /**
   * Étape 3 — POST /api/requests
   *
   * rentalController.createRequest attend :
   *   { boxId: string, message: string, dureeMois: number }
   *   + Header Authorization: Bearer <token JWT rôle 'boutique'>
   *
   * En cas de succès → statut 'pending', l'admin validera ensuite.
   */
  envoyerDemande() {
    const box = this.boxSelectionnee();
    if (!box) return;

    this.isEnvoi.set(true);

    const token = this.authService.getToken?.() ?? '';
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });

    const payload = {
      boxId:     box._id?.toString(),
      userId:    this.boutiqueId,           // envoyé dans le body car pas de middleware auth
      message:   'Demande via plan du mall',
      dureeMois: this.dureeSelectionnee(),
    };

    this.http
      .post<{ success: boolean; message: string; request: any }>(
        `${this.API}/requests`,
        payload,
        { headers }
      )
      .subscribe({
        next: () => {
          this.isEnvoi.set(false);
          this.fluxEtape.set('confirmation');
          this.loadAll(); // rafraîchit les boxes (le box reste 'libre' jusqu'à validation admin)
        },
        error: (err) => {
          this.isEnvoi.set(false);
          // Le backend renvoie err.error.message dans tous les cas d'erreur
          const msg = err.error?.message ?? 'Une erreur est survenue. Veuillez réessayer.';
          this.snackBar.open(msg, 'Fermer', { duration: 5000 });
        },
      });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────────────────────────────────
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
      const surfaces: Record<string, number> = { Petit: 16, Moyen: 32, Grand: 120 };
      return surfaces[match.label]?.toString() ?? '—';
    }
    return Math.round((w * h) / 10000).toString();
  }

  setFiltreTaille(t: 'Petit' | 'Moyen' | 'Grand' | null) {
    this.filtreTaille.set(this.filtreTaille() === t ? null : t);
  }
}