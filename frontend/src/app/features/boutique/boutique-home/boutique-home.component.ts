import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';

import { ProductGridComponent } from '@shared/components/product-grid/product-grid.component';
import { EditProductsToolbarComponent } from '@shared/components/edit-product-toolbar/edit-product-toolbar.component';
import { Produit } from '@app/model/produit-models';

import { FilterChipsComponent } from '@app/shared/UI/filter/filter-chips.component'; 

@Component({
  selector: 'app-boutique-home',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatCardModule,
    FilterChipsComponent,
    ProductGridComponent,
    EditProductsToolbarComponent,
  ],
  templateUrl: './boutique-home.component.html',
  styleUrl: './boutique-home.component.scss',
})
export class BoutiqueHomeComponent {

  // Données statiques pour démarrer (simule ta boutique)
  protected readonly produits = signal<Produit[]>([
    {
      _id: 'p1',
      idBoutique: 'bout1',
      details: {
        nom: 'Robe d\'été fluide',
        description: 'Robe légère en coton bio, parfaite pour les chaudes journées d\'Antananarivo',
        categorie: 'Mode femme',
        prix: 45000,
        date: new Date('2025-11-10'),
      },
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    },
    {
      _id: 'p2',
      idBoutique: 'bout1',
      details: {
        nom: 'Écharpe en soie malgache',
        description: 'Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce uniqueMotifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique',
        categorie: 'Accessoires',
        prix: 28000,
        date: new Date(),
      },
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    },
    {
      _id: 'p3',
      idBoutique: 'bout1',
      details: {
        nom: 'Écharpe en soie malgache',
        description: 'Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce uniqueMotifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique',
        categorie: 'Categorie 1',
        prix: 28000,
        date: new Date(),
      },
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    },
    {
      _id: 'p3',
      idBoutique: 'bout1',
      details: {
        nom: 'Écharpe en soie malgache',
        description: 'Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce uniqueMotifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique',
        categorie: 'Categorie 2',
        prix: 28000,
        date: new Date(),
      },
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    },
    {
      _id: 'p3',
      idBoutique: 'bout1',
      details: {
        nom: 'Écharpe en soie malgache',
        description: 'Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce uniqueMotifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique',
        categorie: 'Categorie 3',
        prix: 28000,
        date: new Date(),
      },
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    },
    {
      _id: 'p3',
      idBoutique: 'bout1',
      details: {
        nom: 'Écharpe en soie malgache',
        description: 'Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce uniqueMotifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique',
        categorie: 'Categorie 3',
        prix: 28000,
        date: new Date(),
      },
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    },
    {
      _id: 'p3',
      idBoutique: 'bout1',
      details: {
        nom: 'Écharpe en soie malgache',
        description: 'Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce uniqueMotifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique',
        categorie: 'Categorie 3',
        prix: 28000,
        date: new Date(),
      },
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    },
    {
      _id: 'p3',
      idBoutique: 'bout1',
      details: {
        nom: 'Écharpe en soie malgache',
        description: 'Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce uniqueMotifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique',
        categorie: 'Categorie 3',
        prix: 28000,
        date: new Date(),
      },
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    },
    {
      _id: 'p3',
      idBoutique: 'bout1',
      details: {
        nom: 'Écharpe en soie malgache',
        description: 'Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce uniqueMotifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique',
        categorie: 'Categorie 3',
        prix: 28000,
        date: new Date(),
      },
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    },
    {
      _id: 'p3',
      idBoutique: 'bout1',
      details: {
        nom: 'Écharpe en soie malgache',
        description: 'Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce uniqueMotifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique',
        categorie: 'Categorie 3',
        prix: 28000,
        date: new Date(),
      },
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    },
    {
      _id: 'p3',
      idBoutique: 'bout1',
      details: {
        nom: 'Écharpe en soie malgache',
        description: 'Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce uniqueMotifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique',
        categorie: 'Categorie 3',
        prix: 28000,
        date: new Date(),
      },
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    },
    {
      _id: 'p3',
      idBoutique: 'bout1',
      details: {
        nom: 'Écharpe en soie malgache',
        description: 'Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce uniqueMotifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique',
        categorie: 'Categorie 93',
        prix: 28000,
        date: new Date(),
      },
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    },
    {
      _id: 'p3',
      idBoutique: 'bout1',
      details: {
        nom: 'Écharpe en soie malgache',
        description: 'Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce uniqueMotifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique',
        categorie: 'Categorie 73',
        prix: 28000,
        date: new Date(),
      },
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    },
    {
      _id: 'p3',
      idBoutique: 'bout1',
      details: {
        nom: 'Écharpe en soie malgache',
        description: 'Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce uniqueMotifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique',
        categorie: 'Categorie 63',
        prix: 28000,
        date: new Date(),
      },
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    },
    {
      _id: 'p3',
      idBoutique: 'bout1',
      details: {
        nom: 'Écharpe en soie malgache',
        description: 'Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce uniqueMotifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique',
        categorie: 'Categorie 03',
        prix: 28000,
        date: new Date(),
      },
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    },
    {
      _id: 'p3',
      idBoutique: 'bout1',
      details: {
        nom: 'Écharpe en soie malgache',
        description: 'Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce uniqueMotifs traditionnels faits main – pièce unique Motifs traditionnels faits main – pièce unique',
        categorie: 'Categorie 83',
        prix: 28000,
        date: new Date(),
      },
      imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400',
    },

    // Ajoute 4–8 produits pour tester l'affichage
  ]);

  editMode = signal(false);

  toggleEditMode() {
    this.editMode.update(v => !v);
  }

  onProduitDeleted(id: string) {
    this.produits.update(list => list.filter(p => p._id !== id));
  }

  onProduitUpdated(updated: Produit) {
    this.produits.update(list =>
      list.map(p => p._id === updated._id ? updated : p)
    );
  }

  // État du filtre
  selectedCategory = signal<string | null>(null);

  // Liste des catégories uniques (extraites des produits)
  private categoriesSet = computed(() => {
    const set = new Set<string>(
      this.produits().map(p => p.details.categorie).filter(Boolean) as string[]
    );
    return Array.from(set).sort();
  });

  // Format attendu par <app-filter-chips>
  categoryItems = computed(() => {
    // Récupère les catégories uniques depuis les produits
    const unique = new Set(
      this.produits().map(p => p.details.categorie).filter(Boolean)
    );

    // Transforme en format {value, label} pour filter-chips
    return Array.from(unique).map(cat => ({
      value: cat,
      label: cat
    }));
  });

  // Produits affichés (filtrés)
  filteredProduits = computed(() => {
    const cat = this.selectedCategory();
    if (cat === null) {
      return this.produits();
    }
    return this.produits().filter(p => p.details.categorie === cat);
  });

  // Handler
  onCategoryChange(value: string | null) {
    this.selectedCategory.set(value);
  }
}