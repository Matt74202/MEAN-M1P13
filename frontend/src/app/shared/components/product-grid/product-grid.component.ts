// product-grid.component.ts
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductCardComponent } from '@shared/components/product-card/product-card.component';
import { Produit } from '@app/model/produit-models';

@Component({
  selector: 'app-product-grid',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  template: `
    <div class="products-grid">
      @for (p of produits(); track p._id) {
        <app-product-card
          [produit]="p"
          [editMode]="editMode()"
          (deleted)="produitDeleted.emit(p._id)"
          (updated)="produitUpdated.emit($event)"
        />
      } @empty {
        <div class="empty-state">
          <h3>Aucun produit pour le moment</h3>
        </div>
      }
    </div>
  `,
  styles: [`
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1.5rem;
    }
    .empty-state {
      grid-column: 1 / -1;
      text-align: center;
      padding: 4rem 1rem;
      color: #7d936c;
    }
  `]
})
export class ProductGridComponent {
  produits = input.required<Produit[]>();
  editMode = input<boolean>(false);

  produitDeleted = output<string>();
  produitUpdated = output<Produit>();
}