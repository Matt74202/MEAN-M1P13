import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { FormBuilder, Validators } from '@angular/forms';

import { ProductGridComponent } from '@shared/components/product-grid/product-grid.component';
import { EditProductsToolbarComponent } from '@shared/components/edit-product-toolbar/edit-product-toolbar.component';
import { FilterChipsComponent } from '@app/shared/UI/filter/filter-chips.component';
import { FormComponent, FormField } from '@app/shared/UI/form/form.component';

import { Produit } from '@app/model/produit-models';
import { ProduitService } from '@app/services/produit.service';

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
export class BoutiqueHomeComponent implements OnInit {

  private dialog = inject(MatDialog);
  private produitService = inject(ProduitService);
  private fb = inject(FormBuilder);

  private readonly boutiqueId = '698f190319727b22bdcb0ce2';

  protected readonly produits = signal<Produit[]>([]);
  editMode = signal(false);

  selectedCategory = signal<string | null>(null);

  // ────────────────────────────────────────────────
  // INIT
  // ────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadProduits();
  }

  loadProduits() {
    this.produitService
      .getProduitsByBoutique(this.boutiqueId)
      .subscribe(res => {
        this.produits.set(res.produits || []);
      });
  }


  // ────────────────────────────────────────────────
  // MODE EDIT
  // ────────────────────────────────────────────────
  toggleEditMode() {
    this.editMode.update(v => !v);
  }

  // ────────────────────────────────────────────────
  // DELETE
  // ────────────────────────────────────────────────
  onProduitDeleted(id: string) {
    this.produitService.deleteProduit(id).subscribe(() => {
      this.loadProduits();
    });
  }

  // ────────────────────────────────────────────────
  // UPDATE local refresh
  // ────────────────────────────────────────────────
  onProduitUpdated(updated: Produit) {
    this.loadProduits();
  }


  // ────────────────────────────────────────────────
  // FILTER
  // ────────────────────────────────────────────────
  categoryItems = computed(() => {
    const unique = new Set(
      this.produits().map(p => p.details.categorie).filter(Boolean)
    );

    return Array.from(unique).map(cat => ({
      value: cat,
      label: cat
    }));
  });

  filteredProduits = computed(() => {
    const cat = this.selectedCategory();
    if (!cat) return this.produits();
    return this.produits().filter(p => p.details.categorie === cat);
  });

  onCategoryChange(value: string | null) {
    this.selectedCategory.set(value);
  }

  // ────────────────────────────────────────────────
  // FORM (CREATE / UPDATE)
  // ────────────────────────────────────────────────
openProduitForm(produit?: Produit) {

  // ──────────────────────────────────────────────────────────────
  // 🆕 Récupération des catégories existantes
  // ──────────────────────────────────────────────────────────────
  const existingCategories = this.categoryItems().map(c => c.value);
  
  // ──────────────────────────────────────────────────────────────
  // Définition des champs du formulaire
  // ──────────────────────────────────────────────────────────────
  const fields: FormField[] = [
    { name: 'nom', label: 'Nom du produit', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea', required: false, rows: 5 },
    // 🆕 Champ avec option pour créer une nouvelle catégorie
    { 
      name: 'categorie', 
      label: 'Catégorie', 
      type: 'select-or-text', 
      required: true, 
      options: this.categoryItems(),
      placeholder: 'Sélectionner ou créer une catégorie'
    },
    { name: 'prix', label: 'Prix (Ar)', type: 'number', required: true },
    { name: 'image', label: 'Image', type: 'file', required: false },
    { name: 'stock', label: 'Stock disponible', type: 'number' },
  ];

  // ──────────────────────────────────────────────────────────────
  // Création du FormGroup
  // ──────────────────────────────────────────────────────────────
  const formGroup = this.fb.group({
    nom: [produit?.details.nom || '', [Validators.required]],
    description: [produit?.details.description || '', []],
    categorie: [produit?.details.categorie || '', Validators.required],
    prix: [
      produit?.details.prix ?? 0, 
      [Validators.required, Validators.min(0)]
    ],
    image: [null],
    stock: [produit?.stock ?? 0, [Validators.min(0)]],
    enPromotion: [produit?.enPromotion ?? false]
  });

  // ──────────────────────────────────────────────────────────────
  // Ouverture du dialog
  // ──────────────────────────────────────────────────────────────
  const dialogRef = this.dialog.open(FormComponent, {
    width: '720px',
    maxWidth: '92vw',
    data: {
      title: produit ? 'Modifier le produit' : 'Ajouter un produit',
      subtitle: produit?.details.nom,
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

    // Validation du prix
    const prix = values.prix !== null && values.prix !== undefined && values.prix >= 0 
      ? values.prix 
      : 0;

    const formData = new FormData();
    formData.append('idBoutique', this.boutiqueId);
    formData.append('nom', values.nom || '');
    formData.append('description', values.description || '');
    formData.append('categorie', values.categorie || ''); // 🆕 Peut être nouvelle ou existante
    formData.append('prix', prix.toString());
    formData.append('stock', (values.stock ?? 0).toString());

    // Ajout de l'image si présente
    if (values.image) {
      formData.append('image', values.image);
    }

    // ✅ CHOIX ENTRE CREATE ET UPDATE
    const request$ = produit 
      ? this.produitService.updateProduit(produit.id, formData)
      : this.produitService.createProduit(formData);

    request$.subscribe({
      next: (res) => {
        console.log(produit ? 'Produit modifié' : 'Produit créé', res.produit);
        this.loadProduits(); // ✅ Recharger la liste complète
        dialogRef.close();
      },
      error: (err) => {
        console.error('Erreur lors de la création/modification', err);
        if (err.error) {
          console.error('Détails:', err.error);
        }
      }
    });
  });

  // ──────────────────────────────────────────────────────────────
  // Annulation
  // ──────────────────────────────────────────────────────────────
  dialogRef.componentInstance.cancel.subscribe(() => {
    dialogRef.close();
  });
}

}
