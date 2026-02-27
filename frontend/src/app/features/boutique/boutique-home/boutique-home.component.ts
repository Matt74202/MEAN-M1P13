import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormBuilder, Validators } from '@angular/forms';

import { ProductGridComponent } from '@shared/components/product-grid/product-grid.component';
import { FilterChipsComponent } from '@app/shared/UI/filter/filter-chips.component';
import { FormComponent, FormField } from '@app/shared/UI/form/form.component';

import { Produit } from '@app/model/produit-models';
import { ProduitService } from '@app/services/produit.service';
import { BoutiqueService } from '@app/services/boutique.service';
import { PromotionService, Promotion } from '@app/services/promotion.service';
import { AuthService } from '@app/services/auth.service';
import { BoutiqueNavbarComponent } from '@app/shared/components/boutique-navbar/boutique-navbar.component';

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
    MatDialogModule,
    MatSnackBarModule,
    BoutiqueNavbarComponent,
  ],
  templateUrl: './boutique-home.component.html',
  styleUrl: './boutique-home.component.scss',
})
export class BoutiqueHomeComponent implements OnInit {

  private authService      = inject(AuthService);
  private dialog           = inject(MatDialog);
  private snackBar         = inject(MatSnackBar);
  private produitService   = inject(ProduitService);
  private boutiqueService  = inject(BoutiqueService);
  private promotionService = inject(PromotionService);
  private fb               = inject(FormBuilder);

  private readonly boutiqueId = this.authService.getProfileId() ?? '';

  protected readonly produits = signal<Produit[]>([]);
  nomBoutique      = signal('Ma Boutique');
  editMode         = signal(false);
  selectedCategory = signal<string | null>(null);
  promotionsMap    = signal<Record<string, Promotion>>({});

  // ── Catégories : chargées une seule fois, indépendamment de la page ──────────
  allCategories = signal<string[]>([]);

  categoryItems = computed(() =>
    this.allCategories().map(cat => ({ value: cat, label: cat }))
  );

  // ── Pagination ──────────────────────────────────
  currentPage   = signal(1);
  totalPages    = signal(1);
  totalProduits = signal(0);
  readonly pageSize = 8;

  pageNumbers = computed(() => {
    const total   = this.totalPages();
    const current = this.currentPage();
    const range: (number | '...')[] = [];
    const start = Math.max(1, current - 2);
    const end   = Math.min(total, current + 2);

    if (start > 1) { range.push(1); if (start > 2) range.push('...'); }
    for (let i = start; i <= end; i++) range.push(i);
    if (end < total) { if (end < total - 1) range.push('...'); range.push(total); }

    return range;
  });

  // ── Plus de filtrage côté client : les produits de la page sont déjà filtrés ─
  filteredProduits = computed(() => this.produits());

