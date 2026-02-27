import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Box } from '@app/model/mall-models';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BoxService {

  private apiUrl = environment.apiUrl+ '/boxes';  

  constructor(private http: HttpClient) {}

  getBoxes(etage?: string, statut?: string): Observable<Box[]> {
    let params: any = {};
    if (etage) params.etage = etage;
    if (statut) params.statut = statut;
    return this.http.get<Box[]>(this.apiUrl, { params });
  }

  createBox(box: Partial<Box>): Observable<Box> {
    return this.http.post<Box>(this.apiUrl, box);
  }

  updateBox(id: string, changes: Partial<Box>): Observable<Box> {
    return this.http.put<Box>(`${this.apiUrl}/${id}`, changes);
  }

  deleteBox(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}