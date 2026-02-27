// contrats-boutique.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BoutiqueNavbarComponent } from '@app/shared/components/boutique-navbar/boutique-navbar.component';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-contrats-boutique',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, BoutiqueNavbarComponent],
  templateUrl: './contrats-boutique.component.html',
  styleUrls: ['./contrats-boutique.component.scss']
})
export class ContratsBoutiqueComponent implements OnInit {
  loading      = true;
  errorMessage = '';
  contrats: any[] = [];

  // Modal renouvellement
  showRenouvellementModal        = false;
  contratSelectionne: any        = null;
  dureeRenouvellement: number    = 12;
  acceptConditionsRenouvellement = false;

  // Modal résiliation
  showResiliationModal       = false;
  acceptConditionsResiliation = false;

  private apiUrl = `${environment.apiUrl}/contrats`;

  constructor(private http: HttpClient) {}

  ngOnInit() { this.chargerContrats(); }

  private getHeaders(): Record<string, string> {
    const token = localStorage.getItem('auth_token');
    if (!token || token === 'null' || token === 'undefined' || token.trim() === '') return {};
    return { Authorization: `Bearer ${token.trim()}` };
  }

  chargerContrats() {
    this.loading = true;
    this.errorMessage = '';
    this.http.get<any>(`${this.apiUrl}/boutique/mes-contrats`, { headers: this.getHeaders() }).subscribe({
      next: (res) => {
        if (res.success) {
          this.contrats = res.data || [];
        } else {
          this.errorMessage = res.message || 'Erreur inattendue du serveur';
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Impossible de charger les contrats';
        this.loading = false;
      }
    });
  }

  // ── Renouvellement ───────────────────────────────────────
  ouvrirModalRenouvellement(contrat: any) {
    this.contratSelectionne             = contrat;
    this.dureeRenouvellement            = 12;
    this.acceptConditionsRenouvellement = false;
    this.showRenouvellementModal        = true;
  }

  fermerModalRenouvellement() {
    this.showRenouvellementModal = false;
    this.contratSelectionne      = null;
  }

  get dateFinRenouvellement(): Date {
    if (!this.contratSelectionne) return new Date();
    const fin = new Date(this.contratSelectionne.dateFin);
    fin.setMonth(fin.getMonth() + this.dureeRenouvellement);
    return fin;
  }

  confirmerRenouvellement() {
    if (!this.acceptConditionsRenouvellement || !this.dureeRenouvellement) return;

    this.http.post<any>(
      `${this.apiUrl}/boutique/renouveler`,
      { contratId: this.contratSelectionne._id, dureeMois: this.dureeRenouvellement },
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.fermerModalRenouvellement();
          this.chargerContrats();
        } else {
          alert(res.message || 'Erreur lors de la demande de renouvellement');
        }
      },
      error: (err) => alert('Erreur : ' + (err.error?.message || 'Erreur serveur'))
    });
  }

  // ── Résiliation ──────────────────────────────────────────
  ouvrirModalResiliation(contrat: any) {
    this.contratSelectionne      = contrat;
    this.acceptConditionsResiliation = false;
    this.showResiliationModal    = true;
  }

  fermerModalResiliation() {
    this.showResiliationModal = false;
    this.contratSelectionne   = null;
  }

  confirmerResiliation() {
    if (!this.acceptConditionsResiliation) return;

    this.http.post<any>(
      `${this.apiUrl}/boutique/resilier`,
      { contratId: this.contratSelectionne._id },
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        if (res.success) {
          this.fermerModalResiliation();
          this.chargerContrats();
        } else {
          alert(res.message || 'Erreur lors de la résiliation');
        }
      },
      error: (err) => alert('Erreur : ' + (err.error?.message || 'Erreur serveur'))
    });
  }

  // ── Utilitaires ──────────────────────────────────────────
  getStatutLabel(statut: string): string {
    const map: Record<string, string> = {
      ACTIF:       'Actif',
      EN_ATTENTE:  'En attente',
      RESILIE:     'Résilié',
      TERMINE:     'Terminé'
    };
    return map[statut] || statut;
  }

  formatMontant(v: number): string {
    if (!v) return '0';
    return new Intl.NumberFormat('fr-FR').format(v);
  }
}