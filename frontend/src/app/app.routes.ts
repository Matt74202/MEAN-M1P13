import { Routes } from '@angular/router';
import { MallCanvasComponent } from '@app/features/mall/mall-overview/mall-overview.component';  

export const routes: Routes = [
  { path: '', redirectTo: '/mall', pathMatch: 'full' },
  { path: 'mall', component: MallCanvasComponent },
];