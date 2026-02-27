import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

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
  private apiUrl = environment.apiUrl+ '/achats';

  constructor(private http: HttpClient) {}

  creerCommande(payload: CommandePayload): Observable<any> {
    return this.http.post(this.apiUrl, payload);
  }

  getCommandesClient(clientId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/client/${clientId}`);
  }

  getCommandesEnAttente(clientId: string): Observable<{ achats: any[] }> {
    return this.http.get<{ achats: any[] }>(
      `${this.apiUrl}/${clientId}/en-attente`
    );
  }

  marquerCommandeRecue(achatId: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${achatId}/recue`, {});
  }

  
}