import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DashboardService, DashboardData } from '@app/services/dashboard.service';
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
  imports: [CommonModule, MatIconModule, MatButtonModule, BaseChartDirective],
  templateUrl: './dashboard-boutique.component.html',
  styleUrl:    './dashboard-boutique.component.scss'
})
export class DashboardBoutiqueComponent implements OnInit {
  private route            = inject(ActivatedRoute);
  private router           = inject(Router);
  private dashboardService = inject(DashboardService);

  private readonly boutiqueId = '698f190319727b22bdcb0ce2';
  data       = signal<DashboardData | null>(null);
  isLoading  = signal(true);
  periode    = signal(7);

  // ── Graphique barres : ventes par jour ──
  barChartData = signal<ChartData<'bar'>>({ labels: [], datasets: [] });
  barChartOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { font: { family: 'Garet' } } },
      x: { ticks: { font: { family: 'Garet' } } }
    }
  };

  // ── Graphique camembert : top produits ──
  doughnutData = signal<ChartData<'doughnut'>>({ labels: [], datasets: [] });
  doughnutOptions: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: { position: 'bottom', labels: { font: { family: 'Garet' } } }
    }
  };

  ngOnInit() {
    this.load();
    }

  load() {
    this.isLoading.set(true);
    this.dashboardService.getBoutique(this.boutiqueId, this.periode()).subscribe({
        next: res => {
        this.data.set(res);
        this.buildCharts(res);
        this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false)
    });
    }

  setPeriode(j: number) {
    this.periode.set(j);
    this.load();
  }

  private buildCharts(res: DashboardData) {
    // Barres — ventes par jour
    this.barChartData.set({
      labels: res.ventesParJour.map(v => v._id),
      datasets: [{
        data:            res.ventesParJour.map(v => v.total),
        label:           'CA (Ar)',
        backgroundColor: '#7d936c',
        borderRadius:    6,
      }]
    });

    // Camembert — top produits
    const colors = ['#7d936c','#a8c5a0','#c5a07d','#7d8fa8','#a07d8f'];
    this.doughnutData.set({
      labels: res.produitsVendus.map(p => p.nom),
      datasets: [{
        data:            res.produitsVendus.map(p => p.quantite),
        backgroundColor: colors,
        borderWidth:     2,
        borderColor:     '#fff'
      }]
    });
  }

  getStars(moyenne: number): ('full' | 'half' | 'empty')[] {
    return [1,2,3,4,5].map(i => {
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