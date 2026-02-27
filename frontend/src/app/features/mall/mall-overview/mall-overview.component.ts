import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';

import { forkJoin, of, Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { MallMapComponent } from '@app/shared/components/mall-map/mall-map.component';
import { FilterChipsComponent } from '@shared/UI/filter/filter-chips.component';
import { MallNavbarComponent } from '@app/shared/components/mall-navbar/mall-navbar.component';

import { BoxService } from '@app/services/box.service';
import { ContratService } from '@app/services/contrat.service';
import { BoutiqueService } from '@app/services/boutique.service';
import { UserService } from '@app/services/user.service';

import { TypeBoutique, Box, Boutique, Contrat, Etage } from '@app/model/mall-models';

interface BoxWithDetails extends Box {
  boutique?: Boutique;
  contrat?: Contrat;
}

@Component({
  selector: 'app-mall-canvas',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatButtonToggleModule,
    MatCardModule,
    MatChipsModule,
    MallMapComponent,
    FilterChipsComponent,
    MallNavbarComponent,
  ],
  templateUrl: './mall-overview.component.html',
  styleUrl: './mall-overview.component.scss',
})
export class MallCanvasComponent {

  @ViewChild(MallMapComponent) mallMapComp?: MallMapComponent;

  protected readonly types: (TypeBoutique & { nom: 'Petit' | 'Moyen' | 'Grand' })[] = [
    { _id: 't1', nom: 'Petit', longueur: 140, largeur: 140, nbEtagereGauche: 1, nbEtagereDroite: 1 },
    { _id: 't2', nom: 'Moyen', longueur: 140, largeur: 200, nbEtagereGauche: 2, nbEtagereDroite: 2 },
    { _id: 't3', nom: 'Grand', longueur: 200, largeur: 250, nbEtagereGauche: 3, nbEtagereDroite: 3 },
  ];

  protected boxs: Box[] = [];
  protected editingBoxes: Box[] = [];
  protected modifiedBoxIds: Set<string> = new Set();

  protected boutiques: Boutique[] = [];
  protected contrats: Contrat[] = [];
  protected users: any[] = [];
  protected filteredBoxes: Box[] = [];

  protected selectedTypeCommerce: string | null = null;
  protected typeCommerceOptions: { value: string; label: string }[] = [];

  showInteriorView = false;
  selectedBox?: Box;
  selectedType?: TypeBoutique;
  selectedContrat?: Contrat;
  selectedBoutique?: Boutique;

  editMode = false;
  currentEtage: Etage = 'RC';
  isLoading = false;
  viewMode: 'map' | 'cards' = 'map';

  statusGroups: { status: string; count: number; boxes: BoxWithDetails[]; expanded: boolean }[] = [];

