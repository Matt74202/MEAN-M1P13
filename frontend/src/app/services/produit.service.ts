import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Produit } from '@app/model/produit-models';

@Injectable({
  providedIn: 'root'
})
export class ProduitService {

  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5000/api/produits';

  // ────────────────────────────────────────────────
  // GET produits par boutique
  // ────────────────────────────────────────────────
  getProduitsByBoutique(boutiqueId: string): Observable<any> {
    const params = new HttpParams().set('boutiqueId', boutiqueId);
    return this.http.get<any>(this.apiUrl, { params });
  }

  // ────────────────────────────────────────────────
  // CREATE - Accepte directement FormData
  // ────────────────────────────────────────────────
  createProduit(formData: FormData): Observable<any> {
    console.log('Envoi du FormData au backend');
    // ✅ Pas besoin de headers, Angular les gère automatiquement pour FormData
    return this.http.post(this.apiUrl, formData);
  }

  // ────────────────────────────────────────────────
  // UPDATE - Accepte directement FormData
  // ────────────────────────────────────────────────
  updateProduit(id: string, formData: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, formData);
  }

  // ────────────────────────────────────────────────
  // DELETE
  // ────────────────────────────────────────────────
  deleteProduit(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}