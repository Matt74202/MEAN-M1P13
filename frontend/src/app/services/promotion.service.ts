import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface Promotion {
  _id: string;
  idBoutique: string;
  details: {
    idProduit: string;
    description: string;
    pourcentage: number;
    dateDebut: string;
    dateFin: string;
  };
}

@Injectable({ providedIn: 'root' })
export class PromotionService {
  private http = inject(HttpClient);
  private api = environment.apiUrl+ '/promotions';

  creerPromotion(data: { idBoutique: string; details: Omit<Promotion['details'], never> }): Observable<Promotion> {
    return this.http.post<Promotion>(this.api, data);
  }

  getPromotionsBoutique(boutiqueId: string): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(`${this.api}/boutique/${boutiqueId}`);
  }

  getPromotionsActives(boutiqueId: string): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(`${this.api}/boutique/${boutiqueId}/actives`);
  }

  modifierPromotion(id: string, details: Promotion['details']): Observable<Promotion> {
    return this.http.put<Promotion>(`${this.api}/${id}`, { details });
  }

  supprimerPromotion(id: string): Observable<void> {
    return this.http.delete<void>(`${this.api}/${id}`);
  }
}