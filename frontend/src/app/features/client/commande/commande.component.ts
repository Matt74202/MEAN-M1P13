import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule, SlicePipe, DecimalPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';

import { ClientNavbarComponent } from '@app/shared/components/client-navbar/client-navbar.component';
import { NotationCommandeComponent } from '@shared/components/notation-commande/notation-commande.component';
import { AchatService } from '@app/services/achat.service';
import { BoutiqueService } from '@app/services/boutique.service';
import { AuthService } from '@app/services/auth.service';

type Vue      = 'attente' | 'toutes';
type Statut   = 'tous' | 'EN_ATTENTE' | 'CONFIRMEE' ;
type Livraison = 'tous' | 'livraison' | 'recuperation';

@Component({
  selector: 'app-commande',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, ClientNavbarComponent, SlicePipe, DecimalPipe, DatePipe],
  templateUrl: './commande.component.html',
  styleUrl: './commande.component.scss',
})
export class MesCommandesComponent implements OnInit {
  private achatService    = inject(AchatService);
  private boutiqueService = inject(BoutiqueService);
  private authService     = inject(AuthService);
  private dialog          = inject(MatDialog);

  private readonly clientId = this.authService.getProfileId() ?? '';

  // ── State ──────────────────────────────────────────────────────────────────
  private toutesCommandes = signal<any[]>([]);
  isLoading    = signal(true);
  confirmingId = signal<string | null>(null);

  expandedIds = signal<Set<string>>(new Set());

  vue               = signal<Vue>('attente');
  filtreStatut      = signal<Statut>('tous');
  filtrePaiement    = signal<string>('tous');
  filtreLivraison   = signal<Livraison>('tous');
  filtreDateDebut   = signal<string>('');
  filtreDateFin     = signal<string>('');
  rechercheBoutique = signal<string>('');

  // ── Données filtre ─────────────────────────────────────────────────────────
  statuts: { value: Statut; label: string }[] = [
    { value: 'tous',       label: 'Tous'       },
    { value: 'EN_ATTENTE', label: 'En attente' },
    { value: 'CONFIRMEE',  label: 'Confirmée'  },
  ];

  paiements: { key: string; label: string }[] = [
    { key: 'tous',         label: 'Tous'           },
    { key: 'especes',      label: 'Espèces / Cash' },
    { key: 'orange_money', label: 'Orange Money'   },
    { key: 'airtel_money', label: 'Airtel Money'   },
    { key: 'mvola',        label: 'MVola'           },
    { key: 'carte',        label: 'Carte'           },
  ];

  // ── Normalisation paiement ─────────────────────────────────────────────────
  normaliserPaiement(val: string): string {
    const v = val.toLowerCase().trim().replace(/\s+/g, '_').replace(/[èé]/g, 'e');
    if (v === 'cash') return 'especes';
    return v;
  }

  getPaiementLabel(raw: string): string {
    const key = this.normaliserPaiement(raw);
    if (key === 'especes') return 'Espèces';
    return this.paiements.find(p => p.key === key)?.label ?? raw;
  }

  // ── Computed ───────────────────────────────────────────────────────────────
  nbAttente = computed(() =>
    this.toutesCommandes().filter(c => c.statut === 'EN_ATTENTE').length
  );

  commandesFiltrees = computed(() => {
    let liste = this.toutesCommandes();

    if (this.vue() === 'attente') {
      return liste.filter(c => c.statut === 'EN_ATTENTE');
    }

    if (this.filtreStatut() !== 'tous') {
      liste = liste.filter(c => c.statut === this.filtreStatut());
    }
    if (this.filtrePaiement() !== 'tous') {
      liste = liste.filter(c => this.normaliserPaiement(c.modePaiement) === this.filtrePaiement());
    }
    if (this.filtreLivraison() !== 'tous') {
      liste = liste.filter(c => c.typeLivraison === this.filtreLivraison());
    }
    if (this.filtreDateDebut()) {
      const debut = new Date(this.filtreDateDebut());
      liste = liste.filter(c => new Date(c.createdAt) >= debut);
    }
    if (this.filtreDateFin()) {
      const fin = new Date(this.filtreDateFin());
      fin.setHours(23, 59, 59, 999);
      liste = liste.filter(c => new Date(c.createdAt) <= fin);
    }
    if (this.rechercheBoutique().trim()) {
      const q = this.rechercheBoutique().toLowerCase().trim();
      liste = liste.filter(c =>
        (c.nomBoutique ?? '').toLowerCase().includes(q)
      );
    }

    return liste;
  });

