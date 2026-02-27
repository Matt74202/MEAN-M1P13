import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';

import { FilterChipsComponent } from '@app/shared/UI/filter/filter-chips.component';
import { ClientNavbarComponent } from '@app/shared/components/client-navbar/client-navbar.component';
import { ProduitService } from '@app/services/produit.service';
import { PanierService } from '@app/services/panier.service';
import { PromotionService, Promotion } from '@app/services/promotion.service';
import { FavoriService } from '@app/services/favori.service';
import { NoteService, StatNote } from '@app/services/note.service';
import { AuthService } from '@app/services/auth.service';
import { Produit } from '@app/model/produit-models';

@Component({
  selector: 'app-client-boutique',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    FilterChipsComponent,
    ClientNavbarComponent,
  ],
  templateUrl: './client-boutique.component.html',
  styleUrl:    './client-boutique.component.scss',
})
export class ClientBoutiqueComponent implements OnInit {

  private produitService   = inject(ProduitService);
  private panierService    = inject(PanierService);
  private promotionService = inject(PromotionService);
  private favoriService    = inject(FavoriService);
  private noteService      = inject(NoteService);
  private authService      = inject(AuthService);
  private snackBar         = inject(MatSnackBar);
  private route            = inject(ActivatedRoute);
  private router           = inject(Router);

  readonly clientId = this.authService.getProfileId() ?? '';
  boutiqueId  = '';
  nomBoutique = signal<string>('');

  promotionsActives = signal<Map<string, Promotion>>(new Map());
  vue = signal<'catalogue' | 'panier'>('catalogue');

  // ── Page courante (pagination normale) ──────────────────────────────────────
  private readonly produits = signal<Produit[]>([]);

  // ── Tous les produits (pour recherche + favoris) ─────────────────────────────
  private readonly tousLesProduits = signal<Produit[]>([]);

  selectedCategory = signal<string | null>(null);
  statsProduitsMap = signal<Record<string, StatNote>>({});
  recherche        = signal('');
  filtreFavoris    = signal(false);

  // ── Catégories issues de tous les produits ───────────────────────────────────
  allCategories = signal<string[]>([]);
  categoryItems = computed(() =>
    this.allCategories().map(cat => ({ value: cat, label: cat }))
  );

  // ── Pagination ───────────────────────────────────────────────────────────────
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

  // ── Ce qu'on affiche selon le mode actif ─────────────────────────────────────
  //
  // - Recherche OU favoris actifs → on filtre sur tousLesProduits (pas de pagination)
  // - Sinon → on affiche la page courante (produits paginés)
  //
  modeRecherche = computed(() => !!this.recherche().trim() || this.filtreFavoris());

  filteredProduits = computed(() => {
    if (this.modeRecherche()) {
      // Filtre sur l'ensemble des produits
      let liste = this.tousLesProduits();

      // Filtre catégorie aussi si actif
      const cat = this.selectedCategory();
      if (cat) liste = liste.filter(p => p.details.categorie?.toLowerCase() === cat.toLowerCase());

      const terme = this.recherche().toLowerCase().trim();
      if (terme) liste = liste.filter(p =>
        p.details.nom.toLowerCase().includes(terme)
      );

      if (this.filtreFavoris()) {
        liste = liste.filter(p => this.favoriService.isFavori(p.id));
      }

      return liste;
    }

    // Mode normal : page courante uniquement
    return this.produits();
  });

  // Pagination visible seulement en mode normal (pas recherche/favoris)
  showPagination = computed(() => !this.modeRecherche() && this.totalPages() > 1);

  onRecherche(event: Event) {
    this.recherche.set((event.target as HTMLInputElement).value);
  }

  toggleFiltreFavoris() { this.filtreFavoris.update(v => !v); }

  // ── Panier ───────────────────────────────────────────────────────────────────
  readonly panier      = this.panierService.panier;
  readonly nbArticles  = this.panierService.nbArticles;
  readonly totalPanier = this.panierService.total;
  quantites = signal<Record<string, number>>({});

  // ────────────────────────────────────────────────────────────────────────────
  ngOnInit() {
    const state = window.history.state;

    this.route.params.subscribe(params => {
      this.boutiqueId = params['id'];
      localStorage.setItem('boutiqueId', this.boutiqueId);
      this.loadCategories();
      this.loadProduits();
      this.loadTousLesProduits();
      this.loadStatsProduitsMap();
      this.loadPromotionsActives();
    });

    this.favoriService.chargerFavoris(this.clientId, 'produit');

    if (state?.nomBoutique) {
      this.nomBoutique.set(state.nomBoutique);
      localStorage.setItem('nomBoutique', state.nomBoutique);
    } else {
      const saved = localStorage.getItem('nomBoutique');
      if (saved) this.nomBoutique.set(saved);
    }

    this.panierService.charger(this.clientId).subscribe();
  }

  // Catégories (une seule fois)
  loadCategories() {
    if (!this.boutiqueId) return;
    this.produitService.getAllCategories(this.boutiqueId).subscribe({
      next: (cats) => this.allCategories.set(cats),
      error: () => {},
    });
  }

  // Tous les produits sans pagination (pour recherche + favoris)
  loadTousLesProduits() {
    if (!this.boutiqueId) return;
    this.produitService.getProduitsByBoutique(this.boutiqueId, 1, 500).subscribe({
      next: res => this.tousLesProduits.set(res.produits || []),
      error: () => {},
    });
  }

