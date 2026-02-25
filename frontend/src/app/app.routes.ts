import { Routes } from '@angular/router';
import { MallCanvasComponent } from '@app/features/mall/mall-overview/mall-overview.component';  
import { ClientBoutiqueComponent } from '@app/features/client/client-boutique/client-boutique.component'; 
import { ClientMallComponent } from '@app/features/client/client-mall/client-mall.component'; 
import { FraisLivraisonComponent } from './features/mall/frais-livraison/frais-livraison.component';
import { CommandeValidationComponent } from './features/client/commande-validation/commande-validation.component';
import { CarteFideliteConfigComponent } from './features/boutique/carte-fidelite/carte-fidelite-config.component';
import { GestionStockComponent } from './features/boutique/gestion-stock/gestion-stock.component';
import { FavorisComponent } from './features/client/favoris/favoris.component';
import { DashboardBoutiqueComponent } from './features/boutique/dashboard/dashboard-boutique.component';
import { LoginComponent } from './features/auth/login/login.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: '/mall', pathMatch: 'full' },
  { path: 'mall', component: MallCanvasComponent },
  { path: 'client/boutique', component: ClientBoutiqueComponent },
  { path: 'client/mall', component: ClientMallComponent },
  { path: 'client', component: ClientMallComponent },
  { path: 'client/boutique/:id', component: ClientBoutiqueComponent },
  { path: 'client/commande-validation', component: CommandeValidationComponent },
  { path: 'client/favoris', component: FavorisComponent },
  { path: 'boutique', loadComponent: () => import('@app/features/boutique/boutique-home/boutique-home.component').then(m => m.BoutiqueHomeComponent) },
  { path: 'boutique/dashboard', component: DashboardBoutiqueComponent },
  { path: 'boutique/carte-fidelite', component: CarteFideliteConfigComponent },
  { path: 'boutique/gestion-stock', component: GestionStockComponent },
  { path: 'mall/frais', component: FraisLivraisonComponent },
];