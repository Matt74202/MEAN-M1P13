import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface TrancheLivraison {
  distanceMin: number;
  distanceMax: number | null; // null = Infinity
  prix: number;
  date?: string;
}

export interface FraisLivraison {
  _id?: string;
  frais: TrancheLivraison[];
}

@Injectable({ providedIn: 'root' })
export class FraisLivraisonService {
  private apiUrl = environment.apiUrl+ '/frais';

  constructor(private http: HttpClient) {}

  getFrais(): Observable<FraisLivraison> {
    return this.http.get<FraisLivraison>(this.apiUrl);
  }

  updateFrais(frais: TrancheLivraison[]): Observable<FraisLivraison> {
    return this.http.put<FraisLivraison>(this.apiUrl, { frais });
  }
}