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
    { _id: 't1', nom: 'Petit', longueur: 80, largeur: 60, nbEtagereGauche: 1, nbEtagereDroite: 1 },
    { _id: 't2', nom: 'Moyen', longueur: 140, largeur: 100, nbEtagereGauche: 2, nbEtagereDroite: 2 },
    { _id: 't3', nom: 'Grand', longueur: 200, largeur: 140, nbEtagereGauche: 3, nbEtagereDroite: 3 },
  ];

  protected boxs: Box[] = [
    { _id: 'RC-A01', idType: 't1', statut: 'LIBRE',  loyer: 148000, x:  60, y:  60,  etage: 'RC' },
    { _id: 'RC-A02', idType: 't2', statut: 'OCCUPE', loyer: 242000, x:  60, y: 160,  etage: 'RC' },
    { _id: 'RC-A03', idType: 't3', statut: 'LIBRE',  loyer: 385000, x:  60, y: 280,  etage: 'RC' },
    { _id: 'RC-A04', idType: 't1', statut: 'OCCUPE', loyer: 155000, x:  60, y: 440,  etage: 'RC' },

    { _id: 'RC-B01', idType: 't2', statut: 'LIBRE',  loyer: 248000, x: 1100, y:  60, etage: 'RC' },
    { _id: 'RC-B02', idType: 't1', statut: 'OCCUPE', loyer: 145000, x: 1100, y: 180, etage: 'RC' },
    { _id: 'RC-B03', idType: 't3', statut: 'OCCUPE', loyer: 395000, x: 1100, y: 300, etage: 'RC' },
    { _id: 'RC-B04', idType: 't3', statut: 'LIBRE',  loyer: 525000, x: 1280, y:  60, etage: 'RC' },
    { _id: 'RC-B05', idType: 't2', statut: 'OCCUPE', loyer: 258000, x: 1280, y: 240, etage: 'RC' },
    { _id: 'RC-B06', idType: 't1', statut: 'LIBRE',  loyer: 153000, x: 1280, y: 380, etage: 'RC' },

    { _id: 'FC-A01', idType: 't1', statut: 'LIBRE', loyer: 158000, x: 40, y: 40, etage: 'FC' },
    { _id: 'FC-A02', idType: 't2', statut: 'LIBRE', loyer: 262000, x: 40, y: 120, etage: 'FC' },
    { _id: 'FC-A03', idType: 't3', statut: 'NON_FONCTIONNEL', loyer: 395000, x: 40, y: 260, etage: 'FC' },
    { _id: 'FC-A04', idType: 't1', statut: 'LIBRE', loyer: 165000, x: 40, y: 430, etage: 'FC' },

    { _id: 'FC-A05', idType: 't2', statut: 'LIBRE', loyer: 265000, x: 260, y: 40, etage: 'FC' },
  ];

  protected readonly boutiques: Boutique[] = [
    { _id: 'bout1', nom: 'Mode Plus', typeCommerce: 'Mode' },
    { _id: 'bout2', nom: 'Tech Shop', typeCommerce: 'Électronique' },
    { _id: 'bout3', nom: 'Beauty Care', typeCommerce: 'Cosmétique' },
    { _id: 'bout4', nom: 'Food Corner', typeCommerce: 'Alimentation' },
    { _id: 'bout5', nom: 'Book World', typeCommerce: 'Librairie' },
    { _id: 'bout6', nom: 'Sport Gear', typeCommerce: 'Sport' },
    { _id: 'bout7', nom: 'Home Style', typeCommerce: 'Maison' },
    { _id: 'bout8', nom: 'Toys Fun', typeCommerce: 'Jouets' },
    { _id: 'bout9', nom: 'Jewel Shine', typeCommerce: 'Bijouterie' },
    { _id: 'bout10', nom: 'Cafe Break', typeCommerce: 'Restauration' },
  ];

  protected readonly contrats: Contrat[] = [
    { _id: 'cont1', idBoutique: 'bout1', idBox: 'RC-A02', duree: 12, dateDebut: new Date('2023-01-01'), dateFin: new Date('2023-12-31'), statut: 'ACTIF' },
    { _id: 'cont2', idBoutique: 'bout2', idBox: 'RC-A04', duree: 24, dateDebut: new Date('2023-06-01'), dateFin: new Date('2025-05-31'), statut: 'ACTIF' },
  ];

  showInteriorView = false;
  selectedBox?: Box;
  selectedType?: TypeBoutique;
  selectedContrat?: Contrat;
  selectedBoutique?: Boutique;

  editMode = false;
  currentEtage: Etage = 'RC';

  toggleEditMode() {
    this.editMode = !this.editMode;
  }

  setEtage(etage: Etage) {
    this.currentEtage = etage;
  }

  onEditBox(box: Box) {
    console.log('Modifier la box :', box);
    alert(`Modifier la box ${box._id} (${box.statut})`);
  }

  onStatusChange(event: { box: Box; newStatus: 'LIBRE' | 'NON_FONCTIONNEL' }) {
    console.log('ONSTATUSCHANGE PARENT REÇU !', event.box._id, event.newStatus);

    const boxToUpdate = this.boxs.find(b => b._id === event.box._id);
    if (boxToUpdate) {
      boxToUpdate.statut = event.newStatus;
      this.mallMapComp?.forceRedraw();
    }
  }

  enterInteriorView(box: Box): void {
    const type = this.types.find(t => t._id === box.idType);
    if (!type) return;

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