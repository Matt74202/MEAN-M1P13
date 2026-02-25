import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface DashboardData {
  periode: number;
  ca: { total: number; periode: number };
  commandes: { total: number; enAttente: number; confirmees: number };
  ventesParJour: { _id: string; total: number; commandes: number }[];
  produitsVendus: { _id: string; nom: string; quantite: number; chiffre: number }[];
  notes: {
    moyenne: number | null;
    total: number;
    repartition: Record<number, number>;
    derniersAvis: any[];
  };
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl+ '/dashboard';

  getBoutique(boutiqueId: string, periode = 7): Observable<DashboardData> {
    const params = new HttpParams().set('periode', periode.toString());
    return this.http.get<DashboardData>(
      `${this.apiUrl}/boutique/${boutiqueId}`, { params }
    );
  }
}