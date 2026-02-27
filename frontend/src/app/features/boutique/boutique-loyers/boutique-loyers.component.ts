// boutique-loyers.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BoutiqueNavbarComponent } from '@shared/components/boutique-navbar/boutique-navbar.component';
import { environment } from '@environments/environment';
 

@Component({
  selector: 'app-loyers-boutique',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, BoutiqueNavbarComponent],
  templateUrl: './boutique-loyers.component.html',
  styleUrls:   ['./boutique-loyers.component.scss'],
})
export class LoyersBoutiqueComponent implements OnInit {
  loading      = true;
  errorMessage = '';
  loyers:        any[] = [];
  loyersGroupes: { boxInfo: any; loyers: any[] }[] = [];
  filtres = { impayesOnly: false, dateDebut: '', dateFin: '' };

  constructor(private http: HttpClient) {}

  ngOnInit() { this.chargerLoyers(); }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    if (!token || token === 'null' || token === 'undefined') {
      this.errorMessage = 'Vous devez être connecté pour accéder aux loyers';
      return {};
    }
    return { Authorization: `Bearer ${token}` };
  }

  chargerLoyers() {
    this.loading = true;
    const headers = this.getAuthHeaders();
    if (!('Authorization' in headers)) { this.loading = false; return; }

    const params: any = {};
    if (this.filtres.impayesOnly) params.impayesOnly = 'true';
    if (this.filtres.dateDebut)   params.dateDebut   = this.filtres.dateDebut;
    if (this.filtres.dateFin)     params.dateFin     = this.filtres.dateFin;

    this.http.get<any>(`${environment.apiUrl}/loyers/boutique`, { headers, params }).subscribe({
      next: (res) => {
        if (res.success) {
          this.loyers = res.data || [];
          this.grouperParBox();
        } else {
          this.errorMessage = res.message || 'Réponse invalide du serveur';
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Impossible de charger les loyers';
        this.loading = false;
      }
    });
  }

  grouperParBox() {
    const map = new Map<string, { boxInfo: any; loyers: any[] }>();
    for (const loyer of this.loyers) {
      const boxId = loyer.boxInfo?._id || loyer.boxId || 'inconnu';
      if (!map.has(boxId)) map.set(boxId, { boxInfo: loyer.boxInfo, loyers: [] });
      map.get(boxId)!.loyers.push(loyer);
    }
    this.loyersGroupes = Array.from(map.values());
  }

  appliquerFiltres() { this.chargerLoyers(); }

  payerLoyer(id: string, loyer: any) {
    if (!confirm('Confirmer le paiement de ce loyer ? Cette action est irréversible.')) return;

    const headers = this.getAuthHeaders();
    if (!('Authorization' in headers)) { alert('Vous devez être connecté'); return; }

     const userStr  = localStorage.getItem('user');
    const user     = userStr ? JSON.parse(userStr) : null;
    const profileId = localStorage.getItem('profileId') || user?.profileId;

    const body = {
      mois:         loyer.mois,
      contratId:    loyer.contratId,
      dateEcheance: loyer.dateEcheance,
      montant:      loyer.montant,
      boutiqueId:   loyer.boutiqueId || profileId  // ← fallback
    };

    console.log('[PAYER] body envoyé :', body);

    this.http.put<any>(`${environment.apiUrl}/loyers/${id}/payer`, body, { headers }).subscribe({
      next:  (res) => {
        if (res.success) { alert('Loyer marqué comme payé avec succès'); this.chargerLoyers(); }
        else { alert(res.message || 'Réponse inattendue'); }
      },
      error: (err) => { alert('Erreur : ' + (err.error?.message || 'Erreur serveur')); }
    });
  }
}