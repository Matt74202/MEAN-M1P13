import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DashboardService, DashboardData } from '@app/services/dashboard.service';
import { AuthService } from '@app/services/auth.service';
import { BoutiqueNavbarComponent } from '@app/shared/components/boutique-navbar/boutique-navbar.component';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import {
  Chart, BarController, BarElement, CategoryScale, LinearScale,
  DoughnutController, ArcElement, Tooltip, Legend
} from 'chart.js';

Chart.register(
  BarController, BarElement, CategoryScale, LinearScale,
  DoughnutController, ArcElement, Tooltip, Legend
);

@Component({
  selector: 'app-dashboard-boutique',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterLink,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    BaseChartDirective,
    BoutiqueNavbarComponent,
  ],
  templateUrl: './dashboard-boutique.component.html',
  styleUrl:    './dashboard-boutique.component.scss',
})
export class DashboardBoutiqueComponent implements OnInit {
  private router           = inject(Router);
  private dashboardService = inject(DashboardService);
  private authService      = inject(AuthService);

  private readonly boutiqueId = this.authService.getProfileId() ?? '';

  data      = signal<DashboardData | null>(null);
  isLoading = signal(true);
  periode   = signal(7);

  // ── Mouvements : filtre date + voir plus ────────────────────────────────────
  filtreDate = signal('');
  voirPlusMouvements = signal(false);

  // Filtre par date : compare YYYY-MM-DD du champ avec YYYY-MM-DD de m.date
  mouvementsFiltres = computed(() => {
    const tous = this.data()?.stock?.mouvementsRecents ?? [];
    const filtre = this.filtreDate();

    if (!filtre) return tous;

    return tous.filter(m => {
      // Utilise toLocaleDateString pour comparer en heure locale
      const dateLocale = new Date(m.date).toLocaleDateString('fr-CA'); 
      return dateLocale === filtre;
    });
  });

  mouvementsAffiches = computed(() => {
    const filtres = this.mouvementsFiltres();
    return this.voirPlusMouvements() ? filtres : filtres.slice(0, 5);
  });

  onFiltreDateChange() {
    this.voirPlusMouvements.set(false);
  }

  clearFiltreDate() {
    this.filtreDate.set('');  // ← .set()
    this.voirPlusMouvements.set(false);
  }

  setPeriode(j: number) {
    this.periode.set(j);
    this.filtreDate.set('');  // ← .set()
    this.voirPlusMouvements.set(false);
    this.load();
  }

  toggleVoirPlus() {
    this.voirPlusMouvements.update(v => !v);
  }

  // ── Graphiques ──────────────────────────────────────────────────────────────
  barChartData = signal<ChartData<'bar'>>({ labels: [], datasets: [] });
  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { font: { family: 'Garet' } } },
      x: { ticks: { font: { family: 'Garet' } } },
    },
  };

  doughnutData = signal<ChartData<'doughnut'>>({ labels: [], datasets: [] });
  doughnutOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { font: { family: 'Garet' } } },
    },
  };

  ngOnInit() { this.load(); }

  load() {
    this.isLoading.set(true);
    this.dashboardService.getBoutique(this.boutiqueId, this.periode()).subscribe({
      next: res => {
        this.data.set(res);
        this.buildCharts(res);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  private buildCharts(res: DashboardData) {
    this.barChartData.set({
      labels: res.ventesParJour.map(v => v._id),
      datasets: [{
        data:            res.ventesParJour.map(v => v.total),
        label:           'CA (Ar)',
        backgroundColor: '#7d936c',
        borderRadius:    6,
      }],
    });

    const colors = ['#7d936c', '#a8c5a0', '#c5a07d', '#7d8fa8', '#a07d8f'];
    this.doughnutData.set({
      labels: res.produitsVendus.map(p => p.nom),
      datasets: [{
        data:            res.produitsVendus.map(p => p.quantite),
        backgroundColor: colors,
        borderWidth:     2,
        borderColor:     '#fff',
      }],
    });
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  getStars(moyenne: number): ('full' | 'half' | 'empty')[] {
    return [1, 2, 3, 4, 5].map(i => {
      if (i <= Math.floor(moyenne)) return 'full';
      if (i - 0.5 <= moyenne)      return 'half';
      return 'empty';
    });
  }

 getTotalProduits(): number {
    return this.data()?.totalUnitesVendues ?? 0;
  }

  getTopProduit(): string {
    return this.data()?.produitsVendus[0]?.nom ?? '—';
  }

  getStockClass(stock: number): string {
    if (stock === 0) return 'stock-zero';
    if (stock <= 5)  return 'stock-low';
    if (stock <= 15) return 'stock-medium';
    return 'stock-ok';
  }

  getLoursUrgence(): 'danger' | 'warning' | 'ok' {
    const info = this.data()?.loyers?.joursInfo;
    if (!info) return 'ok';
    if (info.enRetard)   return 'danger';
    if (info.jours <= 5) return 'warning';
    return 'ok';
  }

  getJoursLabel(): string {
    const info = this.data()?.loyers?.joursInfo;
    if (!info) return '';
    if (info.enRetard)    return `${info.jours} jour(s) de retard`;
    if (info.jours === 0) return "échéance aujourd'hui !";
    return `dans ${info.jours} jour(s)`;
  }
}