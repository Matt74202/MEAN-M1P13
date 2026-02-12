import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-edit-products-toolbar',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="edit-toolbar">
      <button mat-raised-button (click)="toggleEdit.emit()">
        <mat-icon>{{ editMode() ? 'close' : 'edit' }}</mat-icon>
        {{ editMode() ? 'Quitter édition' : 'Gérer mes produits' }}
      </button>

      @if (editMode()) {
        <button mat-stroked-button (click)="addProduit.emit()">
          <mat-icon>add</mat-icon> Ajouter produit
        </button>
      }
    </div>
  `,
  styles: [`
    .edit-toolbar {
      display: flex;
      gap: 1rem;
      align-items: center;

      // Tous les boutons raised en noir
      button[mat-raised-button] {
        background-color: #222222 !important;
        color: white !important;

        &:hover {
          background-color: #000000 !important;
        }
      }

      // Tous les boutons stroked avec bordure noire
      button[mat-stroked-button] {
        border-color: #222222 !important;
        color: #222222 !important;
        background-color: transparent !important;

        &:hover {
          border-color: #000000 !important;
          background-color: #f5f5f5 !important;
        }
      }
    }
  `]
})
export class EditProductsToolbarComponent {
  editMode   = input<boolean>(false);
  toggleEdit = output<void>();
  addProduit = output<void>();      
}