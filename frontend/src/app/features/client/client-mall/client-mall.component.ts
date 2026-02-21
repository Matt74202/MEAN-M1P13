import { Component, ViewChild, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';

import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ClientMallMapComponent } from '@app/features/client/client-mall/client-mall-map.component';
import { FilterChipsComponent } from '@shared/UI/filter/filter-chips.component';

import { BoxService } from '@app/services/box.service';
import { ContratService } from '@app/services/contrat.service';
import { BoutiqueService } from '@app/services/boutique.service';
import { UserService } from '@app/services/user.service';

import { Box, Boutique, Contrat, Etage } from '@app/model/mall-models';

import { FavoriService } from '@app/services/favori.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

interface BoxWithDetails extends Box {
  boutique?: Boutique;
  contrat?: Contrat;
}

@Component({
  selector: 'app-client-mall',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
    MatCardModule,
    MatTooltipModule,
    ClientMallMapComponent,
    FilterChipsComponent,
    MatSnackBarModule,
  ],
  templateUrl: './client-mall.component.html',
  styleUrl: './client-mall.component.scss',
})
export class ClientMallComponent implements OnInit {

  private boxService     = inject(BoxService);
  private contratService = inject(ContratService);
  private boutiqueService = inject(BoutiqueService);
  private userService    = inject(UserService);
  private router         = inject(Router);
  private favoriService = inject(FavoriService);
  private snackBar      = inject(MatSnackBar);

  // ── État ──
  viewMode: 'map' | 'cards' = 'map';
  currentEtage: Etage = 'RC';
  isLoading = false;

  private readonly clientId = '6994753c7e66b10156cb0cf2';

  // ── Données ──
  boxs:      Box[]      = [];
  contrats:  Contrat[]  = [];
  boutiques: Boutique[] = [];
  users:     any[]      = [];

  // ── Filtre ──
  selectedTypeCommerce: string | null = null;
  typeCommerceOptions: { value: string; label: string }[] = [];

  // ── Groupes pour la vue liste ──
  boutiquesOccupees: BoxWithDetails[] = [];

  @ViewChild(ClientMallMapComponent) mallMapComp?: ClientMallMapComponent;

  ngOnInit() {
    this.loadData();
    this.favoriService.chargerFavoris(this.clientId, 'boutique');
  }

