import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '@environments/environment';

export interface ArticlePanier {
  idProduit: string;
  nom: string;
  prix: number;
  image?: string;
  quantite: number;
  sousTotal: number;
}

export interface Panier {
  _id?: string;
  idClient: string;
  articles: ArticlePanier[];
  total: number;
  statut: 'EN_COURS' | 'COMMANDE';
}

const STORAGE_KEY = 'panier_local';

@Injectable({ providedIn: 'root' })
export class PanierService {

  private apiUrl = environment.apiUrl+ '/paniers';

  // ── Signal local (source de vérité pour l'UI) ──
  private _panier = signal<Panier>({
    idClient: '',
    articles: [],
    total: 0,
    statut: 'EN_COURS'
  });

  readonly panier   = this._panier.asReadonly();
  readonly nbArticles = computed(() =>
    this._panier().articles.reduce((s, a) => s + a.quantite, 0)
  );
  readonly total = computed(() => this._panier().total);

  constructor(private http: HttpClient) {}

  // ── Charger depuis BDD + fusionner avec local ──
  charger(clientId: string): Observable<Panier> {
    return this.http.get<Panier>(`${this.apiUrl}/${clientId}`).pipe(
      tap(panier => {
        const local = this.lireLocal();
        if (local.articles.length > 0) {
          // Fusionner : les articles locaux non présents en BDD sont ajoutés
          local.articles.forEach(al => {
            const existe = panier.articles.find(
              a => a.idProduit === al.idProduit
            );
            if (!existe) panier.articles.push(al);
          });
          panier.total = panier.articles.reduce((s, a) => s + a.sousTotal, 0);
        }
        this._panier.set(panier);
        this.sauvegarderLocal(panier);
      })
    );
  }

  // ── Ajouter un article ──
  ajouter(clientId: string, idProduit: string, quantite = 1, prix?: number): Observable<Panier> {
    const body: any = { idProduit, quantite };
    if (prix !== undefined) body.prix = prix;
    
    console.log('>>> BODY ENVOYÉ:', JSON.stringify(body));
    
    return this.http.post<Panier>(`${this.apiUrl}/${clientId}/articles`, body).pipe(
      tap(panier => {
        console.log('>>> PANIER REÇU:', JSON.stringify(panier.articles));
        this._panier.set(panier);
        this.sauvegarderLocal(panier);
      })
    );
  }

  // ── Modifier la quantité ──
  modifierQuantite(clientId: string, idProduit: string, quantite: number): Observable<Panier> {
    return this.http.put<Panier>(`${this.apiUrl}/${clientId}/articles`, {
      idProduit, quantite
    }).pipe(
      tap(panier => {
        this._panier.set(panier);
        this.sauvegarderLocal(panier);
      })
    );
  }

  // ── Supprimer un article ──
  supprimer(clientId: string, idProduit: string): Observable<Panier> {
    return this.http.delete<Panier>(
      `${this.apiUrl}/${clientId}/articles/${idProduit}`
    ).pipe(
      tap(panier => {
        this._panier.set(panier);
        this.sauvegarderLocal(panier);
      })
    );
  }

  // ── Vider le panier ──
  vider(clientId: string): Observable<Panier> {
    return this.http.delete<Panier>(`${this.apiUrl}/${clientId}/vider`).pipe(
      tap(panier => {
        this._panier.set(panier);
        this.sauvegarderLocal(panier);
      })
    );
  }

  // ── LocalStorage ──
  private sauvegarderLocal(panier: Panier) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(panier));
  }

  private lireLocal(): Panier {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { idClient: '', articles: [], total: 0, statut: 'EN_COURS' };
  }
}