  constructor(
    private boxService: BoxService,
    private contratService: ContratService,
    private boutiqueService: BoutiqueService,
    private userService: UserService,
  ) {
    this.loadData();
  }

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
        this.filteredBoxes = this.getFilteredBoxes();
        this.generateTypeCommerceOptions();
        this.updateStatusGroups();
        this.isLoading = false;
        this.mallMapComp?.forceRedraw();
      },
      error: (err) => {
        console.error('[MALL] Erreur chargement données :', err);
        this.isLoading = false;
        this.boxs = []; this.contrats = []; this.boutiques = []; this.users = [];
      }
    });
  }

  private getContratBoxId(contrat: any): string {
    return contrat.idBox?.toString() || contrat.boxId?.toString() || '';
  }

  private generateTypeCommerceOptions() {
    const typesSet = new Set<string>();
    this.contrats.forEach(contrat => {
      let typeCommerce: string | undefined;
      if (contrat.idBoutique) {
        typeCommerce = this.boutiques.find(b => b._id?.toString() === contrat.idBoutique?.toString())?.typeCommerce;
      } else if ((contrat as any).userId) {
        typeCommerce = this.users.find((u: any) => u._id?.toString() === (contrat as any).userId?.toString())?.TypeCommerce;
      }
      if (typeCommerce) typesSet.add(typeCommerce);
    });
    this.typeCommerceOptions = Array.from(typesSet).sort().map(type => ({ value: type, label: type }));
  }

  onTypeCommerceFilterChange(typeCommerce: string | null) {
    this.selectedTypeCommerce = typeCommerce;
    this.filteredBoxes = this.getFilteredBoxes();
    this.updateStatusGroups();
    this.mallMapComp?.forceRedraw();
  }

  getFilteredBoxes(): Box[] {
    const baseBoxes = this.editMode ? this.editingBoxes : this.boxs;
    if (!this.selectedTypeCommerce) return baseBoxes;
    return baseBoxes.filter(box => {
      const contrat = this.contrats.find(c => this.getContratBoxId(c) === box._id?.toString() && c.statut === 'ACTIF');
      if (!contrat) return false;
      if (contrat.idBoutique) {
        return this.boutiques.find(b => b._id?.toString() === contrat.idBoutique?.toString())?.typeCommerce === this.selectedTypeCommerce;
      }
      if ((contrat as any).userId) {
        return this.users.find((u: any) => u._id?.toString() === (contrat as any).userId?.toString())?.TypeCommerce === this.selectedTypeCommerce;
      }
      return false;
    });
  }

  getBoxesWithDetails(): BoxWithDetails[] {
    return this.filteredBoxes.map(box => {
      const contrat  = this.contrats.find(c => this.getContratBoxId(c) === box._id?.toString() && c.statut === 'ACTIF');
      const boutique = contrat ? this.getBoutiqueFromContrat(contrat) : undefined;
      return { ...box, boutique, contrat };
    });
  }

  private getBoutiqueFromContrat(contrat: Contrat): Boutique | undefined {
    if (contrat.idBoutique) {
      return this.boutiques.find(b => b._id?.toString() === contrat.idBoutique?.toString());
    }
    if ((contrat as any).userId) {
      const user = this.users.find((u: any) => u._id?.toString() === (contrat as any).userId?.toString());
      if (user) return { _id: user._id, nom: user.nom, typeCommerce: user.TypeCommerce ?? 'Inconnu', mail: user.mail } as unknown as Boutique;
    }
    return undefined;
  }

  private updateStatusGroups() {
    const boxesWithDetails = this.getBoxesWithDetails();
    const newGroups = [
      { status: 'OCCUPÉ',         count: boxesWithDetails.filter(b => b.boutique).length,                              boxes: boxesWithDetails.filter(b => b.boutique),                              expanded: true  },
      { status: 'LIBRE',          count: boxesWithDetails.filter(b => b.statut === 'LIBRE' && !b.boutique).length,     boxes: boxesWithDetails.filter(b => b.statut === 'LIBRE' && !b.boutique),     expanded: true  },
      { status: 'NON FONCTIONNEL',count: boxesWithDetails.filter(b => b.statut === 'NON_FONCTIONNEL').length,           boxes: boxesWithDetails.filter(b => b.statut === 'NON_FONCTIONNEL'),           expanded: false },
    ].filter(g => g.count > 0);

    newGroups.forEach(ng => {
      const eg = this.statusGroups.find(g => g.status === ng.status);
      if (eg) ng.expanded = eg.expanded;
    });
    this.statusGroups = newGroups;
  }

  getColorForType(typeCommerce?: string): string {
    if (!typeCommerce) return '#9e9e9e';
    return '#' + this.boutiqueService.getColorForType(typeCommerce).toString(16).padStart(6, '0');
  }

  setViewMode(mode: 'map' | 'cards') {
    this.viewMode = mode;
    if (mode === 'cards') this.updateStatusGroups();
  }

  toggleGroupExpansion(group: { status: string; count: number; boxes: BoxWithDetails[]; expanded: boolean }) {
    group.expanded = !group.expanded;
  }

  getRealDimensions(typeNom?: 'Petit' | 'Moyen' | 'Grand'): { label: string; surface: number } {
    const d = { 'Petit': { label: 'Petit (4m × 4m)', surface: 16 }, 'Moyen': { label: 'Moyen (4m × 8m)', surface: 32 }, 'Grand': { label: 'Grand (10m × 12m)', surface: 120 } };
    return (typeNom && d[typeNom]) ? d[typeNom] : { label: 'Inconnu', surface: 0 };
  }

  onLoyerChange(event: { box: Box; newLoyer: number }) {
    const list = this.editMode ? this.editingBoxes : this.boxs;
    const target = list.find(b => b._id === event.box._id);
    if (!target) return;
    target.loyer = event.newLoyer;
    if (this.editMode) { this.modifiedBoxIds.add(target._id); return; }
    this.boxService.updateBox(target._id, { loyer: target.loyer }).subscribe({
      next: (updated) => {
        const idx = this.boxs.findIndex(b => b._id === updated._id);
        if (idx !== -1) this.boxs[idx] = updated;
        if (this.viewMode === 'cards') this.updateStatusGroups();
      },
      error: () => { target.loyer = event.box.loyer; }
    });
  }

  private loadBoxes() {
    this.isLoading = true;
    forkJoin({
      boxes:     this.boxService.getBoxes(this.currentEtage).pipe(catchError(() => of([]))),
      contrats:  this.contratService.getContrats({ statut: 'ACTIF' }).pipe(catchError(() => of([]))),
      boutiques: this.boutiqueService.getBoutiques().pipe(catchError(() => of([]))),
      users:     this.userService.getUsers().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ boxes, contrats, boutiques, users }) => {
        this.boxs = boxes || []; this.contrats = contrats || []; this.boutiques = boutiques || []; this.users = users || [];
        this.filteredBoxes = this.getFilteredBoxes();
        this.updateStatusGroups();
        this.isLoading = false;
        this.mallMapComp?.forceRedraw();
      },
      error: () => { this.isLoading = false; }
    });
  }

  toggleEditMode() {
    if (this.editMode) {
      this.saveModifiedBoxes();
    } else {
      this.modifiedBoxIds.clear();
    }
    this.editMode = !this.editMode;
    if (this.editMode) {
      this.editingBoxes = this.boxs.filter(b => b.etage === this.currentEtage).map(b => ({ ...b }));
    } else {
      this.editingBoxes = [];
    }
    setTimeout(() => this.mallMapComp?.forceRedraw(), 0);
  }

  private saveModifiedBoxes() {
    const originalThisEtage = this.boxs.filter(b => b.etage === this.currentEtage);
    const editedThisEtage   = this.editingBoxes;
    const creationRequests: Observable<Box | null>[] = [];
    const updateRequests:   Observable<Box | null>[] = [];
    const deleteRequests:   Observable<any>[]        = [];

    originalThisEtage.forEach(orig => {
      if (!editedThisEtage.some(e => e._id === orig._id)) {
        deleteRequests.push(this.boxService.deleteBox(orig._id).pipe(catchError(() => of(null))));
      }
    });

    editedThisEtage.forEach(edit => {
      const orig = originalThisEtage.find(o => o._id === edit._id);
      if (!orig) {
        const { _id, ...payload } = edit as any;
        creationRequests.push(this.boxService.createBox(payload).pipe(tap((created: Box) => {
          const idx = this.boxs.findIndex(b => b._id === edit._id);
          if (idx !== -1) this.boxs[idx] = created; else this.boxs.push(created);
        }), catchError(() => of(null))));
      } else if (this.modifiedBoxIds.has(edit._id)) {
        updateRequests.push(this.boxService.updateBox(edit._id, edit).pipe(tap((updated: Box) => {
          const idx = this.boxs.findIndex(b => b._id === updated._id);
          if (idx !== -1) this.boxs[idx] = updated;
        }), catchError(() => of(null))));
      }
    });

    const allRequests = [...deleteRequests, ...creationRequests, ...updateRequests];
    if (allRequests.length === 0) { this.modifiedBoxIds.clear(); return; }

    forkJoin(allRequests).subscribe({
      next:  () => { this.modifiedBoxIds.clear(); this.loadBoxes(); },
      error: () => { this.modifiedBoxIds.clear(); this.loadBoxes(); }
    });
  }

  setEtage(etage: Etage) {
    if (this.currentEtage === etage) return;
    if (this.editMode) this.toggleEditMode();
    this.currentEtage = etage;
    this.loadBoxes();
  }

  addBox(size: 'PETIT' | 'MOYEN' | 'GRAND') {
    const typeMap: Record<'PETIT' | 'MOYEN' | 'GRAND', string> = { PETIT: 't1', MOYEN: 't2', GRAND: 't3' };
    const selectedType = this.types.find(t => t._id === typeMap[size]);
    if (!selectedType) return;
    const prefix = this.currentEtage === 'RC' ? 'RC' : 'FC';
    const existing = this.editingBoxes.filter(b => b.etage === this.currentEtage && b.nom?.startsWith(prefix))
      .map(b => parseInt(b.nom?.split('-')[1] || '0', 10)).filter(n => !isNaN(n));
    const nextNumber = existing.length ? Math.max(...existing) + 1 : 1;
    const newBox: Box = {
      _id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      nom: `${prefix}-${String(nextNumber).padStart(3, '0')}`,
      statut: 'LIBRE',
      x: 300 + Math.random() * 800,
      y: 150 + Math.random() * 500,
      etage: this.currentEtage,
      width: selectedType.longueur,
      height: selectedType.largeur,
      rotation: 0,
      typeNom: selectedType.nom as 'Petit' | 'Moyen' | 'Grand',
    };
    this.editingBoxes.push(newBox);
    this.mallMapComp?.forceRedraw();
  }

  onEditBox(box: Box) {}

  onStatusChange(event: { box: Box; newStatus: 'LIBRE' | 'NON_FONCTIONNEL' }) {
    const list = this.editMode ? this.editingBoxes : this.boxs;
    const target = list.find(b => b._id === event.box._id);
    if (!target) return;
    target.statut = event.newStatus;
    if (this.editMode) { this.modifiedBoxIds.add(target._id); return; }
    this.boxService.updateBox(target._id, { statut: target.statut }).subscribe({
      next: (updated) => {
        const idx = this.boxs.findIndex(b => b._id === updated._id);
        if (idx !== -1) this.boxs[idx] = updated;
        this.mallMapComp?.forceRedraw();
      }
    });
  }

  onDeleteBox(box: Box) {
    if (!this.editMode) return;
    const index = this.editingBoxes.findIndex(b => b._id === box._id);
    if (index !== -1) {
      this.editingBoxes.splice(index, 1);
      this.modifiedBoxIds.add(box._id);
      this.mallMapComp?.forceRedraw();
    }
  }

  onBoxModified(box: Box) {
    if (!this.editMode) return;
    this.modifiedBoxIds.add(box._id);
  }

  returnToMap(): void {
    this.showInteriorView = false;
    this.selectedBox = undefined;
    this.selectedType = undefined;
    this.selectedContrat = undefined;
    this.selectedBoutique = undefined;
  }
}