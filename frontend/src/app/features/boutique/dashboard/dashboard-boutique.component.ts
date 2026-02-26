import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  imports: [CommonModule, MatIconModule, MatButtonModule, BaseChartDirective, BoutiqueNavbarComponent],
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

  // ── Graphique barres ──────────────────────────────────────────────────────
  barChartData = signal<ChartData<'bar'>>({ labels: [], datasets: [] });
  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { font: { family: 'Garet' } } },
      x: { ticks: { font: { family: 'Garet' } } },
    },
  };

  // ── Graphique camembert ───────────────────────────────────────────────────
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

  setPeriode(j: number) {
    this.periode.set(j);
    this.load();
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

  getStars(moyenne: number): ('full' | 'half' | 'empty')[] {
    return [1, 2, 3, 4, 5].map(i => {
      if (i <= Math.floor(moyenne)) return 'full';
      if (i - 0.5 <= moyenne)      return 'half';
      return 'empty';
    });
  }

  getTotalProduits(): number {
    return this.data()?.produitsVendus.reduce((sum, p) => sum + p.quantite, 0) ?? 0;
  }

  getTopProduit(): string {
    return this.data()?.produitsVendus[0]?.nom ?? '—';
  }

  retour() { this.router.navigate(['/boutique']); }
}