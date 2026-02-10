import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { MallMapComponent } from '@app/shared/components/mall-map/mall-map.component';
import { BoxInteriorComponent } from '@app/shared/components/box-interior/box-interior.component';

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
    BoxInteriorComponent
  ],
  templateUrl: './mall-overview.component.html',
  styleUrl: './mall-overview.component.scss',
})
export class MallCanvasComponent {

  @ViewChild(MallMapComponent) mallMapComp?: MallMapComponent;

  protected readonly types: TypeBoutique[] = [
    { _id: 't1', nom: 'Petit', longueur: 140, largeur: 140, nbEtagereGauche: 1, nbEtagereDroite: 1 }, //4*4
    { _id: 't2', nom: 'Moyen', longueur: 140, largeur: 200, nbEtagereGauche: 2, nbEtagereDroite: 2 }, //4*8
    { _id: 't3', nom: 'Grand', longueur: 200, largeur: 250, nbEtagereGauche: 3, nbEtagereDroite: 3 }, //10*12
  ];

  protected boxs: Box[] = [];

  protected editingBoxes: Box[] = [];

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

  toggleEditMode() {
    if (this.editMode) {
      this.saveEditingChanges();
    }

    this.editMode = !this.editMode;

    if (this.editMode) {
      this.editingBoxes = this.boxs
        .filter(b => b.etage === this.currentEtage)
        .map(b => ({ ...b }));
    } else {
      this.editingBoxes = [];
    }

    this.mallMapComp?.forceRedraw();
  }

  private saveEditingChanges() {
    const otherEtages = this.boxs.filter(b => b.etage !== this.currentEtage);
    this.boxs = [...otherEtages, ...this.editingBoxes];
  }

  setEtage(etage: Etage) {
    if (this.currentEtage === etage) return;
    
    if (this.editMode) {
      this.toggleEditMode();
    }

    this.currentEtage = etage;

    if (this.editMode) {
      this.toggleEditMode();
    }
  }

  addBox(size: 'PETIT' | 'MOYEN' | 'GRAND') {
    const typeMap: Record<'PETIT' | 'MOYEN' | 'GRAND', string> = {
      'PETIT': 't1',
      'MOYEN': 't2',
      'GRAND': 't3'
    };

    const selectedType = this.types.find(t => t._id === typeMap[size]);

    if (!selectedType) {
      console.error(`Type non trouvé pour la taille ${size}`);
      return;
    }

    const newBox: Box = {
      _id: `box-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      statut: 'LIBRE',
      x: 300 + Math.random() * 800,
      y: 150 + Math.random() * 500,
      etage: this.currentEtage,
      width: selectedType.longueur,
      height: selectedType.largeur,
      rotation: 0,
      idType: selectedType._id,  // utile pour l'intérieur plus tard
    };

    this.editingBoxes.push(newBox);
    this.mallMapComp?.forceRedraw();
  }

  onEditBox(box: Box) {
    console.log('Modifier box:', box);
  }

  onStatusChange(event: { box: Box; newStatus: 'LIBRE' | 'NON_FONCTIONNEL' }) {
    const list = this.editMode ? this.editingBoxes : this.boxs;
    const target = list.find(b => b._id === event.box._id);
    if (target) {
      target.statut = event.newStatus;
    }
  }

  onDeleteBox(box: Box) {
    if (!this.editMode) return;

    const index = this.editingBoxes.findIndex(b => b._id === box._id);
    if (index !== -1) {
      this.editingBoxes.splice(index, 1);
      this.mallMapComp?.forceRedraw();
    }
  }

  enterInteriorView(box: Box): void {
    let type: TypeBoutique;

    if (box.idType) {
      type = this.types.find(t => t._id === box.idType)!;
    } else {
      type = {
        _id: 'custom',
        nom: 'Personnalisé',
        longueur: box.width || 140,
        largeur: box.height || 100,
        nbEtagereGauche: 2,
        nbEtagereDroite: 2,
      };
    }

    const contrat = this.contrats.find(c => c.idBox === box._id && c.statut === 'ACTIF');
    const boutique = contrat ? this.boutiques.find(b => b._id === contrat.idBoutique) : undefined;

    this.selectedBox = box;
    this.selectedType = type;
    this.selectedContrat = contrat;
    this.selectedBoutique = boutique;

    this.showInteriorView = true;
  }

  returnToMap(): void {
    this.showInteriorView = false;
    this.selectedBox = undefined;
    this.selectedType = undefined;
    this.selectedContrat = undefined;
    this.selectedBoutique = undefined;
  }
}