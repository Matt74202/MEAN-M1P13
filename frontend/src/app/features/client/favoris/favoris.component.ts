import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { FavoriService } from '@app/services/favori.service';
import { ProduitService } from '@app/services/produit.service';
import { AuthService } from '@app/services/auth.service';
import { ClientNavbarComponent } from '@app/shared/components/client-navbar/client-navbar.component';
import { Produit } from '@app/model/produit-models';

@Component({
  selector: 'app-favoris',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, ClientNavbarComponent],
  templateUrl: './favoris.component.html',
  styleUrl: './favoris.component.scss',
})
export class FavorisComponent implements OnInit {
  private favoriService  = inject(FavoriService);
  private produitService = inject(ProduitService);
  private authService    = inject(AuthService);

  private readonly clientId = this.authService.getProfileId() ?? '';

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

        forkJoin(
          ids.map(id =>
            this.produitService.getProduitById(id).pipe(
              map((r: any) => r.produit),
              catchError(() => of(null)),
            )
          )
        ).subscribe({
          next: produits => this.produitsFavoris.set(produits.filter(Boolean)),
        });
      },
    });
  }

  retirerFavori(idProduit: string) {
    this.favoriService.toggle(this.clientId, 'produit', idProduit).subscribe({
      next: () => {
        this.produitsFavoris.update(list => list.filter(p => p.id !== idProduit));
      },
    });
  }
}