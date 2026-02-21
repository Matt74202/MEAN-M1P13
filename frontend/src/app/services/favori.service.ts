import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FavoriService {
  private http = inject(HttpClient);
  private base = `http://localhost:5000/api/favoris`;

  // Set local des IDs en favori pour réactivité immédiate
  private _idsFavoris = signal<Set<string>>(new Set());
  readonly idsFavoris = this._idsFavoris.asReadonly();

  chargerFavoris(clientId: string, type: 'produit' | 'boutique'): void {
    const p = new HttpParams()
      .set('clientId', clientId)
      .set('type', type);

    this.http.get<{ ids: string[] }>(`${this.base}/ids`, { params: p }).subscribe({
      next: res => {
        // Fusionner avec les ids existants plutôt que remplacer
        this._idsFavoris.update(set => {
          const newSet = new Set(set);
          res.ids.forEach(id => newSet.add(id));
          return newSet;
        });
      },
      error: err => console.error('Erreur chargement favoris:', err)
    });
  }

  toggle(idClient: string, type: 'produit' | 'boutique', idCible: string): Observable<{ favori: boolean }> {
    return this.http.post<{ favori: boolean }>(`${this.base}`, { idClient, type, idCible });
  }

  getFavoris(clientId: string, type?: 'produit' | 'boutique'): Observable<{ favoris: any[] }> {
    let p = new HttpParams();
    if (type) p = p.set('type', type);
    return this.http.get<{ favoris: any[] }>(`${this.base}/${clientId}`, { params: p });
  }

  isFavori(idCible: string): boolean {
    return this._idsFavoris().has(idCible);
  }

  // Mise à jour locale immédiate (sans attendre la réponse serveur)
  toggleLocal(idCible: string) {
    this._idsFavoris.update(set => {
      const newSet = new Set(set);
      newSet.has(idCible) ? newSet.delete(idCible) : newSet.add(idCible);
      return newSet;
    });
  }
}