  // ── Chargement ──
  private loadData() {
    this.isLoading = true;

    forkJoin({
      boxes:     this.boxService.getBoxes(this.currentEtage).pipe(catchError(() => of([]))),
      contrats:  this.contratService.getContrats({ statut: 'ACTIF' }).pipe(catchError(() => of([]))),
      boutiques: this.boutiqueService.getBoutiques().pipe(catchError(() => of([]))),
      users:     this.userService.getUsers().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ boxes, contrats, boutiques, users }) => {
        this.boxs      = boxes     || [];
        this.contrats  = contrats  || [];
        this.boutiques = boutiques || [];
        this.users     = users     || [];
        this.isLoading = false;

        this.generateFiltres();
        this.updateBoutiquesOccupees();
        this.mallMapComp?.forceRedraw();
      },
      error: () => { this.isLoading = false; }
    });
  }

  private loadBoxes() {
    this.boxService.getBoxes(this.currentEtage).subscribe({
      next: (data) => {
        this.boxs = data || [];
        this.updateBoutiquesOccupees();
        this.mallMapComp?.forceRedraw();
      }
    });
  }

  // ── Utilitaires ──
  private getContratBoxId(contrat: any): string {
    return contrat.idBox?.toString() || contrat.boxId?.toString() || '';
  }

  private getBoutiqueFromContrat(contrat: Contrat): Boutique | undefined {
    if (contrat.idBoutique) {
      return this.boutiques.find(b =>
        b._id?.toString() === contrat.idBoutique?.toString()
      );
    }
    if ((contrat as any).userId) {
      const user = this.users.find((u: any) =>
        u._id?.toString() === (contrat as any).userId?.toString()
      );
      if (user) {
        return {
          _id:          user._id,
          nom:          user.nom,
          typeCommerce: user.TypeCommerce ?? 'Inconnu',
          mail:         user.mail,
        } as unknown as Boutique;
      }
    }
    return undefined;
  }

  getBoxesWithDetails(): BoxWithDetails[] {
    return this.boxs
      .filter(b => b.etage === this.currentEtage)
      .map(box => {
        const contrat = this.contrats.find(c =>
          this.getContratBoxId(c) === box._id?.toString() && c.statut === 'ACTIF'
        );
        const boutique = contrat ? this.getBoutiqueFromContrat(contrat) : undefined;
        return { ...box, boutique, contrat };
      });
  }

  private updateBoutiquesOccupees() {
    const all = this.getBoxesWithDetails();
    this.boutiquesOccupees = all.filter(b => b.boutique);
  }

  // ── Filtres ──
  private generateFiltres() {
    const typesSet = new Set<string>();
    this.contrats.forEach(contrat => {
      let type: string | undefined;
      if (contrat.idBoutique) {
        type = this.boutiques.find(b =>
          b._id?.toString() === contrat.idBoutique?.toString()
        )?.typeCommerce;
      } else if ((contrat as any).userId) {
        type = this.users.find((u: any) =>
          u._id?.toString() === (contrat as any).userId?.toString()
        )?.TypeCommerce;
      }
      if (type) typesSet.add(type);
    });

    this.typeCommerceOptions = Array.from(typesSet).sort().map(t => ({
      value: t, label: t
    }));
  }

  get boutiquesFiltered(): BoxWithDetails[] {
    if (!this.selectedTypeCommerce) return this.boutiquesOccupees;
    return this.boutiquesOccupees.filter(
      b => b.boutique?.typeCommerce === this.selectedTypeCommerce
    );
  }

  onFiltreChange(type: string | null) {
    this.selectedTypeCommerce = type;
    this.mallMapComp?.forceRedraw();
  }

  // ── Navigation ──
  setEtage(etage: Etage) {
    if (this.currentEtage === etage) return;
    this.currentEtage = etage;
    this.loadBoxes();
  }

  // ── Clic sur une boutique (map ou carte) ──
    onBoutiqueSelected(box: BoxWithDetails | Box) {
  console.log('═══ onBoutiqueSelected ═══');
  console.log('box._id:', box._id);

  // ── Chercher le contrat directement depuis this.contrats ──
  const contrat = this.contrats.find(c => {
    const cBoxId = (c as any).idBox?.toString() || (c as any).boxId?.toString() || '';
    console.log('  contrat cBoxId:', cBoxId, ' vs box._id:', box._id?.toString());
    return cBoxId === box._id?.toString() && c.statut === 'ACTIF';
  });

  console.log('contrat trouvé:', contrat);
  console.log('boutiques dispo:', this.boutiques.map(b => ({ _id: b._id?.toString(), nom: b.nom })));

  if (!contrat) {
    console.warn('Aucun contrat actif pour cette box');
    return;
  }

  let boutiqueId: string | undefined;

  if (contrat.idBoutique) {
    boutiqueId = contrat.idBoutique.toString();
    console.log('→ idBoutique:', boutiqueId);

  } else if ((contrat as any).userId) {
    const userId = (contrat as any).userId.toString();
    const user = this.users.find((u: any) => u._id?.toString() === userId);
    console.log('→ userId user:', user);

    if (user) {
      const boutique = this.boutiques.find(b => b.nom === user.nom);
      boutiqueId = boutique?._id?.toString();
      console.log('→ boutique par nom:', boutique);
    }
  }

  console.log('→ Navigation vers boutiqueId:', boutiqueId);

  if (boutiqueId) {
  const boutique = this.boutiques.find(b => b._id?.toString() === boutiqueId);
  this.router.navigate(['/client/boutique', boutiqueId], {
    state: { nomBoutique: boutique?.nom || 'Boutique' }
  });
} else {
    console.warn('Aucune boutique trouvée');
  }
}

  getColorForType(typeCommerce?: string): string {
      if (!typeCommerce) return '#9e9e9e';
      const code = this.boutiqueService.getColorForType(typeCommerce);
      return '#' + code.toString(16).padStart(6, '0');
    }

    isFavoriBoutique(boutiqueId: string): boolean {
    return this.favoriService.isFavori(boutiqueId);
  }

  toggleFavoriBoutique(event: Event, boutiqueId: string) {
    event.stopPropagation(); // empêche le clic de naviguer vers la boutique
    this.favoriService.toggleLocal(boutiqueId);
    this.favoriService.toggle(this.clientId, 'boutique', boutiqueId).subscribe({
      next: (res: { favori: boolean }) => {
        const msg = res.favori ? '❤️ Boutique ajoutée aux favoris' : 'Boutique retirée des favoris';
        this.snackBar.open(msg, '', { duration: 2000 });
      },
      error: () => this.favoriService.toggleLocal(boutiqueId)
    });
  }

  get idsFavoris(): Set<string> {
    return this.favoriService.idsFavoris();
  }
}