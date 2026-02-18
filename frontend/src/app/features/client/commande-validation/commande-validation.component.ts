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

// ── Types Leaflet (chargé dynamiquement) ──────────────────────────────────────
declare const L: any;

// ── Type retour Nominatim ─────────────────────────────────────────────────────
interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

@Component({
  selector: 'app-commande-validation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatStepperModule,
  ],
  templateUrl: './commande-validation.component.html',
  styleUrl: './commande-validation.component.scss',
})
export class CommandeValidationComponent implements OnInit, OnDestroy, AfterViewInit {

  // ── Référence au div de la carte ──────────────────────────────────────────
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  private panierService = inject(PanierService);
  private achatService  = inject(AchatService);
  private snackBar      = inject(MatSnackBar);
  private router        = inject(Router);
  private http          = inject(HttpClient);

  readonly clientId = '6994753c7e66b10156cb0cf2';
  readonly today = new Date();

  // Coordonnées du magasin / point de référence (Antananarivo centre)
  private readonly STORE_LAT = -18.8752;
  private readonly STORE_LNG = 47.5195;

  // ── État ──────────────────────────────────────────────────────────────────
  readonly panier = this.panierService.panier;
  readonly total  = computed(() => this.panier().total);

  // ── Étapes ───────────────────────────────────────────────────────────────
  etapeActuelle = signal(1);

  // ── Choix ────────────────────────────────────────────────────────────────
  typeLivraison = signal<'livraison' | 'recuperation' | null>(null);
  modePaiement  = signal<string | null>(null);
  telephone     = signal('');

  // ── Livraison ────────────────────────────────────────────────────────────
  adresse   = signal('');
  latitude  = signal(this.STORE_LAT);
  longitude = signal(this.STORE_LNG);
  distance  = signal(0);
  frais     = signal(0);

  // ── Carte Leaflet ─────────────────────────────────────────────────────────
  private map: any = null;
  private marker: any = null;
  private leafletLoaded = false;

  // ── Recherche d'adresse ───────────────────────────────────────────────────
  adresseInput   = '';
  suggestions    = signal<NominatimResult[]>([]);
  rechercheEnCours = signal(false);
  private searchTimeout: any = null;

  readonly totalAvecFrais = computed(() => {
    return this.typeLivraison() === 'livraison'
      ? this.total() + this.frais()
      : this.total();
  });

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  ngOnInit() {
    if (this.panier().articles.length === 0) {
      this.snackBar.open('Votre panier est vide', '', { duration: 2000 });
      this.router.navigate(['/client/mall']);
      return;
    }
    // Leaflet sera chargé uniquement si l'utilisateur choisit la livraison
  }

  ngAfterViewInit() {
    // La carte est initialisée lors du passage à l'étape 2 (voir initMap)
  }

  ngOnDestroy() {
    this.detruireMap();
  }

