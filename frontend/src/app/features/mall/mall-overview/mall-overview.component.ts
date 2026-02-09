import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';      
import { MatIconModule } from '@angular/material/icon';           
import { MatTooltipModule } from '@angular/material/tooltip';

import * as PIXI from 'pixi.js';

import { MallMapComponent } from '@app/shared/components/mall-map/mall-map.component';          
import { BoxInteriorComponent } from '@app/shared/components/box-interior/box-interior.component'; 


import { TypeBoutique, Box, Boutique, Contrat } from '@app/model/mall-models'; 

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

  protected readonly types: TypeBoutique[] = [
    { _id: 't1', nom: 'Petit',  longueur: 80,  largeur: 60,  nbEtagereGauche: 1, nbEtagereDroite: 1 },
    { _id: 't2', nom: 'Moyen',  longueur: 140, largeur: 100, nbEtagereGauche: 2, nbEtagereDroite: 2 },
    { _id: 't3', nom: 'Grand',  longueur: 200, largeur: 140, nbEtagereGauche: 3, nbEtagereDroite: 3 },
  ];

  protected boxs: Box[] = [
    { _id: 'A01', idType: 't1', statut: 'LIBRE',  loyer: 148000, x: 40,  y: 40  },
    { _id: 'A02', idType: 't2', statut: 'OCCUPE', loyer: 242000, x: 40,  y: 120 },
    { _id: 'A03', idType: 't3', statut: 'LIBRE',  loyer: 385000, x: 40,  y: 260 },
    { _id: 'A04', idType: 't1', statut: 'OCCUPE', loyer: 155000, x: 40,  y: 430 },

    { _id: 'A05', idType: 't2', statut: 'LIBRE',  loyer: 255000, x: 260, y: 40  },
    { _id: 'A06', idType: 't1', statut: 'OCCUPE', loyer: 152000, x: 260, y: 160 },
    { _id: 'A07', idType: 't3', statut: 'LIBRE',  loyer: 518000, x: 260, y: 260 },

    { _id: 'A08', idType: 't2', statut: 'OCCUPE', loyer: 260000, x: 500, y: 40  },
    { _id: 'A09', idType: 't3', statut: 'LIBRE',  loyer: 402000, x: 500, y: 200 },
    { _id: 'A10', idType: 't1', statut: 'LIBRE',  loyer: 150000, x: 500, y: 370 },

    { _id: 'B01', idType: 't2', statut: 'LIBRE',  loyer: 248000, x: 760, y: 40  },
    { _id: 'B02', idType: 't1', statut: 'OCCUPE', loyer: 145000, x: 760, y: 160 },
    { _id: 'B03', idType: 't3', statut: 'OCCUPE', loyer: 395000, x: 760, y: 260 },

    { _id: 'B04', idType: 't3', statut: 'LIBRE',  loyer: 525000, x: 1020, y: 40  },
    { _id: 'B05', idType: 't2', statut: 'OCCUPE', loyer: 258000, x: 1020, y: 220 },
    { _id: 'B06', idType: 't1', statut: 'LIBRE',  loyer: 153000, x: 1020, y: 360 },

    { _id: 'B07', idType: 't2', statut: 'LIBRE',  loyer: 262000, x: 1280, y: 40  },
    { _id: 'B08', idType: 't3', statut: 'OCCUPE', loyer: 410000, x: 1280, y: 220 },
    { _id: 'B09', idType: 't1', statut: 'LIBRE',  loyer: 149000, x: 1280, y: 380 },

    { _id: 'C01', idType: 't2', statut: 'LIBRE',  loyer: 270000, x: 1540, y: 80  },
    { _id: 'C02', idType: 't3', statut: 'OCCUPE', loyer: 540000, x: 1540, y: 260 },
  ];


  protected readonly boutiques: Boutique[] = [
    { _id: 'bout1', nom: 'Mode Plus',     typeCommerce: 'Mode' },
    { _id: 'bout2', nom: 'Tech Shop',     typeCommerce: 'Électronique' },
    { _id: 'bout3', nom: 'Beauty Care',   typeCommerce: 'Cosmétique' },
    { _id: 'bout4', nom: 'Food Corner',   typeCommerce: 'Alimentation' },
    { _id: 'bout5', nom: 'Book World',    typeCommerce: 'Librairie' },
    { _id: 'bout6', nom: 'Sport Gear',    typeCommerce: 'Sport' },
    { _id: 'bout7', nom: 'Home Style',    typeCommerce: 'Maison' },
    { _id: 'bout8', nom: 'Toys Fun',      typeCommerce: 'Jouets' },
    { _id: 'bout9', nom: 'Jewel Shine',   typeCommerce: 'Bijouterie' },
    { _id: 'bout10', nom: 'Cafe Break',   typeCommerce: 'Restauration' },
  ];

  protected readonly contrats: Contrat[] = [
    { _id: 'cont1', idBoutique: 'bout1', idBox: 'A02', duree: 12, dateDebut: new Date('2023-01-01'), dateFin: new Date('2023-12-31'), statut: 'ACTIF' },
    { _id: 'cont2', idBoutique: 'bout2', idBox: 'A04', duree: 24, dateDebut: new Date('2023-06-01'), dateFin: new Date('2025-05-31'), statut: 'ACTIF' },
    { _id: 'cont3', idBoutique: 'bout3', idBox: 'A06', duree: 6,  dateDebut: new Date('2024-01-01'), dateFin: new Date('2024-06-30'), statut: 'ACTIF' },
    { _id: 'cont4', idBoutique: 'bout4', idBox: 'A08', duree: 18, dateDebut: new Date('2023-03-01'), dateFin: new Date('2024-08-31'), statut: 'ACTIF' },
    { _id: 'cont5', idBoutique: 'bout5', idBox: 'B02', duree: 12, dateDebut: new Date('2024-02-01'), dateFin: new Date('2025-01-31'), statut: 'ACTIF' },
    { _id: 'cont6', idBoutique: 'bout6', idBox: 'B03', duree: 36, dateDebut: new Date('2022-01-01'), dateFin: new Date('2024-12-31'), statut: 'ACTIF' },
    { _id: 'cont7', idBoutique: 'bout7', idBox: 'B05', duree: 12, dateDebut: new Date('2023-07-01'), dateFin: new Date('2024-06-30'), statut: 'ACTIF' },
    { _id: 'cont8', idBoutique: 'bout8', idBox: 'B08', duree: 24, dateDebut: new Date('2023-04-01'), dateFin: new Date('2025-03-31'), statut: 'ACTIF' },
    { _id: 'cont9', idBoutique: 'bout9', idBox: 'C02', duree: 6,  dateDebut: new Date('2024-03-01'), dateFin: new Date('2024-08-31'), statut: 'ACTIF' },
  ];


  showInteriorView = false;
  selectedBox?: Box;
  selectedType?: TypeBoutique;
  selectedContrat?: Contrat;
  selectedBoutique?: Boutique;

  editMode = false;

  toggleEditMode() {
    this.editMode = !this.editMode;
  }

  onEditBox(box: Box) {
    // Ici tu pourras ouvrir un formulaire de modification
    console.log('Modifier la box :', box);
    
    // Exemple futur : ouvrir un dialog
    // this.dialog.open(BoxEditDialogComponent, { data: box });
    
    // Pour le moment on peut juste afficher une alerte ou log
    alert(`Modifier la box ${box._id} (${box.statut})`);
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

  onStatusChange(event: { box: Box; newStatus: 'LIBRE' | 'NON_FONCTIONNEL' }) {
    const boxToUpdate = this.boxs.find(b => b._id === event.box._id);
    if (boxToUpdate) {
      boxToUpdate.statut = event.newStatus;
      // Force Angular à détecter le changement (optionnel si OnPush)
      this.boxs = [...this.boxs]; 
      console.log(`Box ${boxToUpdate._id} passée à ${boxToUpdate.statut}`);
    }
  }
}