// boutique-mes-horaires.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BoutiqueNavbarComponent } from '@app/shared/components/boutique-navbar/boutique-navbar.component';

@Component({
  selector: 'app-boutique-mes-horaires',
  standalone: true,
  imports: [CommonModule, FormsModule, BoutiqueNavbarComponent],
  templateUrl: './boutique-mes-horaires.component.html',
  styleUrls:   ['./boutique-mes-horaires.component.scss'],
})
export class BoutiqueMesHorairesComponent implements OnInit {
  loading = true;
  saving  = false;
  errorMessage = '';
  successMsg   = '';
  errorSave    = '';

  supermarcheHoraires: { [key: number]: { ouverture: string; fermeture: string } } = {};
  mesHoraires:         { [key: number]: { ouverture: string; fermeture: string } } = {};
  erreurs:             { [key: number]: string } = {};

  joursSemaine = [
    { id: 1, nom: 'Lundi'    },
    { id: 2, nom: 'Mardi'    },
    { id: 3, nom: 'Mercredi' },
    { id: 4, nom: 'Jeudi'    },
    { id: 5, nom: 'Vendredi' },
    { id: 6, nom: 'Samedi'   },
    { id: 0, nom: 'Dimanche' },
  ];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // Init par défaut
    this.joursSemaine.forEach(j => {
      this.mesHoraires[j.id] = { ouverture: '08:00', fermeture: '20:00' };
    });
    this.chargerContraintesSupermarche();
    this.chargerMesHoraires();
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    if (!token || token === 'null' || token === 'undefined') {
      this.errorMessage = 'Vous devez être connecté';
      return {};
    }
    return { Authorization: `Bearer ${token}` };
  }

  chargerContraintesSupermarche() {
    const headers = this.getAuthHeaders();
    if (!('Authorization' in headers)) return;

    this.http.get<any>('http://localhost:5000/api/heures/supermarche', { headers }).subscribe({
      next: (res) => {
        if (res.success && res.data?.jour) {
          res.data.jour.forEach((entry: any) => {
            const id = entry.jour?.id;
            if (id !== undefined) {
              this.supermarcheHoraires[id] = {
                ouverture: entry.ouverture || '00:00',
                fermeture: entry.fermeture || '23:59',
              };
              if (!this.mesHoraires[id]) {
                this.mesHoraires[id] = { ...this.supermarcheHoraires[id] };
              }
            }
          });
        }
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Impossible de charger les contraintes';
      }
    });
  }

  chargerMesHoraires() {
    const headers = this.getAuthHeaders();
    if (!('Authorization' in headers)) { this.loading = false; return; }

    this.http.get<any>('http://localhost:5000/api/heures/boutique/me', { headers }).subscribe({
      next: (res) => {
        if (res.success && res.data?.heures?.length) {
          res.data.heures.forEach((h: any) => {
            const jourId = this.joursSemaine.find(j => j.nom === h.jour)?.id;
            if (jourId !== undefined) {
              this.mesHoraires[jourId] = {
                ouverture: h.ouverture || '00:00',
                fermeture: h.fermeture || '00:00',
              };
            }
          });
        }
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Impossible de charger vos horaires';
        this.loading = false;
      }
    });
  }

  verifierPlage(jourId: number) {
    const sup = this.supermarcheHoraires[jourId];
    const mes = this.mesHoraires[jourId];
    if (!sup || !mes) return;

    const toMin = (t: string) => {
      if (!t || t === 'Fermé') return 0;
      const [h, m] = t.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    delete this.erreurs[jourId];

    const supDeb = toMin(sup.ouverture), supFin = toMin(sup.fermeture);
    const mesDeb = toMin(mes.ouverture), mesFin = toMin(mes.fermeture);

    if (mesDeb < supDeb)               this.erreurs[jourId] = `Ouverture min : ${sup.ouverture}`;
    else if (mesFin > supFin)          this.erreurs[jourId] = `Fermeture max : ${sup.fermeture}`;
    else if (mesDeb >= mesFin)         this.erreurs[jourId] = "La fermeture doit être après l'ouverture";
  }

  hasErrors(): boolean { return Object.keys(this.erreurs).length > 0; }

  sauvegarderMesHoraires() {
    if (this.hasErrors()) return;
    this.saving = true;
    this.successMsg = ''; this.errorSave = '';
    const headers = this.getAuthHeaders();
    if (!('Authorization' in headers)) { this.saving = false; return; }

    const payload = {
      heures: this.joursSemaine.map(j => ({
        jour:      j.nom,
        ouverture: this.mesHoraires[j.id]?.ouverture || '00:00',
        fermeture: this.mesHoraires[j.id]?.fermeture || '00:00',
      }))
    };

    this.http.put('http://localhost:5000/api/heures/boutique/me', payload, { headers }).subscribe({
      next:  () => { this.successMsg = 'Vos horaires ont été enregistrés ✓'; this.saving = false; },
      error: (err) => { this.errorSave = err.error?.message || 'Erreur serveur'; this.saving = false; }
    });
  }
}