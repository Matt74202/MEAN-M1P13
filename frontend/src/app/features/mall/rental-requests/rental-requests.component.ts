import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';

interface RentalRequest {
  _id: string;
  userId:          { _id: string; nom: string; mail: string } | null;
  boxId:           { _id: string; nom: string; etage: string; loyer: number; typeNom: string; statut: string } | null;
  dureeMois:       number;
  messageBoutique: string;
  statut:          'pending' | 'approved' | 'rejected';
  notesAdmin:      string;
  createdAt:       string;
}

@Component({
  selector: 'app-rental-requests',
  standalone: true,
  imports: [
    CommonModule,
    DecimalPipe,
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatChipsModule,
  ],
  templateUrl: './rental-requests.component.html',
  styleUrl:    './rental-requests.component.scss',
})
export class RentalRequestsComponent implements OnInit {

  private http     = inject(HttpClient);
  private snackBar = inject(MatSnackBar);

  private readonly API = 'http://localhost:5000/api';

  isLoading   = signal(true);
  isActioning = signal<string | null>(null); // id de la demande en cours de traitement

  requests    = signal<RentalRequest[]>([]);
  filtreStatut = signal<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  readonly filtres: { value: 'all' | 'pending' | 'approved' | 'rejected'; label: string }[] = [
    { value: 'pending',  label: 'En attente'  },
    { value: 'approved', label: 'Approuvées'  },
    { value: 'rejected', label: 'Rejetées'    },
    { value: 'all',      label: 'Toutes'      },
  ];

  ngOnInit() { this.loadRequests(); }

  loadRequests() {
    this.isLoading.set(true);
    this.http.get<{ success: boolean; data: RentalRequest[] }>(
      `${this.API}/requests/all`
    ).subscribe({
      next: (res) => {
        this.requests.set(res.data ?? []);
        this.isLoading.set(false);
      },
      error: () => {
        this.snackBar.open('Erreur de chargement des demandes', '', { duration: 3000 });
        this.isLoading.set(false);
      },
    });
  }

  get requestsFiltrees(): RentalRequest[] {
    const f = this.filtreStatut();
    if (f === 'all') return this.requests();
    return this.requests().filter(r => r.statut === f);
  }

  get nbPending(): number {
    return this.requests().filter(r => r.statut === 'pending').length;
  }

  valider(request: RentalRequest) {
    this.isActioning.set(request._id);
    this.http.put<{ success: boolean; message: string }>(
      `${this.API}/requests/${request._id}/validate`,
      { dureeMois: request.dureeMois }
    ).subscribe({
      next: () => {
        this.snackBar.open('✓ Demande validée — contrat créé', '', { duration: 3000 });
        // Mettre à jour localement sans recharger
        this.requests.update(list =>
          list.map(r => r._id === request._id ? { ...r, statut: 'approved' as const } : r)
        );
        this.isActioning.set(null);
      },
      error: (err) => {
        this.snackBar.open(err.error?.message ?? 'Erreur lors de la validation', '', { duration: 4000 });
        this.isActioning.set(null);
      },
    });
  }

  rejeter(request: RentalRequest) {
    this.isActioning.set(request._id);
    this.http.put<{ success: boolean; message: string }>(
      `${this.API}/requests/${request._id}/reject`,
      { notesAdmin: 'Rejetée par admin' }
    ).subscribe({
      next: () => {
        this.snackBar.open('Demande rejetée', '', { duration: 3000 });
        this.requests.update(list =>
          list.map(r => r._id === request._id ? { ...r, statut: 'rejected' as const } : r)
        );
        this.isActioning.set(null);
      },
      error: (err) => {
        this.snackBar.open(err.error?.message ?? 'Erreur lors du rejet', '', { duration: 4000 });
        this.isActioning.set(null);
      },
    });
  }

  getEtageLabel(etage: string): string {
    return etage === 'RC' ? 'Rez-de-chaussée' : '1ᵉʳ étage';
  }

  getDateFin(createdAt: string, dureeMois: number): Date {
    const d = new Date(createdAt);
    d.setMonth(d.getMonth() + dureeMois);
    return d;
  }
}