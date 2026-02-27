// admin-heures.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MallNavbarComponent } from '@app/shared/components/mall-navbar/mall-navbar.component';
import { environment } from '@environments/environment';

@Component({
  selector: 'app-admin-heures-supermarche',
  standalone: true,
  imports: [CommonModule, FormsModule, MallNavbarComponent],
  templateUrl: './admin-heures.component.html',
  styleUrls:   ['./admin-heures.component.scss'],
})
export class AdminHeuresSupermarcheComponent implements OnInit {
  loading = true;
  saving  = false;
  errorMessage = '';

  joursSemaine = [
    { id: 1, nom: 'Lundi'    },
    { id: 2, nom: 'Mardi'    },
    { id: 3, nom: 'Mercredi' },
    { id: 4, nom: 'Jeudi'    },
    { id: 5, nom: 'Vendredi' },
    { id: 6, nom: 'Samedi'   },
    { id: 0, nom: 'Dimanche' },
  ];

  horaires:   { [key: number]: { ouverture: string; fermeture: string } } = {};
  exceptions: { date: string; ouverture: string; fermeture: string; motif: string }[] = [];

  // feedback inline (pas d'alert())
  successMsg = '';
  errorSave  = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // Init horaires par défaut pour éviter les erreurs de template
    this.joursSemaine.forEach(j => {
      this.horaires[j.id] = { ouverture: '08:00', fermeture: '20:00' };
    });
    this.chargerHoraires();
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    if (!token || token === 'null' || token === 'undefined') {
      this.errorMessage = 'Vous devez être connecté';
      return {};
    }
    return { Authorization: `Bearer ${token}` };
  }

  chargerHoraires() {
    this.loading = true;
    const headers = this.getAuthHeaders();
    if (!('Authorization' in headers)) { this.loading = false; return; }

    this.http.get<any>(`${environment.apiUrl}/heures/supermarche`, { headers }).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          res.data.jour?.forEach((entry: any) => {
            const id = entry.jour?.id;
            if (id !== undefined) {
              this.horaires[id] = {
                ouverture: entry.ouverture || '08:00',
                fermeture: entry.fermeture || '20:00',
              };
            }
          });
          this.exceptions = (res.data.exceptions || []).map((e: any) => ({
            date:      new Date(e.date).toISOString().split('T')[0],
            ouverture: e.ouverture || '00:00',
            fermeture: e.fermeture || '00:00',
            motif:     e.motif    || '',
          }));
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Impossible de charger les horaires';
        this.loading = false;
      }
    });
  }

  sauvegarderHoraires() {
    this.saving = true;
    this.successMsg = ''; this.errorSave = '';
    const headers = this.getAuthHeaders();
    if (!('Authorization' in headers)) { this.saving = false; return; }

    const payload = {
      jours: this.joursSemaine.map(j => ({
        jour:      { id: j.id, nom: j.nom },
        ouverture: this.horaires[j.id]?.ouverture || '08:00',
        fermeture: this.horaires[j.id]?.fermeture || '20:00',
      }))
    };

    this.http.put(`${environment.apiUrl}/heures/supermarche/standards`, payload, { headers }).subscribe({
      next:  () => { this.successMsg = 'Horaires standards enregistrés ✓'; this.saving = false; },
      error: (err) => { this.errorSave = err.error?.message || 'Erreur serveur'; this.saving = false; }
    });
  }

  ajouterException() {
    this.exceptions.push({
      date:      new Date().toISOString().split('T')[0],
      ouverture: '09:00',
      fermeture: '18:00',
      motif:     '',
    });
  }

  supprimerException(index: number) { this.exceptions.splice(index, 1); }

  sauvegarderExceptions() {
    this.saving = true;
    this.successMsg = ''; this.errorSave = '';
    const headers = this.getAuthHeaders();
    if (!('Authorization' in headers)) { this.saving = false; return; }

    const payload = {
      exceptions: this.exceptions.map(e => ({
        date:      new Date(e.date),
        ouverture: e.ouverture,
        fermeture: e.fermeture,
        motif:     e.motif.trim() || 'Exception',
      }))
    };

    this.http.put(`${environment.apiUrl}/heures/supermarche/exceptions`, payload, { headers }).subscribe({
      next:  () => { this.successMsg = 'Exceptions enregistrées ✓'; this.saving = false; },
      error: (err) => { this.errorSave = err.error?.message || 'Erreur serveur'; this.saving = false; }
    });
  }
}