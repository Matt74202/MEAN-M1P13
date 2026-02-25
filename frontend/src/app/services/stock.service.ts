import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export const RAISONS_SORTIE = [
  { value: 'achat_physique',     label: 'Vente en boutique physique' },
  { value: 'produit_defectueux', label: 'Produit défectueux' },
  { value: 'perte',              label: 'Perte / vol' },
  { value: 'don',                label: 'Don' },
  { value: 'correction',         label: 'Correction d\'inventaire' },
] as const;

export const RAISONS_ENTREE = [
  { value: 'approvisionnement', label: 'Approvisionnement fournisseur' },
  { value: 'retour_client',     label: 'Retour client' },
  { value: 'correction',        label: 'Correction d\'inventaire' },
] as const;

export interface MouvementStock {
  id: string;
  idBoutique: string;
  idProduit: any;
  type: 'entree' | 'sortie';
  nombre: number;
  raison: string;
  note?: string;
  date: string;
}

export interface StockProduit {
  id: string;
  details: { nom: string; categorie: string };
  imageUrl?: string;
  stock: number;
  stockFaible: boolean;
}

@Injectable({ providedIn: 'root' })
export class StockService {
  private http = inject(HttpClient);
  private base = environment.apiUrl+ '/stock';

  entreeStock(payload: {
    idBoutique: string;
    idProduit:  string;
    nombre:     number;
    raison:     string;   
    note?:      string;
  }): Observable<any> {
    return this.http.post(`${this.base}/entree`, payload);
  }

  getStockBoutique(boutiqueId: string, seuilAlerte = 5): Observable<{ produits: StockProduit[] }> {
    return this.http.get<{ produits: StockProduit[] }>(
      `${this.base}/boutique/${boutiqueId}`,
      { params: { seuilAlerte } }
    );
  }

  getHistorique(params: {
    boutiqueId?: string;
    produitId?: string;
    type?: 'entree' | 'sortie';
    page?: number;
    limit?: number;
  }): Observable<{ mouvements: MouvementStock[]; total: number; totalPages: number }> {
    let p = new HttpParams();
    Object.entries(params).forEach(([k, v]) => { if (v != null) p = p.set(k, v.toString()); });
    return this.http.get<any>(`${this.base}/historique`, { params: p });
  }

  sortieStock(payload: {
    idBoutique: string;
    idProduit:  string;
    nombre:     number;
    raison:     string;
    note?:      string;
  }): Observable<any> {
    return this.http.post(`${this.base}/sortie`, payload);
  }
}