  hasFiltresActifs = computed(() =>
    this.filtreStatut() !== 'tous'    ||
    this.filtrePaiement() !== 'tous'  ||
    this.filtreLivraison() !== 'tous' ||
    !!this.filtreDateDebut()          ||
    !!this.filtreDateFin()            ||
    !!this.rechercheBoutique().trim()
  );

  // ── Init ───────────────────────────────────────────────────────────────────
  ngOnInit() {
    this.achatService.getCommandesClient(this.clientId).subscribe({
      next: commandes => {
        // Pour chaque commande, on résout le nom de la boutique via idBoutique
        const ids = [...new Set(commandes.map(c => this.idBoutiqueStr(c)))].filter(Boolean);

        if (ids.length === 0) {
          this.toutesCommandes.set(commandes);
          this.isLoading.set(false);
          return;
        }

        // Fetch toutes les boutiques uniques en parallèle
        let resolved = 0;
        const boutiqueNoms: Record<string, string> = {};

        ids.forEach(id => {
          this.boutiqueService.getBoutiqueById(id).subscribe({
            next: b => { boutiqueNoms[id] = b.nom ?? id; },
            error: () => { boutiqueNoms[id] = ''; },
            complete: () => {
              resolved++;
              if (resolved === ids.length) {
                const enrichies = commandes.map(c => ({
                  ...c,
                  nomBoutique: boutiqueNoms[this.idBoutiqueStr(c)] ?? '',
                }));
                this.toutesCommandes.set(enrichies);
                this.isLoading.set(false);
              }
            },
          });
        });
      },
      error: () => this.isLoading.set(false),
    });
  }

  /** Extrait l'idBoutique sous forme de string (ObjectId ou string) */
  idBoutiqueStr(commande: any): string {
    const id = commande.idBoutique;
    if (!id) return '';
    return id?._id?.toString() ?? id?.toString() ?? '';
  }

  // ── Accordéon ──────────────────────────────────────────────────────────────
  toggleExpand(id: string) {
    this.expandedIds.update(set => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  isExpanded(id: string): boolean {
    return this.expandedIds().has(id);
  }

  // ── Actions filtres ────────────────────────────────────────────────────────
  setVue(v: Vue) { this.vue.set(v); }

  setFiltreStatut(s: Statut)       { this.filtreStatut.set(s); }
  setFiltrePaiement(key: string)   { this.filtrePaiement.set(key); }
  setFiltreLivraison(l: Livraison) { this.filtreLivraison.set(l); }

  resetFiltres() {
    this.filtreStatut.set('tous');
    this.filtrePaiement.set('tous');
    this.filtreLivraison.set('tous');
    this.filtreDateDebut.set('');
    this.filtreDateFin.set('');
    this.rechercheBoutique.set('');
  }

  // ── Confirmer réception + notation ────────────────────────────────────────
  confirmerReception(achatId: string) {
    this.confirmingId.set(achatId);
    const commande = this.toutesCommandes().find(c => c._id?.toString() === achatId);

    this.achatService.marquerCommandeRecue(achatId).subscribe({
      next: () => {
        // Mettre à jour le statut localement
        this.toutesCommandes.update(liste =>
          liste.map(c => c._id?.toString() === achatId ? { ...c, statut: 'CONFIRMEE' } : c)
        );
        this.confirmingId.set(null);

        // Ouvrir le dialog de notation
        if (commande) {
          this.ouvrirDialogNotation(commande);
        }
      },
      error: () => this.confirmingId.set(null),
    });
  }

  private ouvrirDialogNotation(commande: any) {
    const idBoutique = this.idBoutiqueStr(commande);
    const nomBoutique = commande.nomBoutique ?? 'Boutique';

    this.dialog.open(NotationCommandeComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: {
        clientId:   this.clientId,
        idBoutique,
        nomBoutique,
        produits: (commande.details ?? []).map((d: any) => ({
          idProduit: d.idProduit,
          nom:       d.nom,
        })),
      },
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  getStatutLabel(statut: string): string {
    const map: Record<string, string> = {
      EN_ATTENTE: 'En attente',
      CONFIRMEE:  'Confirmée',
      ANNULEE:    'Annulée',
    };
    return map[statut] ?? statut;
  }
}