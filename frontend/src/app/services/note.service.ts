import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface StatNote {
  moyenne: number | null;
  total: number;
}

@Injectable({ providedIn: 'root' })
export class NoteService {
  private http = inject(HttpClient);
  private base = `http://localhost:5000/api/notes`;

  noterBoutique(payload: {
    idClient: string; idBoutique: string;
    note: number; commentaire?: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/boutique`, payload);
  }

  noterProduit(payload: {
    idClient: string; idProduit: string; idBoutique: string;
    note: number; commentaire?: string;
  }): Observable<any> {
    return this.http.post(`${this.base}/produit`, payload);
  }

  getStatsBoutique(boutiqueId: string): Observable<StatNote> {
    return this.http.get<StatNote>(`${this.base}/boutique/${boutiqueId}/stats`);
  }

  getStatsProduit(produitId: string): Observable<StatNote> {
    return this.http.get<StatNote>(`${this.base}/produit/${produitId}/stats`);
  }

  getStatsProduitsBoutique(boutiqueId: string): Observable<{ stats: Record<string, StatNote> }> {
    return this.http.get<{ stats: Record<string, StatNote> }>(
      `${this.base}/boutique/${boutiqueId}/produits/stats`
    );
  }
}