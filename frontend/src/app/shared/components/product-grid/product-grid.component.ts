import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductCardComponent } from '@shared/components/product-card/product-card.component';
import { Produit } from '@app/model/produit-models';
import { Promotion } from '@app/services/promotion.service';

@Component({
  selector: 'app-product-grid',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  templateUrl: 'product-grid.component.html',
  styleUrl: 'product-grid.component.scss'
})
export class ProductGridComponent {
  produits          = input.required<Produit[]>();
  editMode          = input<boolean>(false);
  promotionsMap = input<Record<string, Promotion>>({});

  edit           = output<Produit>();
  produitDeleted = output<string>();
  produitUpdated = output<Produit>();
  promo          = output<Produit>();
  stopPromo      = output<Produit>();

  getPromotion(produitId: string): Promotion | null {
    return this.promotionsMap()[produitId] ?? null;
  }

  
}