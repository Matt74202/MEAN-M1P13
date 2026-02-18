import { Routes } from '@angular/router';
import { MallCanvasComponent } from '@app/features/mall/mall-overview/mall-overview.component';  
import { ClientBoutiqueComponent } from '@app/features/client/client-boutique/client-boutique.component'; 
import { ClientMallComponent } from '@app/features/client/client-mall/client-mall.component'; 
import { FraisLivraisonComponent } from './features/mall/frais-livraison/frais-livraison.component';


export const routes: Routes = [
  { path: '', redirectTo: '/mall', pathMatch: 'full' },
  { path: 'mall', component: MallCanvasComponent },
  { path: 'boutique', loadComponent: () => import('@app/features/boutique/boutique-home/boutique-home.component').then(m => m.BoutiqueHomeComponent) },
  { path: 'client/boutique', component: ClientBoutiqueComponent },
  {
    path: 'client/mall',
    component: ClientMallComponent
  },
  {
    path: 'client/boutique/:id',
    component: ClientBoutiqueComponent  // ta page existante
  },
  {
    path: 'mall/frais',
    component: FraisLivraisonComponent
  }

];