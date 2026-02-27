// loyers-admin.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MallNavbarComponent } from '@app/shared/components/mall-navbar/mall-navbar.component';

@Component({
  selector: 'app-loyers-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe, MallNavbarComponent],
  templateUrl: './loyers-admin.component.html',
  styleUrls:   ['./loyers-admin.component.scss'],
})
export class LoyersAdminComponent implements OnInit {
  loading      = true;
  errorMessage = '';
  loyersRaw:  any[] = [];   // données brutes du serveur
  boutiques:  any[] = [];
  filtres = { boutique: '', statut: '', boxNumero: '', mois: '' };

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.chargerBoutiques();
    this.chargerLoyers();
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    if (!token || token === 'null' || token === 'undefined') {
      this.errorMessage = "Vous devez être connecté en tant qu'admin";
      return {};
    }
    return { Authorization: `Bearer ${token}` };
  }

  chargerBoutiques() {
    const headers = this.getAuthHeaders();
    if (!('Authorization' in headers)) return;
    this.http.get<any>('http://localhost:5000/api/loyers/boutiques', { headers }).subscribe({
      next:  (res) => { if (res.success) this.boutiques = res.data || []; },
      error: (err) => console.error('Erreur boutiques', err)
    });
  }

  chargerLoyers() {
    this.loading = true;
    const headers = this.getAuthHeaders();
    if (!('Authorization' in headers)) { this.loading = false; return; }

    this.http.get<any>('http://localhost:5000/api/loyers/admin', { headers }).subscribe({
      next: (res) => {
        if (res.success) this.loyersRaw = res.data || [];
        else this.errorMessage = res.message || 'Réponse invalide';
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Impossible de charger les loyers';
        this.loading = false;
      }
    });
  }

  // Filtrage 100% côté client
  get loyers(): any[] {
    return this.loyersRaw.filter(l => {
      if (this.filtres.boutique) {
        const nom = (l.boutiqueNom || '').toLowerCase();
        if (!nom.includes(this.filtres.boutique.toLowerCase())) return false;
      }
      if (this.filtres.statut && l.statut !== this.filtres.statut) return false;
      if (this.filtres.mois   && l.mois   !== this.filtres.mois)   return false;
      if (this.filtres.boxNumero) {
        const num = (l.boxInfo?.numero ?? l.boxInfo?.nom ?? '').toString().toLowerCase();
        if (!num.includes(this.filtres.boxNumero.toLowerCase())) return false;
      }
      return true;
    });
  }

  resetFiltres() {
    this.filtres = { boutique: '', statut: '', boxNumero: '', mois: '' };
  }
}