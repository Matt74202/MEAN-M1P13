import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FavoriService } from '@app/services/favori.service';
import { ProduitService } from '@app/services/produit.service';
import { Produit } from '@app/model/produit-models';

import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';


@Component({
  selector: 'app-favoris',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './favoris.component.html',
  styleUrls: ['./favoris.component.scss']
})
export class FavorisComponent implements OnInit {
  private favoriService  = inject(FavoriService);
  private produitService = inject(ProduitService);
  private router         = inject(Router);

  private readonly clientId = '6994753c7e66b10156cb0cf2';

  produitsFavoris = signal<Produit[]>([]);

  ngOnInit() { this.loadFavoris(); }

  loadFavoris() {
    this.favoriService.getFavoris(this.clientId, 'produit').subscribe({
        next: res => {
        const ids: string[] = res.favoris.map((f: any) => f.idCible.toString());

        if (ids.length === 0) {
            this.produitsFavoris.set([]);
            return;
        }

        // Une requête par produit, en parallèle
        forkJoin(
            ids.map(id =>
            this.produitService.getProduitById(id).pipe(
                map((r: any) => r.produit),
                catchError(() => of(null))  // ignorer les produits supprimés
            )
            )
        ).subscribe({
            next: produits => {
            this.produitsFavoris.set(produits.filter(Boolean));
            }
        });
        }
    });
    }

  retirerFavori(idProduit: string) {
    this.favoriService.toggle(this.clientId, 'produit', idProduit).subscribe({
      next: () => {
        this.produitsFavoris.update(list => list.filter(p => p.id !== idProduit));
      }
    });
  }

  retour() { this.router.navigate(['/client/mall']); }
}