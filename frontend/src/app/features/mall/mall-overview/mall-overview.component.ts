import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { forkJoin, of, Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { MallMapComponent } from '@app/shared/components/mall-map/mall-map.component';
import { FilterChipsComponent } from '@shared/UI/filter/filter-chips.component';
import { BoxService } from '@app/services/box.service';
import { ContratService } from '@app/services/contrat.service';
import { BoutiqueService } from '@app/services/boutique.service';

import { TypeBoutique, Box, Boutique, Contrat, Etage } from '@app/model/mall-models';

@Component({
  selector: 'app-mall-canvas',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MallMapComponent,
    FilterChipsComponent,
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

  protected boutiques: Boutique[] = [];
  protected contrats: Contrat[] = [];

  // 🆕 Filtre par type de commerce
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

  constructor(
    private boxService: BoxService,
    private contratService: ContratService,
    private boutiqueService: BoutiqueService
  ) {
    this.loadData();
  }

  /**
   * Charge les boxes, contrats et boutiques
   */
  private loadData() {
    this.isLoading = true;
    console.log(`[MALL] Chargement des données pour l'étage : ${this.currentEtage}`);

    forkJoin({
      boxes: this.boxService.getBoxes(this.currentEtage).pipe(catchError(() => of([]))),
      contrats: this.contratService.getContrats({ statut: 'ACTIF' }).pipe(catchError(() => of([]))),
      boutiques: this.boutiqueService.getBoutiques().pipe(catchError(() => of([])))
    }).subscribe({
      next: ({ boxes, contrats, boutiques }) => {
        console.log('[MALL] Données reçues :', { 
          boxes: boxes.length, 
          contrats: contrats.length, 
          boutiques: boutiques.length 
        });
        this.boxs = boxes || [];
        this.contrats = contrats || [];
        this.boutiques = boutiques || [];
        
        // 🆕 Générer les options de filtre
        this.generateTypeCommerceOptions();
        
        this.isLoading = false;
        this.mallMapComp?.forceRedraw();
      },
      error: (err) => {
        console.error('[MALL] Erreur chargement données :', err);
        this.isLoading = false;
        this.boxs = [];
        this.contrats = [];
        this.boutiques = [];
      }
    });
  }

  /**
   * 🆕 Génère les options de filtre à partir des types de commerce présents
   */
  private generateTypeCommerceOptions() {
    // Récupérer tous les types de commerce uniques des boutiques
    const typesSet = new Set<string>();
    
    this.boutiques.forEach(b => {
      if (b.typeCommerce) {
        typesSet.add(b.typeCommerce);
      }
    });

    // Convertir en tableau d'options triées
    this.typeCommerceOptions = Array.from(typesSet)
      .sort()
      .map(type => ({
        value: type,
        label: type
      }));

    console.log('[MALL] Options de filtre générées:', this.typeCommerceOptions);
  }

  /**
   * 🆕 Gère le changement de filtre
   */
  onTypeCommerceFilterChange(typeCommerce: string | null) {
    this.selectedTypeCommerce = typeCommerce;
    console.log('[MALL] Filtre changé:', typeCommerce || 'Tous');
    this.mallMapComp?.forceRedraw();
  }

  /**
   * 🆕 Retourne les boxes filtrées selon le type de commerce sélectionné
   */
  getFilteredBoxes(): Box[] {
    if (!this.selectedTypeCommerce) {
      // Pas de filtre = toutes les boxes
      return this.editMode ? this.editingBoxes : this.boxs;
    }

    // Filtrer les boxes qui ont un contrat actif avec une boutique du type sélectionné
    const boxesToFilter = this.editMode ? this.editingBoxes : this.boxs;
    
    return boxesToFilter.filter(box => {
      // Trouver le contrat actif pour cette box
      const contrat = this.contrats.find(c => {
        const contratBoxId = c.idBox?.toString() || c.idBox;
        const boxId = box._id?.toString() || box._id;
        return contratBoxId === boxId && c.statut === 'ACTIF';
      });

      if (!contrat) return false;

      // Trouver la boutique associée au contrat
      const boutique = this.boutiques.find(b => {
        const boutiqueId = b._id?.toString() || b._id;
        const contratBoutiqueId = contrat.idBoutique?.toString() || contrat.idBoutique;
        return boutiqueId === contratBoutiqueId;
      });

      if (!boutique) return false;

      // Vérifier si le type de commerce correspond
      return boutique.typeCommerce === this.selectedTypeCommerce;
    });
  }

  private loadBoxes() {
    this.isLoading = true;
    console.log(`[MALL] Chargement des boxes pour l'étage : ${this.currentEtage}`);

    this.boxService.getBoxes(this.currentEtage).subscribe({
      next: (data) => {
        console.log('[MALL] Boxes reçues de l\'API :', data);
        console.log('[MALL] Nombre total de boxes chargées :', data?.length ?? 0);
        this.boxs = data || [];
        this.isLoading = false;
        this.mallMapComp?.forceRedraw();
      },
      error: (err) => {
        console.error('[MALL] Erreur chargement boxes :', err);
        this.isLoading = false;
        this.boxs = [];
      }
    });
  }

  toggleEditMode() {
    if (this.editMode) {
      this.saveChangesToDatabase();
    }

    this.editMode = !this.editMode;

    if (this.editMode) {
      this.editingBoxes = this.boxs
        .filter(b => b.etage === this.currentEtage)
        .map(b => ({ ...b }));
    } else {
      this.editingBoxes = [];
    }

    setTimeout(() => {
      this.mallMapComp?.forceRedraw();
    }, 0);
  }

  private saveChangesToDatabase() {
    const originalThisEtage = this.boxs.filter(b => b.etage === this.currentEtage);
    const editedThisEtage = this.editingBoxes;

    console.log('[MALL] Sauvegarde → original :', originalThisEtage.length, 'modifiées :', editedThisEtage.length);

    const creationRequests: Observable<Box | null>[] = [];
    const updateRequests: Observable<Box | null>[] = [];
    const deleteRequests: Observable<any>[] = [];

    originalThisEtage.forEach(orig => {
      if (!editedThisEtage.some(e => e._id === orig._id)) {
        console.log('[MALL] Suppression détectée :', orig._id);
        deleteRequests.push(
          this.boxService.deleteBox(orig._id).pipe(
            catchError((err: any) => {
              console.error('[MALL] Échec suppression', orig._id, err);
              return of(null);
            })
          )
        );
      }
    });

    editedThisEtage.forEach(edit => {
      const orig = originalThisEtage.find(o => o._id === edit._id);

      if (!orig) {
        const { _id, ...payload } = edit as any;
        console.log('[MALL] Création nouvelle box :', payload.nom);
        creationRequests.push(
          this.boxService.createBox(payload).pipe(
            tap((created: Box) => {
              console.log('[MALL] Box créée avec ID réel :', created._id);
              const idx = this.boxs.findIndex(b => b._id === edit._id);
              if (idx !== -1) this.boxs[idx] = created;
              else this.boxs.push(created);
            }),
            catchError((err: any) => {
              console.error('[MALL] Échec création', err);
              return of(null);
            })
          )
        );
      } else {
        console.log('[MALL] Mise à jour détectée :', edit._id);
        updateRequests.push(
          this.boxService.updateBox(edit._id, edit).pipe(
            tap((updated: Box) => {
              const idx = this.boxs.findIndex(b => b._id === updated._id);
              if (idx !== -1) this.boxs[idx] = updated;
            }),
            catchError((err: any) => {
              console.error('[MALL] Échec mise à jour', edit._id, err);
              return of(null);
            })
          )
        );
      }
    });

    forkJoin([...deleteRequests, ...creationRequests, ...updateRequests]).subscribe({
      next: () => {
        console.log('[MALL] Toutes les requêtes terminées → rechargement des boxes');
        this.loadBoxes();
        this.boxs = [...this.boxs];
      },
      error: (err) => {
        console.error('[MALL] Erreur pendant la sauvegarde', err);
        this.loadBoxes();
        this.boxs = [...this.boxs];
      }
    });
  }

  setEtage(etage: Etage) {
    if (this.currentEtage === etage) return;

    console.log('[MALL] Changement d\'étage vers :', etage);

    if (this.editMode) {
      this.toggleEditMode();
    }

    this.currentEtage = etage;
    this.loadBoxes();

    if (this.editMode) {
      this.toggleEditMode();
    }
  }

  addBox(size: 'PETIT' | 'MOYEN' | 'GRAND') {
    const typeMap: Record<'PETIT' | 'MOYEN' | 'GRAND', string> = {
      PETIT: 't1',
      MOYEN: 't2',
      GRAND: 't3'
    };

    const selectedType = this.types.find(t => t._id === typeMap[size]);
    if (!selectedType) return;

    const prefix = this.currentEtage === 'RC' ? 'RC' : 'FC';

    const existing = this.editingBoxes
      .filter(b => b.etage === this.currentEtage && b.nom?.startsWith(prefix))
      .map(b => parseInt(b.nom?.split('-')[1] || '0', 10))
      .filter(n => !isNaN(n));

    const nextNumber = existing.length ? Math.max(...existing) + 1 : 1;
    const formatted = String(nextNumber).padStart(3, '0');

    const newBox: Box = {
      _id: `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      nom: `${prefix}-${formatted}`,
      statut: 'LIBRE',
      x: 300 + Math.random() * 800,
      y: 150 + Math.random() * 500,
      etage: this.currentEtage,
      width: selectedType.longueur,
      height: selectedType.largeur,
      rotation: 0,
      typeNom: selectedType.nom as 'Petit' | 'Moyen' | 'Grand',
    };

    console.log('[MALL] Ajout box locale (temporaire) :', newBox.nom);
    this.editingBoxes.push(newBox);
    this.mallMapComp?.forceRedraw();
  }

  onEditBox(box: Box) {
    console.log('[MALL] onEditBox :', box);
  }

  onStatusChange(event: { box: Box; newStatus: 'LIBRE' | 'NON_FONCTIONNEL' }) {
    const list = this.editMode ? this.editingBoxes : this.boxs;
    const target = list.find(b => b._id === event.box._id);
    if (!target) return;

    target.statut = event.newStatus;
    console.log('[MALL] Statut changé localement :', event.newStatus);

    this.boxService.updateBox(target._id, { statut: target.statut }).subscribe({
      next: (updated) => {
        const idx = this.boxs.findIndex(b => b._id === updated._id);
        if (idx !== -1) this.boxs[idx] = updated;

        this.mallMapComp?.forceRedraw();
        console.log('[MALL] Statut mis à jour sur le serveur');
      },
      error: (err) => {
        console.error('[MALL] Échec mise à jour statut', err);
      }
    });
  }

  onDeleteBox(box: Box) {
    if (!this.editMode) return;

    const index = this.editingBoxes.findIndex(b => b._id === box._id);
    if (index !== -1) {
      console.log('[MALL] Suppression locale :', box.nom);
      this.editingBoxes.splice(index, 1);
      this.mallMapComp?.forceRedraw();
    }
  }

  returnToMap(): void {
    this.showInteriorView = false;
    this.selectedBox = undefined;
    this.selectedType = undefined;
    this.selectedContrat = undefined;
    this.selectedBoutique = undefined;
  }
}