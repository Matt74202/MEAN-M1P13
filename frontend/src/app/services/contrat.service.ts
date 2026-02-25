import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Contrat } from '@app/model/mall-models';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ContratService {
 private apiUrl = environment.apiUrl+ '/contrats';  

  constructor(private http: HttpClient) {}

  getContrats(filters?: { idBoutique?: string; idBox?: string; statut?: string }): Observable<Contrat[]> {
    let params: any = {};
    if (filters?.idBoutique) params.idBoutique = filters.idBoutique;
    if (filters?.idBox) params.idBox = filters.idBox;
    if (filters?.statut) params.statut = filters.statut;

    return this.http.get<Contrat[]>(this.apiUrl, { params });
  }

  getContratById(id: string): Observable<Contrat> {
    return this.http.get<Contrat>(`${this.apiUrl}/${id}`);
  }

  createContrat(contrat: Partial<Contrat>): Observable<Contrat> {
    return this.http.post<Contrat>(this.apiUrl, contrat);
  }

  updateContrat(id: string, contrat: Partial<Contrat>): Observable<Contrat> {
    return this.http.put<Contrat>(`${this.apiUrl}/${id}`, contrat);
  }

  deleteContrat(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /**
   * Vérifie si un contrat est actif à une date donnée
   */
  isContratActif(contrat: Contrat, date: Date = new Date()): boolean {
    const debut = new Date(contrat.dateDebut);
    const fin = new Date(contrat.dateFin);
    return contrat.statut === 'ACTIF' && date >= debut && date <= fin;
  }

  /**
   * Récupère le contrat actif pour une box donnée
   */
  getActiveContratForBox(boxId: string, contrats: Contrat[]): Contrat | undefined {
    const now = new Date();
    return contrats.find(c => 
      c.idBox === boxId && 
      this.isContratActif(c, now)
    );
  }
}