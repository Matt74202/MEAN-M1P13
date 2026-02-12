import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDialog } from '@angular/material/dialog';
import { FormBuilder, Validators } from '@angular/forms';

import { ProductGridComponent } from '@shared/components/product-grid/product-grid.component';
import { EditProductsToolbarComponent } from '@shared/components/edit-product-toolbar/edit-product-toolbar.component';
import { Produit } from '@app/model/produit-models';
import { FormComponent, FormField } from '@app/shared/UI/form/form.component';

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
    MatDialogModule,
  ],
  templateUrl: './boutique-home.component.html',
  styleUrl: './boutique-home.component.scss',
})
export class BoutiqueHomeComponent {

  private dialog = inject(MatDialog);

  // Données statiques pour démarrer (simule ta boutique)
 protected readonly produits = signal<Produit[]>([
  { _id: 'p1', idBoutique: 'bout1', details: { nom: 'Robe d\'été fluide', description: 'Robe légère en coton bio, parfaite pour les chaudes journées d\'Antananarivo', categorie: 'Mode femme', prix: 45000, date: new Date('2025-11-10'), }, imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400', },  { _id: 'p2', idBoutique: 'bout1', details: { nom: 'Écharpe en soie malgache', categorie: 'Accessoires', prix: 28000, description: '...', date: new Date() }, imageUrl: '...' },
  { _id: 'p3', idBoutique: 'bout1', details: { nom: 'Produit 3', categorie: 'Categorie 1', prix: 28000, description: '...', date: new Date() }, imageUrl: '...' },
  { _id: 'p4', idBoutique: 'bout1', details: { nom: 'Produit 4', categorie: 'Categorie 2', prix: 28000, description: '...', date: new Date() }, imageUrl: '...' },
  { _id: 'p5', idBoutique: 'bout1', details: { nom: 'Produit 5', categorie: 'Categorie 3', prix: 28000, description: '...', date: new Date() }, imageUrl: '...' },
  { _id: 'p6', idBoutique: 'bout1', details: { nom: 'Produit 6', categorie: 'Categorie 93', prix: 28000, description: '...', date: new Date() }, imageUrl: '...' },
  // etc.
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


  openProduitForm(produit?: Produit) {
  // ──────────────────────────────────────────────────────────────
  // Préparation des champs du formulaire
  // ──────────────────────────────────────────────────────────────
  const fields: FormField[] = [
    {
      name: 'nom',
      label: 'Nom du produit',
      type: 'text',
      required: true,
      placeholder: 'Ex: Robe d\'été fluide'
    },
    {
      name: 'description',
      label: 'Description',
      type: 'textarea',
      required: true,
      rows: 5,
      placeholder: 'Décrivez le produit en détail...'
    },
    {
      name: 'categorie',
      label: 'Catégorie',
      type: 'select',
      required: true,
      options: this.categoryItems().map(item => ({
        value: item.value,
        label: item.label
      }))
    },
    {
      name: 'prix',
      label: 'Prix (Ar)',
      type: 'number',
      required: true,
      placeholder: 'Ex: 45000'
    },
    {
      name: 'imageUrl',
      label: 'Image du produit',
      type: 'file', 
      required: false
    },
    {
      name: 'stock',
      label: 'Stock disponible',
      type: 'number',
      placeholder: '0'
    },
  ];

  // ──────────────────────────────────────────────────────────────
  // Création du FormGroup
  // ──────────────────────────────────────────────────────────────
  const fb = new FormBuilder();

  const formGroup = fb.group({
    nom: [
      produit?.details.nom || '',
      [Validators.required, Validators.minLength(3)]
    ],
    description: [
      produit?.details.description || '',
      [Validators.required, Validators.minLength(10)]
    ],
    categorie: [
      produit?.details.categorie || '',
      Validators.required
    ],
    prix: [
      produit?.details.prix || null,
      [Validators.required, Validators.min(100)]
    ],
    imageUrl: [produit?.imageUrl || ''],
    stock: [produit?.stock ?? 0, Validators.min(0)],
  });

  // ──────────────────────────────────────────────────────────────
  // Ouverture du dialog
  // ──────────────────────────────────────────────────────────────
  const dialogRef = this.dialog.open(FormComponent, {
    width: '720px',
    maxWidth: '92vw',
    maxHeight: '90vh',
    autoFocus: true,
    data: {
      title: produit ? 'Modifier le produit' : 'Ajouter un produit',
      subtitle: produit ? produit.details.nom : undefined,
      fields,
      formGroup,
      submitLabel: produit ? 'Modifier' : 'Ajouter',
      showCancel: true
    }
  });

  // ──────────────────────────────────────────────────────────────
  // Gestion de la soumission
  // ──────────────────────────────────────────────────────────────
  dialogRef.componentInstance.submit.subscribe(() => {
    if (formGroup.invalid) {
      formGroup.markAllAsTouched();
      return;
    }

    const values = formGroup.value;

    const updatedProduit: Produit = {
      _id: produit?._id || 'new-' + Date.now().toString(36),
      idBoutique: produit?.idBoutique || 'bout1',
      details: {
        nom: values.nom?.trim() || '',
        description: values.description?.trim() || '',
        categorie: values.categorie || '',
        prix: Number(values.prix),
        date: produit?.details.date || new Date(),
      },
      imageUrl: values.imageUrl?.trim() || undefined,
      stock: Number(values.stock) || 0,
    };

    this.produits.update(list => {
      if (produit) {
        return list.map(p => p._id === updatedProduit._id ? updatedProduit : p);
      }
      return [...list, updatedProduit];
    });

    dialogRef.close();
  });

  // ──────────────────────────────────────────────────────────────
  // Gestion de l'annulation
  // ──────────────────────────────────────────────────────────────
  dialogRef.componentInstance.cancel.subscribe(() => {
    dialogRef.close();
  });
}
}