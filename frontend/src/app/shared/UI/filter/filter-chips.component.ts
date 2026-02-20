import { Component, input, output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-filter-chips',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  template: `
    <div class="filter-chips">
      <!-- Option "Tous" / reset -->
      <button 
        mat-stroked-button 
        class="chip"
        [color]="null" 
        [class.active]="!selected()"
        (click)="select.emit(null)">
        {{ allLabel() }}
      </button>

      <button 
        *ngFor="let item of items()" 
        mat-stroked-button 
        class="chip"
        [class.active]="selected() === item.value"
        (click)="select.emit(item.value)">
        {{ item.label }}
      </button>
    </div>
  `,
  styleUrls: ['./filter-chips.component.scss'],
})
export class FilterChipsComponent<T = string> {

  // Items à afficher : on passe un tableau d'objets {value, label}
  items = input.required<{ value: T; label: string }[]>();

  // Valeur actuellement sélectionnée (null = tous)
  selected = input<T | null>(null);

  // Événement quand l'utilisateur sélectionne un filtre
  select = output<T | null>();

  // Texte du bouton "Tous" (personnalisable)
  allLabel = input<string>('Tous');
}
