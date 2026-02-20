import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { Produit } from '@app/model/produit-models';
import { Promotion } from '@app/services/promotion.service';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss'
})
export class ProductCardComponent {

  produit    = input.required<Produit>();
  editMode   = input<boolean>(false);
  promotion  = input<Promotion | null>(null); 

  deleted   = output<string>();
  updated   = output<Produit>();
  edit      = output<Produit>();
  promo     = output<Produit>();    
  stopPromo = output<Produit>();   

  expanded = signal(false);

  toggleExpand() {
    this.expanded.update(v => !v);
  }

  get prixPromo(): number {
    const p = this.promotion();
    if (!p) return this.produit().details.prix;
    return Math.round(this.produit().details.prix * (1 - p.details.pourcentage / 100));
  }
}