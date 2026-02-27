import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Produit } from '@app/model/produit-models';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProduitService {

  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + '/produits';

  getProduitsByBoutique(
    boutiqueId: string,
    page = 1,
    limit = 8,
    categorie: string | null = null
  ): Observable<any> {
    let params = new HttpParams()
      .set('boutiqueId', boutiqueId)
      .set('page', page.toString())
      .set('limit', limit.toString());

    // Le backend stocke les catégories en lowercase → on envoie en lowercase
    if (categorie) params = params.set('categorie', categorie.toLowerCase());

    return this.http.get<any>(this.apiUrl, { params });
  }

  // Charge tous les produits sans limite pour extraire toutes les catégories
  getAllCategories(boutiqueId: string): Observable<string[]> {
    const params = new HttpParams()
      .set('boutiqueId', boutiqueId)
      .set('limit', '500');
    return this.http.get<any>(this.apiUrl, { params }).pipe(
      map(res => {
        const unique = new Set<string>(
          (res.produits || [])
            .map((p: Produit) => p.details.categorie)
            .filter(Boolean)
        );
        return Array.from(unique);
      })
    );
  }

  createProduit(formData: FormData): Observable<any> {
    return this.http.post(this.apiUrl, formData);
  }

  updateProduit(id: string, formData: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, formData);
  }

  deleteProduit(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getProduitById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }
}