  // ────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadCategories();
    this.loadProduits();
    this.loadPromotionsActives();
    this.boutiqueService.getBoutiqueById(this.boutiqueId).subscribe({
      next: (b) => this.nomBoutique.set(b.nom ?? 'Ma Boutique'),
      error: () => {},
    });
  }

  // Chargé une seule fois, ne change que si on ajoute/supprime un produit
  loadCategories() {
    this.produitService.getAllCategories(this.boutiqueId).subscribe({
      next: (cats) => this.allCategories.set(cats),
      error: () => {},
    });
  }

  loadProduits() {
    this.produitService
      .getProduitsByBoutique(
        this.boutiqueId,
        this.currentPage(),
        this.pageSize,
        this.selectedCategory()
      )
      .subscribe(res => {
        this.produits.set(res.produits || []);
        this.totalPages.set(res.totalPages ?? 1);
        this.totalProduits.set(res.total ?? 0);
      });
  }

  goToPage(page: number | '...') {
    if (page === '...' || page === this.currentPage()) return;
    this.currentPage.set(page as number);
    this.loadProduits();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  prevPage() { if (this.currentPage() > 1) this.goToPage(this.currentPage() - 1); }
  nextPage() { if (this.currentPage() < this.totalPages()) this.goToPage(this.currentPage() + 1); }

  onCategoryChange(value: string | null) {
    this.selectedCategory.set(value);
    this.currentPage.set(1);  // revenir page 1 à chaque changement de filtre
    this.loadProduits();
  }

  loadPromotionsActives() {
    this.promotionService.getPromotionsActives(this.boutiqueId).subscribe({
      next: (promos) => {
        const map: Record<string, Promotion> = {};
        promos.forEach(p => {
          const idProduit = typeof p.details.idProduit === 'string'
            ? p.details.idProduit
            : (p.details.idProduit as any).id ?? (p.details.idProduit as any)._id;
          if (idProduit) map[idProduit] = p;
        });
        this.promotionsMap.set(map);
      },
      error: () => {},
    });
  }

  toggleEditMode() { this.editMode.update(v => !v); }

  onProduitDeleted(id: string) {
    this.produitService.deleteProduit(id).subscribe(() => {
      this.loadCategories(); // recalcule les catégories au cas où la dernière d'un type est supprimée
      this.loadProduits();
    });
  }

  onProduitUpdated(_updated: Produit) {
    this.loadCategories();
    this.loadProduits();
  }

  openProduitForm(produit?: Produit) {
    const fields: FormField[] = [
      { name: 'nom',         label: 'Nom du produit', type: 'text',           required: true },
      { name: 'description', label: 'Description',    type: 'textarea',       required: false, rows: 5 },
      { name: 'categorie',   label: 'Catégorie',      type: 'select-or-text', required: true,
        options: this.categoryItems(), placeholder: 'Sélectionner ou créer une catégorie' },
      { name: 'prix',  label: 'Prix (Ar)',       type: 'number', required: true },
      { name: 'image', label: 'Image',            type: 'file',   required: false },
      { name: 'stock', label: 'Stock disponible', type: 'number' },
    ];

    const formGroup = this.fb.group({
      nom:         [produit?.details.nom         || '', [Validators.required]],
      description: [produit?.details.description || '', []],
      categorie:   [produit?.details.categorie   || '', Validators.required],
      prix:        [produit?.details.prix        ?? 0,  [Validators.required, Validators.min(0)]],
      image:       [null],
      stock:       [produit?.stock               ?? 0,  [Validators.min(0)]],
      enPromotion: [produit?.enPromotion         ?? false],
    });

    const dialogRef = this.dialog.open(FormComponent, {
      width: '720px', maxWidth: '92vw',
      data: {
        title:       produit ? 'Modifier le produit' : 'Ajouter un produit',
        subtitle:    produit?.details.nom,
        fields, formGroup,
        submitLabel: produit ? 'Modifier' : 'Ajouter',
        showCancel:  true,
      },
    });

    dialogRef.componentInstance.submit.subscribe(() => {
      if (formGroup.invalid) { formGroup.markAllAsTouched(); return; }
      const values  = formGroup.value;
      const prix    = values.prix != null && values.prix >= 0 ? values.prix : 0;
      const formData = new FormData();
      formData.append('idBoutique',  this.boutiqueId);
      formData.append('nom',         values.nom         || '');
      formData.append('description', values.description || '');
      formData.append('categorie',   values.categorie   || '');
      formData.append('prix',        prix.toString());
      formData.append('stock',       (values.stock ?? 0).toString());
      if (values.image) formData.append('image', values.image);

      const request$ = produit
        ? this.produitService.updateProduit(produit.id, formData)
        : this.produitService.createProduit(formData);

      request$.subscribe({
        next: () => {
          this.loadCategories();
          this.loadProduits();
          dialogRef.close();
        },
        error: (err) => console.error('Erreur create/update produit', err),
      });
    });

    dialogRef.componentInstance.cancel.subscribe(() => dialogRef.close());
  }

  openPromotionForm(produit: Produit) {
    const promoExistante = this.promotionsMap()[produit.id];
    const today     = new Date().toISOString().split('T')[0];
    const inOneWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

    const fields: FormField[] = [
      { name: 'pourcentage', label: 'Réduction (%)',           type: 'number', required: true, placeholder: 'Ex : 20' },
      { name: 'description', label: 'Description (optionnel)', type: 'text',   required: false, placeholder: "Ex : Soldes d'été" },
      { name: 'dateDebut',   label: 'Date de début',           type: 'date',   required: true },
      { name: 'dateFin',     label: 'Date de fin',             type: 'date',   required: true },
    ];

    const formGroup = this.fb.group({
      pourcentage: [promoExistante?.details.pourcentage ?? 20, [Validators.required, Validators.min(1), Validators.max(100)]],
      description: [promoExistante?.details.description ?? '', []],
      dateDebut:   [promoExistante ? promoExistante.details.dateDebut.split('T')[0] : today,     [Validators.required]],
      dateFin:     [promoExistante ? promoExistante.details.dateFin.split('T')[0]   : inOneWeek, [Validators.required]],
    });

    const isModification = !!promoExistante;

    const dialogRef = this.dialog.open(FormComponent, {
      width: '480px', maxWidth: '92vw',
      data: {
        title: isModification
          ? `Modifier la promotion — ${produit.details.nom}`
          : `Nouvelle promotion — ${produit.details.nom}`,
        subtitle: `Prix actuel : ${produit.details.prix?.toLocaleString()} Ar`,
        fields, formGroup,
        submitLabel: isModification ? 'Modifier la promotion' : 'Lancer la promotion',
        showCancel: true,
      },
    });

    dialogRef.componentInstance.submit.subscribe(() => {
      if (formGroup.invalid) { formGroup.markAllAsTouched(); return; }
      const v = formGroup.value;
      const details = {
        idProduit:   produit.id,
        description: v.description || '',
        pourcentage: v.pourcentage!,
        dateDebut:   v.dateDebut!,
        dateFin:     v.dateFin!,
      };

      const request$ = isModification
        ? this.promotionService.modifierPromotion(promoExistante!._id, details)
        : this.promotionService.creerPromotion({ idBoutique: this.boutiqueId, details });

      request$.subscribe({
        next: () => {
          this.snackBar.open(
            isModification
              ? `✓ Promotion modifiée sur "${produit.details.nom}"`
              : `✓ Promotion lancée sur "${produit.details.nom}"`,
            '', { duration: 3000 }
          );
          this.loadPromotionsActives();
          dialogRef.close();
        },
        error: (err) => {
          this.snackBar.open('Erreur lors de la promotion', '', { duration: 2000 });
          console.error(err);
        },
      });
    });

    dialogRef.componentInstance.cancel.subscribe(() => dialogRef.close());
  }

  supprimerPromotion(produit: Produit) {
    const promo = this.promotionsMap()[produit.id];
    if (!promo) return;
    this.promotionService.supprimerPromotion(promo._id).subscribe({
      next: () => {
        this.snackBar.open('Promotion supprimée', '', { duration: 2500 });
        this.loadPromotionsActives();
      },
    });
  }
}