import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { forkJoin, of, Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

import { MallMapComponent } from '@app/shared/components/mall-map/mall-map.component';
import { BoxService } from '@app/services/box.service';

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

  protected boxs: Box[] = [];             // données officielles (de l'API)
  protected editingBoxes: Box[] = [];     // copie temporaire modifiable

  protected readonly boutiques: Boutique[] = [
    { _id: 'bout1', nom: 'Mode Plus', typeCommerce: 'Mode' },
    { _id: 'bout2', nom: 'Tech Shop', typeCommerce: 'Électronique' },
    { _id: 'bout3', nom: 'Beauty Care', typeCommerce: 'Cosmétique' },
    { _id: 'bout4', nom: 'Food Corner', typeCommerce: 'Alimentation' },
  ];

  protected readonly contrats: Contrat[] = [];

  showInteriorView = false;
  selectedBox?: Box;
  selectedType?: TypeBoutique;
  selectedContrat?: Contrat;
  selectedBoutique?: Boutique;

  editMode = false;
  currentEtage: Etage = 'RC';

  isLoading = false;

  constructor(private boxService: BoxService) {
    this.loadBoxes();
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
    // On quitte le mode édition → sauvegarde
    this.saveChangesToDatabase();
  }

  this.editMode = !this.editMode;

  if (this.editMode) {
    // Entrée en mode édition
    this.editingBoxes = this.boxs
      .filter(b => b.etage === this.currentEtage)
      .map(b => ({ ...b }));
  } else {
    // Sortie du mode édition → on ne montre que boxs
    this.editingBoxes = [];
  }

  // Force redraw du template avec les bonnes données
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

  // 🔴 Suppressions
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

  // 🟢 Créations / Mises à jour
  editedThisEtage.forEach(edit => {
    const orig = originalThisEtage.find(o => o._id === edit._id);

    // ➕ Création
    if (!orig) {
      const { _id, ...payload } = edit as any; // on enlève _id
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

    // ✏️ Mise à jour (toujours)
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

  // 🔄 Exécute toutes les requêtes et recharge boxes après
  forkJoin([...deleteRequests, ...creationRequests, ...updateRequests]).subscribe({
  next: () => {
    console.log('[MALL] Toutes les requêtes terminées → rechargement des boxes');
    this.loadBoxes();
    // 🔹 Force l'UI à détecter les changements
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
      this.toggleEditMode(); // force sauvegarde
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

    // 🔹 Update immédiat sur le backend
    this.boxService.updateBox(target._id, { statut: target.statut }).subscribe({
      next: (updated) => {
        // Met à jour boxs pour que l'UI reflète le changement
        const idx = this.boxs.findIndex(b => b._id === updated._id);
        if (idx !== -1) this.boxs[idx] = updated;

        // Force redraw
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