  // Page courante (paginée + filtre catégorie backend)
  loadProduits() {
    if (!this.boutiqueId) return;
    this.produitService
      .getProduitsByBoutique(
        this.boutiqueId,
        this.currentPage(),
        this.pageSize,
        this.selectedCategory()
      )
      .subscribe({
        next: res => {
          this.produits.set(res.produits || []);
          this.totalPages.set(res.totalPages ?? 1);
          this.totalProduits.set(res.total ?? 0);
          if (!this.nomBoutique()) this.nomBoutique.set('Boutique');
        },
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
    this.currentPage.set(1);
    this.loadProduits();
    // Pas besoin de recharger tousLesProduits, le filtre client s'applique dans filteredProduits
  }

  loadPromotionsActives() {
    if (!this.boutiqueId) return;
    this.promotionService.getPromotionsActives(this.boutiqueId).subscribe({
      next: (promos) => {
        const map = new Map<string, Promotion>();
        promos.forEach(p => map.set(p.details.idProduit, p));
        this.promotionsActives.set(map);
      },
      error: () => {},
    });
  }

  getPromotion(idProduit: string): Promotion | undefined {
    return this.promotionsActives().get(idProduit);
  }

  getPrixPromo(produit: Produit): number {
    const promo = this.getPromotion(produit.id);
    if (!promo) return produit.details.prix;
    return Math.round(produit.details.prix * (1 - promo.details.pourcentage / 100));
  }

  getQuantite(idProduit: string): number {
    return this.quantites()[idProduit] ?? 1;
  }

  incrementer(produit: Produit) {
    const stockDispo      = produit.stock ?? 0;
    const dejaEnPanier    = this.quantiteEnPanier(produit.id);
    const qteSelectionnee = this.getQuantite(produit.id);
    const totalVoulu      = dejaEnPanier + qteSelectionnee + 1;
    if (totalVoulu > stockDispo) {
      this.snackBar.open(`Stock maximum atteint (${stockDispo} dispo)`, '', { duration: 2000 });
      return;
    }
    this.quantites.update(q => ({ ...q, [produit.id]: qteSelectionnee + 1 }));
  }

  decrementer(idProduit: string) {
    this.quantites.update(q => ({
      ...q,
      [idProduit]: Math.max(1, (q[idProduit] ?? 1) - 1),
    }));
  }

  ajouterAuPanier(produit: Produit) {
    const qte          = this.getQuantite(produit.id);
    const stockDispo   = produit.stock ?? 0;
    const dejaEnPanier = this.quantiteEnPanier(produit.id);
    if (stockDispo === 0) {
      this.snackBar.open('Ce produit est en rupture de stock', '', { duration: 2000 });
      return;
    }
    if (dejaEnPanier + qte > stockDispo) {
      this.snackBar.open(
        `Stock insuffisant — seulement ${stockDispo - dejaEnPanier} disponible(s)`,
        '', { duration: 2500 }
      );
      return;
    }
    const prixReel = this.getPrixPromo(produit);
    this.panierService.ajouter(this.clientId, produit.id, qte, prixReel).subscribe({
      next: () => {
        this.snackBar.open(`✓ ${produit.details.nom} ajouté au panier`, '', { duration: 2000 });
        this.quantites.update(q => ({ ...q, [produit.id]: 1 }));
      },
      error: () => this.snackBar.open("Erreur lors de l'ajout", '', { duration: 2000 }),
    });
  }

  quantiteEnPanier(idProduit: string): number {
    return this.panier().articles.find(a => a.idProduit === idProduit)?.quantite ?? 0;
  }

  modifierQuantite(idProduit: string, delta: number) {
    const article = this.panier().articles.find(a => a.idProduit === idProduit);
    if (!article) return;
    const newQte = article.quantite + delta;
    if (newQte <= 0) { this.supprimerArticle(idProduit); return; }
    const produit = this.tousLesProduits().find(p => p.id === idProduit);
    if (produit && newQte > (produit.stock ?? 0)) {
      this.snackBar.open('Stock maximum atteint', '', { duration: 2000 });
      return;
    }
    this.panierService.modifierQuantite(this.clientId, idProduit, newQte).subscribe();
  }

  isRuptureStock(produit: Produit): boolean { return (produit.stock ?? 0) === 0; }
  isStockFaible(produit: Produit): boolean {
    const s = produit.stock ?? 0;
    return s > 0 && s <= 3;
  }

  toggleFavoriProduit(produit: Produit) {
    this.favoriService.toggleLocal(produit.id);
    this.favoriService.toggle(this.clientId, 'produit', produit.id).subscribe({
      next: (res: { favori: boolean }) => {
        const msg = res.favori ? '❤️ Ajouté aux favoris' : 'Retiré des favoris';
        this.snackBar.open(msg, '', { duration: 2000 });
      },
      error: () => this.favoriService.toggleLocal(produit.id),
    });
  }

  isFavori(idProduit: string): boolean { return this.favoriService.isFavori(idProduit); }

  allerFavoris() { this.router.navigate(['/client/favoris']); }

  loadStatsProduitsMap() {
    if (!this.boutiqueId) return;
    this.noteService.getStatsProduitsBoutique(this.boutiqueId).subscribe({
      next: res => this.statsProduitsMap.set(res.stats),
    });
  }

  getStatsProduit(idProduit: string): StatNote | null {
    return this.statsProduitsMap()[idProduit] ?? null;
  }

  supprimerArticle(idProduit: string) {
    this.panierService.supprimer(this.clientId, idProduit).subscribe();
  }

  viderPanier()    { this.panierService.vider(this.clientId).subscribe(); }
  passerCommande() { this.router.navigate(['/client/commande-validation']); }
}