import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';

export interface StockAlerte {
  _id: string;
  nom: string;
  categorie: string;
  stock: number;
}

export interface MouvementRecent {
  _id: string;
  type: 'entree' | 'sortie';
  nombre: number;
  raison: string;
  note?: string;
  date: string;
  produitNom: string;
}

export interface LoyerInfo {
  contratId: string;
  mois: string;
  montant: number;
  dateEcheance: string;
  boxNumero: string;
  boxNom: string;
  enRetard: boolean;
}

export interface LoyersSummary {
  nbImpayes: number;
  montantImpayes: number;
  montantMensuelTotal: number;
  prochainLoyer: LoyerInfo | null;
  joursInfo: { jours: number; enRetard: boolean } | null;
  echeanceCeMois: string;
  echeanceMoisProchain: string;
  prochainImpayes: LoyerInfo[];
}

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
  stock: {
    total: number;
    nbProduits: number;
    alertes: StockAlerte[];
    mouvementsRecents: MouvementRecent[];
    totalEntrees: number;
    totalSorties: number;
  };
  loyers: LoyersSummary;
  totalUnitesVendues: number;
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