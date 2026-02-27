import { Component, signal, computed, inject, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { HttpClient, HttpClientModule } from '@angular/common/http';

import { PanierService } from '@app/services/panier.service';
import { AchatService } from '@app/services/achat.service';
import { CarteClientService, CarteClientResponse } from '@app/services/carteClient.service';
import { BoutiqueService } from '@app/services/boutique.service';
import { Palier } from '@app/services/carte-fidelite.service';

declare const L: any;

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

@Component({
  selector: 'app-commande-validation',
  standalone: true,
  imports: [
    CommonModule, FormsModule, HttpClientModule,
    MatButtonModule, MatIconModule, MatRadioModule,
    MatInputModule, MatFormFieldModule, MatSnackBarModule, MatStepperModule,
  ],
  templateUrl: './commande-validation.component.html',
  styleUrl: './commande-validation.component.scss',
})
export class CommandeValidationComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private panierService      = inject(PanierService);
  private achatService       = inject(AchatService);
  private carteClientService = inject(CarteClientService);
  private boutiqueService    = inject(BoutiqueService);
  private snackBar           = inject(MatSnackBar);
  private router             = inject(Router);
  private http               = inject(HttpClient);

  readonly clientId = '6994753c7e66b10156cb0cf2';
  readonly today    = new Date();

  private readonly STORE_LAT = -18.8752;
  private readonly STORE_LNG = 47.5195;

  // ── Panier ──
  readonly panier = this.panierService.panier;
  readonly total  = computed(() => this.panier().total);

  // ── Étapes ──
  etapeActuelle = signal(1);

  // ── Choix ──
  typeLivraison = signal<'livraison' | 'recuperation' | null>(null);
  modePaiement  = signal<string | null>(null);
  telephone     = signal('');

  // ── Livraison ──
  adresse   = signal('');
  latitude  = signal(this.STORE_LAT);
  longitude = signal(this.STORE_LNG);
  distance  = signal(0);
  frais     = signal(0);

  // ── Leaflet ──
  private map: any = null;
  private marker: any = null;
  private leafletLoaded = false;

  // ── Recherche adresse ──
  adresseInput     = '';
  suggestions      = signal<NominatimResult[]>([]);
  rechercheEnCours = signal(false);
  private searchTimeout: any = null;

  readonly totalAvecFrais = computed(() =>
    this.typeLivraison() === 'livraison'
      ? this.total() + this.frais()
      : this.total()
  );

  // ── Carte fidélité ──
  boutiqueId    = signal('');
  nomBoutique   = signal('');
  carteResultat = signal<CarteClientResponse | null>(null);
  afficherCarte = signal(false);

  palierApplicable = signal<Palier | null>(null);
  reduction        = signal(0);

  readonly totalFinal = computed(() => {
    const base = this.typeLivraison() === 'livraison'
      ? this.total() + this.frais()
      : this.total();
    return Math.max(0, base - this.reduction());
  });

  // ── Lifecycle ──
  ngOnInit() {
    if (this.panier().articles.length === 0) {
      this.router.navigate(['/client/mall']);
      return;
    }

    const bid = localStorage.getItem('boutiqueId') ?? '';
    this.boutiqueId.set(bid);

    if (bid) {
      // Nom de la boutique
      this.boutiqueService.getBoutiqueById(bid).subscribe({
        next: (b) => this.nomBoutique.set(b.nom ?? ''),
        error: () => {}
      });

      // Simulation réduction + carte
      this.carteClientService.simulerReduction(this.clientId, bid, this.total()).subscribe({
        next: (sim) => {
          if (sim.reduction > 0 && sim.palier) {
            this.palierApplicable.set(sim.palier);
            this.reduction.set(sim.reduction);
          }
          this.carteClientService.getCarteClient(this.clientId, bid).subscribe({
            next: (res) => this.carteResultat.set(res),
            error: () => {}
          });
        },
        error: () => {
          this.carteClientService.getCarteClient(this.clientId, bid).subscribe({
            next: (res) => this.carteResultat.set(res),
            error: () => {}
          });
        }
      });
    }
  }

  ngAfterViewInit() {}

  ngOnDestroy() {
    this.detruireMap();
  }

  // ── Leaflet ──
  private chargerLeaflet(): Promise<void> {
    return new Promise((resolve) => {
      if (this.leafletLoaded || (window as any).L) {
        this.leafletLoaded = true;
        resolve();
        return;
      }
      const link = document.createElement('link');
      link.rel  = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => { this.leafletLoaded = true; resolve(); };
      document.head.appendChild(script);
    });
  }

  private async initMap() {
    await this.chargerLeaflet();
    setTimeout(() => {
      const el = document.getElementById('livraison-map');
      if (!el || this.map) return;

      this.map = L.map('livraison-map').setView([this.STORE_LAT, this.STORE_LNG], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(this.map);

      const icon = L.icon({
        iconUrl:   'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize:   [25, 41],
        iconAnchor: [12, 41],
      });

      this.marker = L.marker([this.STORE_LAT, this.STORE_LNG], { draggable: true, icon }).addTo(this.map);

      this.marker.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        this.mettreAJourPosition(pos.lat, pos.lng);
        this.geocodeInverse(pos.lat, pos.lng);
      });

      this.map.on('click', (e: any) => {
        this.marker.setLatLng(e.latlng);
        this.mettreAJourPosition(e.latlng.lat, e.latlng.lng);
        this.geocodeInverse(e.latlng.lat, e.latlng.lng);
      });
    }, 300);
  }

  private detruireMap() {
    if (this.map) { this.map.remove(); this.map = null; this.marker = null; }
  }

  private mettreAJourPosition(lat: number, lng: number) {
    this.latitude.set(lat);
    this.longitude.set(lng);
    const dist = this.calculerDistance(lat, lng);
    this.distance.set(dist);
    if (dist < 4)      this.frais.set(4000);
    else if (dist < 8) this.frais.set(6000);
    else               this.frais.set(10000);
  }

  private geocodeInverse(lat: number, lng: number) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        if (res?.display_name) {
          this.adresse.set(res.display_name);
          this.adresseInput = res.display_name;
        }
      }
    });
  }

  onAdresseInput() {
    clearTimeout(this.searchTimeout);
    this.suggestions.set([]);
    if (this.adresseInput.length < 3) return;

    this.rechercheEnCours.set(true);
    this.searchTimeout = setTimeout(() => {
      const url = `https://nominatim.openstreetmap.org/search`
        + `?q=${encodeURIComponent(this.adresseInput)}`
        + `&format=json&limit=5&countrycodes=mg`;

      this.http.get<NominatimResult[]>(url).subscribe({
        next: (results) => { this.suggestions.set(results); this.rechercheEnCours.set(false); },
        error: () => { this.rechercheEnCours.set(false); }
      });
    }, 500);
  }

  selectionnerSuggestion(suggestion: NominatimResult) {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    this.adresseInput = suggestion.display_name;
    this.adresse.set(suggestion.display_name);
    this.suggestions.set([]);
    this.mettreAJourPosition(lat, lng);
    if (this.map && this.marker) {
      this.marker.setLatLng([lat, lng]);
      this.map.setView([lat, lng], 15);
    }
  }

  // ── Navigation ──
  nextStep() {
    if (this.etapeActuelle() === 1 && !this.typeLivraison()) {
      this.snackBar.open('Choisissez un mode de livraison', '', { duration: 2000 }); return;
    }
    if (this.etapeActuelle() === 2 && !this.telephone()) {
      this.snackBar.open('Entrez votre numéro de téléphone', '', { duration: 2000 }); return;
    }
    if (this.etapeActuelle() === 2 && this.typeLivraison() === 'livraison' && !this.adresse()) {
      this.snackBar.open('Choisissez une adresse sur la carte', '', { duration: 2000 }); return;
    }
    if (this.etapeActuelle() === 3 && !this.modePaiement()) {
      this.snackBar.open('Choisissez un mode de paiement', '', { duration: 2000 }); return;
    }

    this.etapeActuelle.update(e => e + 1);

    if (this.etapeActuelle() === 2 && this.typeLivraison() === 'livraison') {
      this.initMap();
    }
  }

  onTypeLivraisonChange() {
    if (this.typeLivraison() === 'livraison') this.chargerLeaflet();
    if (this.typeLivraison() === 'livraison' && this.etapeActuelle() === 2) {
      this.detruireMap();
      this.initMap();
    }
  }

  prevStep() {
    if (this.etapeActuelle() === 2) this.detruireMap();
    this.etapeActuelle.update(e => Math.max(1, e - 1));
  }

  // ── Haversine ──
  calculerDistance(lat: number, lng: number): number {
    const R = 6371;
    const dLat = this.deg2rad(lat - this.STORE_LAT);
    const dLon = this.deg2rad(lng - this.STORE_LNG);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(this.STORE_LAT)) * Math.cos(this.deg2rad(lat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  calculerReduction(palier: Palier) {
    const total = this.total();
    if (palier.type === 'pourcentage') {
      this.reduction.set(Math.round(total * palier.valeur / 100));
    } else if (palier.type === 'montant') {
      this.reduction.set(palier.valeur);
    } else {
      this.reduction.set(0);
    }
  }

  // ── Validation commande ──
  validerCommande() {
    const payload: any = {
      idClient:      this.clientId,
      idBoutique:    this.boutiqueId(),
      typeLivraison: this.typeLivraison(),
      modePaiement:  this.modePaiement(),
      telephone:     this.telephone(),
      reduction:     this.reduction(),
      articles:      this.panier().articles,
      total:         this.panier().total,
    };

    if (this.typeLivraison() === 'livraison') {
      payload.livraison = {
        adresse:   this.adresse(),
        latitude:  this.latitude(),
        longitude: this.longitude(),
        distance:  this.distance(),
      };
    }

    this.achatService.creerCommande(payload).subscribe({
      next: () => {
        this.panierService.vider(this.clientId).subscribe();

        if (this.boutiqueId()) {
          this.carteClientService.getCarteClient(this.clientId, this.boutiqueId()).subscribe({
            next: (res: CarteClientResponse) => {
              this.carteResultat.set(res);
              this.afficherCarte.set(true);
              this.snackBar.open('✓ Commande validée !', '', { duration: 3000 });
            },
            error: () => {
              this.snackBar.open('✓ Commande validée !', '', { duration: 3000 });
              this.router.navigate(['/client/mall']);
            }
          });
        } else {
          this.snackBar.open('✓ Commande validée !', '', { duration: 3000 });
          this.router.navigate(['/client/mall']);
        }
      },
      error: () => this.snackBar.open('Erreur lors de la validation', '', { duration: 2000 }),
    });
  }

  estPalierAtteint(): boolean {
    const res = this.carteResultat();
    if (!res) return false;
    return (res.carteFidelite.paliers ?? [])
      .some(p => p.achatNumero === res.carteClient.nombreAchat);
  }

  getPalierLabelAtteint(): string {
    const res = this.carteResultat();
    if (!res) return '';
    const palier = (res.carteFidelite.paliers ?? [])
      .find(p => p.achatNumero === res.carteClient.nombreAchat);
    return palier ? this.getPalierLabel(palier) : '';
  }

  prochainPalierRestant(): number {
    const res = this.carteResultat();
    if (!res) return 0;
    const nombreAchat = res.carteClient.nombreAchat;
    const paliers = (res.carteFidelite.paliers ?? [])
      .filter(p => p.achatNumero > nombreAchat)
      .sort((a, b) => a.achatNumero - b.achatNumero);
    if (paliers.length === 0) return 0;
    return paliers[0].achatNumero - nombreAchat;
  }

  // ── Helpers carte fidélité ──
  getPalierLabel(palier: Palier): string {
    if (palier.type === 'pourcentage') return `-${palier.valeur}%`;
    if (palier.type === 'montant')     return `-${palier.valeur.toLocaleString()} Ar`;
    return 'GRATUIT';
  }

  getPalierPourCase(caseIndex: number): Palier | null {
    const paliers = this.carteResultat()?.carteFidelite?.paliers ?? [];
    return paliers.find((p: Palier) => p.achatNumero === caseIndex + 1) ?? null;
  }

  get casesArrayCarte(): number[] {
    const n = this.carteResultat()?.carteFidelite?.design?.nombreCases ?? 0;
    return Array(n).fill(0).map((_, i) => i);
  }

  get maxColumnsCarte(): number {
    return Math.min(5, this.carteResultat()?.carteFidelite?.design?.nombreCases ?? 5);
  }

  get casesRempliesCarte(): number {
    return this.carteResultat()?.carteClient?.nombreAchat ?? 0;
  }

  fermerCarte() {
    this.router.navigate(['/client/mall']);
  }

  annuler() {
    this.router.navigate(['/client/mall']);
  }
}