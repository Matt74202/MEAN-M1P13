import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router'; 

import { FilterChipsComponent } from '@app/shared/UI/filter/filter-chips.component';
import { ProduitService } from '@app/services/produit.service';
import { PanierService } from '@app/services/panier.service';
import { Produit } from '@app/model/produit-models';

@Component({
  selector: 'app-client-boutique',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatSnackBarModule,
    MatTooltipModule,
    FilterChipsComponent,
  ],
  templateUrl: './client-boutique.component.html',
  styleUrl:    './client-boutique.component.scss',
})
export class ClientBoutiqueComponent implements OnInit {

  private produitService = inject(ProduitService);
  private panierService  = inject(PanierService);
  private snackBar       = inject(MatSnackBar);
  private route          = inject(ActivatedRoute); 
  private router         = inject(Router);         

  // ── IDs ──
  readonly clientId = '6994753c7e66b10156cb0cf2';
  boutiqueId = '';
  nomBoutique = signal<string>('');  

  // ── Vues ──
  vue = signal<'catalogue' | 'panier'>('catalogue');

  // ── Produits ──
  private readonly produits = signal<Produit[]>([]);
  selectedCategory = signal<string | null>(null);

  categoryItems = computed(() => {
    const unique = new Set(
      this.produits().map(p => p.details.categorie).filter(Boolean)
    );
    return Array.from(unique).map(cat => ({ value: cat, label: cat }));
  });

  filteredProduits = computed(() => {
    const cat = this.selectedCategory();
    if (!cat) return this.produits();
    return this.produits().filter(p => p.details.categorie === cat);
  });

  // ── Panier ──
  readonly panier      = this.panierService.panier;
  readonly nbArticles  = this.panierService.nbArticles;
  readonly totalPanier = this.panierService.total;

  // ── Quantités sélectionnées par produit ──
  quantites = signal<Record<string, number>>({});

ngOnInit() {
  // ── 1. Lire depuis history.state ──
  const state = window.history.state;
  if (state?.nomBoutique) {
    this.nomBoutique.set(state.nomBoutique);
    localStorage.setItem('nomBoutique', state.nomBoutique); // ← sauvegarder
  } else {
    // ── 2. Fallback localStorage si refresh ──
    const saved = localStorage.getItem('nomBoutique');
    if (saved) this.nomBoutique.set(saved);
  }

  this.route.params.subscribe(params => {
    this.boutiqueId = params['id'];
    this.loadProduits();
  });

  this.panierService.charger(this.clientId).subscribe();
}

loadProduits() {
  if (!this.boutiqueId) return;

  this.produitService.getProduitsByBoutique(this.boutiqueId)
    .subscribe({
      next: res => {
        this.produits.set(res.produits || []);
        // ── Ne pas écraser le nom si déjà défini ──
        if (!this.nomBoutique()) {
          this.nomBoutique.set('Boutique');
        }
      },
      error: err => console.error('[BOUTIQUE] erreur API:', err)
    });
}

  // ── Catalogue ──
  onCategoryChange(value: string | null) {
    this.selectedCategory.set(value);
  }

  getQuantite(idProduit: string): number {
    return this.quantites()[idProduit] ?? 1;
  }

  incrementer(idProduit: string) {
    this.quantites.update(q => ({ ...q, [idProduit]: (q[idProduit] ?? 1) + 1 }));
  }

  decrementer(idProduit: string) {
    this.quantites.update(q => ({
      ...q,
      [idProduit]: Math.max(1, (q[idProduit] ?? 1) - 1)
    }));
  }

  ajouterAuPanier(produit: Produit) {
    const qte = this.getQuantite(produit.id);
    this.panierService.ajouter(this.clientId, produit.id, qte).subscribe({
      next: () => {
        this.snackBar.open(
          `✓ ${produit.details.nom} ajouté au panier`,
          '', { duration: 2000, panelClass: 'snack-success' }
        );
        this.quantites.update(q => ({ ...q, [produit.id]: 1 }));
      },
      error: () => this.snackBar.open('Erreur lors de l\'ajout', '', { duration: 2000 })
    });
  }

  quantiteEnPanier(idProduit: string): number {
    return this.panier().articles.find(a => a.idProduit === idProduit)?.quantite ?? 0;
  }

  // ── Panier ──
  modifierQuantite(idProduit: string, delta: number) {
    const article = this.panier().articles.find(a => a.idProduit === idProduit);
    if (!article) return;
    const newQte = article.quantite + delta;
    if (newQte <= 0) {
      this.supprimerArticle(idProduit);
    } else {
      this.panierService.modifierQuantite(this.clientId, idProduit, newQte).subscribe();
    }
  }

  supprimerArticle(idProduit: string) {
    this.panierService.supprimer(this.clientId, idProduit).subscribe();
  }

  viderPanier() {
    this.panierService.vider(this.clientId).subscribe();
  }

  passerCommande() {
    this.snackBar.open('Commande passée !', '', { duration: 3000 });
  }

  retourMall() {
    this.router.navigate(['/client/mall']);
  }
}