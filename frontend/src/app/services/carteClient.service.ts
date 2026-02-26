import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CarteFidelite, Palier } from './carte-fidelite.service';
import { environment } from '@environments/environment';

export interface CarteClient {
  _id?: string;
  idClient: string;
  idBoutique: string;
  idCarte: string;
  nombreAchat: number;
  dateDebut: Date;
  dateDernierAchat: Date;
}

export interface CarteClientResponse {
  carteClient: CarteClient;
  carteFidelite: CarteFidelite;
}

export interface CarteClientAvecBoutique extends CarteClientResponse {
  nomBoutique: string;
}

export interface SimulationReduction {
  reduction: number;
  palier: Palier | null;
  nombreAchat: number;
}

@Injectable({ providedIn: 'root' })
export class CarteClientService {
   private apiUrl = environment.apiUrl+ '/cartes-client';

  constructor(private http: HttpClient) {}

  getAllCartes(clientId: string): Observable<CarteClientAvecBoutique[]> {
    return this.http.get<CarteClientAvecBoutique[]>(`${this.apiUrl}/client/${clientId}`);
  }

  getCarteClient(clientId: string, boutiqueId: string): Observable<CarteClientResponse> {
    return this.http.get<CarteClientResponse>(`${this.apiUrl}/${clientId}/${boutiqueId}`);
  }

  simulerReduction(clientId: string, boutiqueId: string, total: number): Observable<SimulationReduction> {
    return this.http.get<SimulationReduction>(`${this.apiUrl}/simuler-reduction`, {
      params: { clientId, boutiqueId, total: total.toString() }
    });
  }
}