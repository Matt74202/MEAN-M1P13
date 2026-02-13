// product-grid.component.ts
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductCardComponent } from '@shared/components/product-card/product-card.component';
import { Produit } from '@app/model/produit-models';

@Component({
  selector: 'app-product-grid',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  templateUrl: 'product-grid.component.html',
  styleUrl: 'product-grid.component.scss'
})
export class ProductGridComponent {
  produits = input.required<Produit[]>();
  editMode = input<boolean>(false);

  edit = output<Produit>();

  produitDeleted = output<string>();
  produitUpdated = output<Produit>();
}