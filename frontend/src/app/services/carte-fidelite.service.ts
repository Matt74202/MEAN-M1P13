import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface Palier {
  achatNumero: number;
  type: 'pourcentage' | 'montant' | 'gratuit';
  valeur: number;
  description?: string;
}

export interface CarteFidelite {
  _id?: string;
  idBoutique: string;
  design: {
    couleur1: string;
    couleur2: string;
    slogan: string;
    logo?: string;
    nombreCases: number;
  };
  paliers: Palier[];   
  actif: boolean;
}

@Injectable({ providedIn: 'root' })
export class CarteFideliteService {
   private apiUrl = environment.apiUrl+ '/carte-fidelite';

  constructor(private http: HttpClient) {}

  getCarte(boutiqueId: string): Observable<CarteFidelite> {
    return this.http.get<CarteFidelite>(`${this.apiUrl}/boutique/${boutiqueId}`);
  }

  updateCarte(boutiqueId: string, data: Partial<CarteFidelite>): Observable<CarteFidelite> {
    return this.http.put<CarteFidelite>(`${this.apiUrl}/boutique/${boutiqueId}`, data);
  }

  desactiverCarte(boutiqueId: string): Observable<CarteFidelite> {
    return this.http.delete<CarteFidelite>(`${this.apiUrl}/boutique/${boutiqueId}`);
  }

  getBoutique(boutiqueId: string): Observable<{ nom: string }> {
    return this.http.get<{ nom: string }>(`${environment.apiUrl}/boutiques/${boutiqueId}`);
  }
}