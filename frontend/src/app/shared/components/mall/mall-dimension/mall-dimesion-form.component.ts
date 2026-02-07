import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

@Component({
  selector: 'app-supermarket-dimensions-form',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule
  ],
  template: `
    <div class="dimensions-form">
      <h3>Dimensions du supermarché</h3>

      <mat-form-field appearance="outline">
        <mat-label>Largeur (pixels)</mat-label>
        <input matInput type="number"
               [(ngModel)]="dimensions.largeur"
               min="800" step="10">
      </mat-form-field>

      <mat-form-field appearance="outline">
        <mat-label>Hauteur (pixels)</mat-label>
        <input matInput type="number"
               [(ngModel)]="dimensions.hauteur"
               min="500" step="10">
      </mat-form-field>

      <div class="actions">
        <button mat-button (click)="cancel.emit()">Annuler</button>
        <button mat-raised-button color="primary" (click)="onSave()">Enregistrer</button>
      </div>
    </div>
  `,
  styles: [`
    .dimensions-form { background: white; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.25); padding: 24px; width: 340px; }
    h3 { margin: 0 0 20px; font-size: 1.2rem; }
    mat-form-field { width: 100%; margin-bottom: 16px; }
    .actions { display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px; }
  `]
})
export class SupermarketDimensionsFormComponent {
  @Input() dimensions: { largeur: number; hauteur: number } = { largeur: 1400, hauteur: 900 };

  @Output() save = new EventEmitter<{ largeur: number; hauteur: number }>();
  @Output() cancel = new EventEmitter<void>();

  onSave() {
    this.save.emit({ ...this.dimensions });
  }
}