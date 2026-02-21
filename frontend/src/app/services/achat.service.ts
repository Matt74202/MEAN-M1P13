import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CommandePayload {
  idClient: string;
  typeLivraison: 'livraison' | 'recuperation';
  modePaiement: 'Espèces' | 'Orange Money' | 'Airtel Money' | 'MVola' | 'Carte';
  livraison?: {
    adresse: string;
    latitude: number;
    longitude: number;
    distance: number;
  };
  telephone?: string;
}

@Injectable({ providedIn: 'root' })
export class AchatService {
  private apiUrl = 'http://localhost:5000/api/achats';

  constructor(private http: HttpClient) {}

  creerCommande(payload: CommandePayload): Observable<any> {
    return this.http.post(this.apiUrl, payload);
  }

  getCommandesClient(clientId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/client/${clientId}`);
  }

  
}