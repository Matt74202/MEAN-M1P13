import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormBuilder, Validators } from '@angular/forms';

import { FormComponent, FormField } from '@app/shared/UI/form/form.component';
import { StockService, StockProduit, RAISONS_ENTREE, RAISONS_SORTIE } from '@app/services/stock.service';

@Component({
  selector: 'app-gestion-stock',
  standalone: true,
  imports: [
    CommonModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatSnackBarModule, MatDialogModule, MatTooltipModule
  ],
  templateUrl: './gestion-stock.component.html',
  styleUrl:    './gestion-stock.component.scss'
})
export class GestionStockComponent implements OnInit {
  private stockService = inject(StockService);
  private dialog       = inject(MatDialog);
  private snackBar     = inject(MatSnackBar);
  private fb           = inject(FormBuilder);

  private readonly boutiqueId = '698f190319727b22bdcb0ce2';

  stockProduits    = signal<StockProduit[]>([]);
  produitsEnAlerte = computed(() => this.stockProduits().filter(p => p.stockFaible));
  filtreAlerte     = signal(false);

  recherche = signal('');

  produitAffiches = computed(() => {
    let liste = this.filtreAlerte()
      ? this.stockProduits().filter(p => p.stockFaible)
      : this.stockProduits();

    const terme = this.recherche().toLowerCase().trim();
    if (terme) {
      liste = liste.filter(p =>
        p.details.nom.toLowerCase().includes(terme)
      );
    }
    return liste;
  });

  onRecherche(event: Event) {
    this.recherche.set((event.target as HTMLInputElement).value);
  }

  ngOnInit() { this.loadStock(); }

  loadStock() {
    this.stockService.getStockBoutique(this.boutiqueId).subscribe({
      next: res => this.stockProduits.set(res.produits)
    });
  }

  // ── Méthode pour éviter la lambda => dans le template ──
  toggleFiltreAlerte() {
    this.filtreAlerte.update(v => !v);
  }

  // ── Éviter le > dans le template ──
  getUniteLabel(stock: number): string {
    return stock > 1 ? 'unités' : 'unité';
  }

  // ── Entrée stock ──────────────────────────────
  openEntreeForm(produit: StockProduit) {
    const fields: FormField[] = [
      {
        name: 'raison', label: 'Raison', type: 'select', required: true,
        options: RAISONS_ENTREE.map(r => ({ value: r.value, label: r.label }))
      },
      { name: 'nombre', label: 'Quantité ajoutée', type: 'number', required: true, placeholder: 'Ex: 50' },
      { name: 'note',   label: 'Note (optionnel)', type: 'text',   required: false },
    ];

    const formGroup = this.fb.group({
      raison: ['approvisionnement', Validators.required],
      nombre: [null, [Validators.required, Validators.min(1)]],
      note:   ['']
    });

    const dialogRef = this.dialog.open(FormComponent, {
      width: '460px',
      data: {
        title:       `Entrée stock — ${produit.details.nom}`,
        subtitle:    `Stock actuel : ${produit.stock} unité(s)`,
        fields, formGroup,
        submitLabel: '+ Valider l\'entrée',
        showCancel:  true,
      }
    });

    dialogRef.componentInstance.submit.subscribe(() => {
      if (formGroup.invalid) { formGroup.markAllAsTouched(); return; }
      const { raison, nombre, note } = formGroup.value;

      this.stockService.entreeStock({
        idBoutique: this.boutiqueId,
        idProduit:  produit.id,
        nombre:     Number(nombre),
        raison:     raison as string,
        note:       note || ''
      }).subscribe({
        next: () => {
          this.snackBar.open(`✓ +${nombre} unités ajoutées`, '', { duration: 3000 });
          this.loadStock();
          dialogRef.close();
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Erreur', '', { duration: 3000 })
      });
    });

    dialogRef.componentInstance.cancel.subscribe(() => dialogRef.close());
  }

  // ── Sortie stock ──────────────────────────────
  openSortieForm(produit: StockProduit) {
    const fields: FormField[] = [
      {
        name: 'raison', label: 'Raison de la sortie', type: 'select', required: true,
        options: RAISONS_SORTIE.map(r => ({ value: r.value, label: r.label }))
      },
      {
        name: 'nombre', label: 'Quantité retirée', type: 'number', required: true,
        placeholder: `Max : ${produit.stock}`
      },
      { name: 'note', label: 'Note (optionnel)', type: 'text', required: false },
    ];

    const formGroup = this.fb.group({
      raison: ['approvisionnement', Validators.required],
      nombre: [null, [Validators.required, Validators.min(1)]],
      note:   ['']
    });

    const dialogRef = this.dialog.open(FormComponent, {
      width: '460px',
      data: {
        title:       `Sortie stock — ${produit.details.nom}`,
        subtitle:    `Stock actuel : ${produit.stock} unité(s)`,
        fields, formGroup,
        submitLabel: '− Valider la sortie',
        showCancel:  true,
      }
    });

    dialogRef.componentInstance.submit.subscribe(() => {
      if (formGroup.invalid) { formGroup.markAllAsTouched(); return; }
      const { raison, nombre, note } = formGroup.value;

      this.stockService.sortieStock({
        idBoutique: this.boutiqueId,
        idProduit:  produit.id,
        nombre:     Number(nombre),
        raison: raison ?? '', 
        note:       note || ''
      }).subscribe({
        next: () => {
          this.snackBar.open(`✓ −${nombre} unités retirées`, '', { duration: 3000 });
          this.loadStock();
          dialogRef.close();
        },
        error: (err) => this.snackBar.open(err.error?.message || 'Erreur', '', { duration: 3000 })
      });
    });

    dialogRef.componentInstance.cancel.subscribe(() => dialogRef.close());
  }
}