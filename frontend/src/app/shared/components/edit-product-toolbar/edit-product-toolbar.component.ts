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
      <button mat-raised-button color="accent" (click)="toggleEdit.emit()">
        <mat-icon>{{ editMode() ? 'close' : 'edit' }}</mat-icon>
        {{ editMode() ? 'Quitter édition' : 'Gérer mes produits' }}
      </button>

      @if (editMode()) {
        <button mat-stroked-button color="primary">
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
    }
  `]
})
export class EditProductsToolbarComponent {
  editMode = input<boolean>(false);
  toggleEdit = output<void>();
}