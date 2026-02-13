import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { Produit } from '@app/model/produit-models'; 

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.scss'
})
export class ProductCardComponent {

  produit = input.required<Produit>();
  editMode = input<boolean>(false);

  deleted = output<string>();
  updated  = output<Produit>();
  edit = output<Produit>();

  expanded = signal(false);

  toggleExpand() {
    this.expanded.update(v => !v);
  }

}