  // ── Chargement dynamique de Leaflet (évite d'installer un package) ─────────
  private chargerLeaflet(): Promise<void> {
    return new Promise((resolve) => {
      if (this.leafletLoaded || (window as any).L) {
        this.leafletLoaded = true;
        resolve();
        return;
      }

      // CSS Leaflet
      const link = document.createElement('link');
      link.rel  = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      // JS Leaflet
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        this.leafletLoaded = true;
        resolve();
      };
      document.head.appendChild(script);
    });
  }

  // ── Initialisation de la carte ────────────────────────────────────────────
  private async initMap() {
    await this.chargerLeaflet();

    // Petit délai pour que le div soit bien rendu dans le DOM
    setTimeout(() => {
      const el = document.getElementById('livraison-map');
      if (!el || this.map) return;

      this.map = L.map('livraison-map').setView(
        [this.STORE_LAT, this.STORE_LNG], 13
      );

      // Tuiles OpenStreetMap (100% gratuit)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(this.map);

      // Icône du marqueur (fix bug Leaflet + bundlers)
      const icon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      // Marqueur draggable
      this.marker = L.marker([this.STORE_LAT, this.STORE_LNG], {
        draggable: true,
        icon,
      }).addTo(this.map);

      // Mise à jour des coords quand l'utilisateur déplace le marqueur
      this.marker.on('dragend', (e: any) => {
        const pos = e.target.getLatLng();
        this.mettreAJourPosition(pos.lat, pos.lng);
        this.geocodeInverse(pos.lat, pos.lng);
      });

      // Clic sur la carte = déplacer le marqueur
      this.map.on('click', (e: any) => {
        this.marker.setLatLng(e.latlng);
        this.mettreAJourPosition(e.latlng.lat, e.latlng.lng);
        this.geocodeInverse(e.latlng.lat, e.latlng.lng);
      });
    }, 300);
  }

  private detruireMap() {
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.marker = null;
    }
  }

  // ── Mise à jour lat/lng + calcul frais ────────────────────────────────────
  private mettreAJourPosition(lat: number, lng: number) {
    this.latitude.set(lat);
    this.longitude.set(lng);

    const dist = this.calculerDistance(lat, lng);
    this.distance.set(dist);

    if (dist < 4)      this.frais.set(4000);
    else if (dist < 8) this.frais.set(6000);
    else               this.frais.set(10000);
  }

  // ── Géocodage inverse : coordonnées → adresse lisible ────────────────────
  private geocodeInverse(lat: number, lng: number) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        if (res?.display_name) {
          this.adresse.set(res.display_name);
          this.adresseInput = res.display_name;
        }
      },
      error: () => { /* silencieux */ }
    });
  }

  // ── Recherche d'adresse avec debounce (Nominatim) ─────────────────────────
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
        next: (results) => {
          this.suggestions.set(results);
          this.rechercheEnCours.set(false);
        },
        error: () => {
          this.rechercheEnCours.set(false);
          this.snackBar.open('Erreur de recherche d\'adresse', '', { duration: 2000 });
        }
      });
    }, 500);
  }

  // ── Sélection d'une suggestion ────────────────────────────────────────────
  selectionnerSuggestion(suggestion: NominatimResult) {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);

    this.adresseInput = suggestion.display_name;
    this.adresse.set(suggestion.display_name);
    this.suggestions.set([]);

    this.mettreAJourPosition(lat, lng);

    // Déplacer le marqueur et recentrer la carte
    if (this.map && this.marker) {
      this.marker.setLatLng([lat, lng]);
      this.map.setView([lat, lng], 15);
    }
  }

  // ── Navigation entre étapes ───────────────────────────────────────────────
  nextStep() {
    if (this.etapeActuelle() === 1 && !this.typeLivraison()) {
      this.snackBar.open('Choisissez un mode de livraison', '', { duration: 2000 });
      return;
    }
    
    //  Téléphone obligatoire pour les deux modes ──
    if (this.etapeActuelle() === 2 && !this.telephone()) {
      this.snackBar.open('Entrez votre numéro de téléphone', '', { duration: 2000 });
      return;
    }
    
    if (this.etapeActuelle() === 2 && this.typeLivraison() === 'livraison' && !this.adresse()) {
      this.snackBar.open('Choisissez une adresse sur la carte', '', { duration: 2000 });
      return;
    }
    
    if (this.etapeActuelle() === 3 && !this.modePaiement()) {
      this.snackBar.open('Choisissez un mode de paiement', '', { duration: 2000 });
      return;
    }

    this.etapeActuelle.update(e => e + 1);

    // Initialiser la carte quand on arrive à l'étape livraison
    if (this.etapeActuelle() === 2 && this.typeLivraison() === 'livraison') {
      this.initMap();
    }
  }

  onTypeLivraisonChange() {
    // Précharger Leaflet en arrière-plan dès la sélection "livraison"
    if (this.typeLivraison() === 'livraison') {
      this.chargerLeaflet();
    }
    if (this.typeLivraison() === 'livraison' && this.etapeActuelle() === 2) {
      this.detruireMap();
      this.initMap();
    }
  }

  prevStep() {
    if (this.etapeActuelle() === 2) {
      this.detruireMap();
    }
    this.etapeActuelle.update(e => Math.max(1, e - 1));
  }

  // ── Haversine ─────────────────────────────────────────────────────────────
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

  // ── Validation finale ─────────────────────────────────────────────────────
  validerCommande() {
    const payload: any = {
      idClient:      this.clientId,
      typeLivraison: this.typeLivraison(),
      modePaiement:  this.modePaiement(),
      telephone:     this.telephone(), 
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
        this.snackBar.open('✓ Commande validée avec succès !', '', { duration: 3000 });
        this.router.navigate(['/client/mall']);  
      },
      error: () => {
        this.snackBar.open('Erreur lors de la validation', '', { duration: 2000 });
      },
    });
  }

  annuler() {
    this.router.navigate(['/client/mall']);
  }
}