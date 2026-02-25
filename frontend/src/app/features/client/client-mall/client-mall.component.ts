import { Component, ViewChild, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';

import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ClientMallMapComponent } from '@app/features/client/client-mall/client-mall-map.component';
import { FilterChipsComponent } from '@shared/UI/filter/filter-chips.component';

import { BoxService } from '@app/services/box.service';
import { ContratService } from '@app/services/contrat.service';
import { BoutiqueService } from '@app/services/boutique.service';
import { UserService } from '@app/services/user.service';

import { Box, Boutique, Contrat, Etage } from '@app/model/mall-models';

import { FavoriService } from '@app/services/favori.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AchatService } from '@app/services/achat.service';
import { MatDialog } from '@angular/material/dialog';
import { NotationCommandeComponent } from '@shared/components/notation-commande/notation-commande.component';
import { NoteService, StatNote } from '@app/services/note.service';
import { AuthService } from '@app/services/auth.service';

interface BoxWithDetails extends Box {
  boutique?: Boutique;
  contrat?: Contrat;
}

@Component({
  selector: 'app-client-mall',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
    MatCardModule,
    MatTooltipModule,
    ClientMallMapComponent,
    FilterChipsComponent,
    MatSnackBarModule,
  ],
  templateUrl: './client-mall.component.html',
  styleUrl: './client-mall.component.scss',
})
export class ClientMallComponent implements OnInit {

  private authService = inject(AuthService);
  private boxService     = inject(BoxService);
  private contratService = inject(ContratService);
  private boutiqueService = inject(BoutiqueService);
  private userService    = inject(UserService);
  private router         = inject(Router);
  private favoriService = inject(FavoriService);
  private snackBar      = inject(MatSnackBar);
  private achatService = inject(AchatService);
  private dialog       = inject(MatDialog);
  private noteService = inject(NoteService);

  // ── État ──
  viewMode: 'map' | 'cards' = 'map';
  currentEtage: Etage = 'RC';
  isLoading = false;

  private readonly clientId = this.authService.getProfileId() ?? '';

  // ── Données ──
  boxs:      Box[]      = [];
  contrats:  Contrat[]  = [];
  boutiques: Boutique[] = [];
  users:     any[]      = [];
  commandesEnAttente  = signal<any[]>([]);
  showCommandes       = signal(false);
  statsBoutiquesMap = signal<Record<string, StatNote>>({});

  // ── Filtre ──
  selectedTypeCommerce: string | null = null;
  typeCommerceOptions: { value: string; label: string }[] = [];

  // ── Groupes pour la vue liste ──
  boutiquesOccupees: BoxWithDetails[] = [];

  @ViewChild(ClientMallMapComponent) mallMapComp?: ClientMallMapComponent;

  ngOnInit() {
    this.loadData();
    this.favoriService.chargerFavoris(this.clientId, 'boutique');
    this.loadCommandesEnAttente();
    this.loadStatsBoutiques();
  }

  // ── Chargement ──
  private loadData() {
    this.isLoading = true;

    forkJoin({
      boxes:     this.boxService.getBoxes(this.currentEtage).pipe(catchError(() => of([]))),  // ← this.currentEtage
      contrats:  this.contratService.getContrats({ statut: 'ACTIF' }).pipe(catchError(() => of([]))),
      boutiques: this.boutiqueService.getBoutiques().pipe(catchError(() => of([]))),
      users:     this.userService.getUsers().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ boxes, contrats, boutiques, users }) => {
        this.boxs      = boxes     || [];
        this.contrats  = contrats  || [];
        this.boutiques = boutiques || [];
        this.users     = users     || [];
        this.isLoading = false;
        this.generateFiltres();
        this.updateBoutiquesOccupees();
        this.mallMapComp?.forceRedraw();
      },
      error: () => { this.isLoading = false; }
    });
  }

  private loadBoxes() {
    this.boxService.getBoxes(this.currentEtage).subscribe({
      next: (data) => {
        this.boxs = data || [];
        this.updateBoutiquesOccupees();
        this.mallMapComp?.forceRedraw();
      }
    });
  }

  // ── Utilitaires ──
  private getContratBoxId(contrat: any): string {
    return contrat.idBox?.toString() || contrat.boxId?.toString() || '';
  }

  private getBoutiqueFromContrat(contrat: Contrat): Boutique | undefined {
    if (contrat.idBoutique) {
      return this.boutiques.find(b =>
        b._id?.toString() === contrat.idBoutique?.toString()
      );
    }
    if ((contrat as any).userId) {
      const user = this.users.find((u: any) =>
        u._id?.toString() === (contrat as any).userId?.toString()
      );
      if (user) {
        return {
          _id:          user._id,
          nom:          user.nom,
          typeCommerce: user.TypeCommerce ?? 'Inconnu',
          mail:         user.mail,
        } as unknown as Boutique;
      }
    }
    return undefined;
  }

  getBoxesWithDetails(): BoxWithDetails[] {
    return this.boxs
      .filter(b => b.etage === this.currentEtage)
      .map(box => {
        const contrat = this.contrats.find(c =>
          this.getContratBoxId(c) === box._id?.toString() && c.statut === 'ACTIF'
        );
        const boutique = contrat ? this.getBoutiqueFromContrat(contrat) : undefined;
        return { ...box, boutique, contrat };
      });
  }

  private updateBoutiquesOccupees() {
    const all = this.getBoxesWithDetails();
    this.boutiquesOccupees = all.filter(b => b.boutique);
  }

  // ── Filtres ──
  private generateFiltres() {
    const typesSet = new Set<string>();
    this.contrats.forEach(contrat => {
      let type: string | undefined;
      if (contrat.idBoutique) {
        type = this.boutiques.find(b =>
          b._id?.toString() === contrat.idBoutique?.toString()
        )?.typeCommerce;
      } else if ((contrat as any).userId) {
        type = this.users.find((u: any) =>
          u._id?.toString() === (contrat as any).userId?.toString()
        )?.TypeCommerce;
      }
      if (type) typesSet.add(type);
    });

    this.typeCommerceOptions = Array.from(typesSet).sort().map(t => ({
      value: t, label: t
    }));
  }

  get boutiquesFiltered(): BoxWithDetails[] {
    if (!this.selectedTypeCommerce) return this.boutiquesOccupees;
    return this.boutiquesOccupees.filter(
      b => b.boutique?.typeCommerce === this.selectedTypeCommerce
    );
  }

  onFiltreChange(type: string | null) {
    this.selectedTypeCommerce = type;
    this.mallMapComp?.forceRedraw();
  }

  // ── Navigation ──
  setEtage(etage: Etage) {
    if (this.currentEtage === etage) return;
    this.currentEtage = etage;
    this.loadData(); 
  }

  // ── Clic sur une boutique (map ou carte) ──
    onBoutiqueSelected(box: BoxWithDetails | Box) {
  console.log('═══ onBoutiqueSelected ═══');
  console.log('box._id:', box._id);

  // ── Chercher le contrat directement depuis this.contrats ──
  const contrat = this.contrats.find(c => {
    const cBoxId = (c as any).idBox?.toString() || (c as any).boxId?.toString() || '';
    console.log('  contrat cBoxId:', cBoxId, ' vs box._id:', box._id?.toString());
    return cBoxId === box._id?.toString() && c.statut === 'ACTIF';
  });

  console.log('contrat trouvé:', contrat);
  console.log('boutiques dispo:', this.boutiques.map(b => ({ _id: b._id?.toString(), nom: b.nom })));

  if (!contrat) {
    console.warn('Aucun contrat actif pour cette box');
    return;
  }

  let boutiqueId: string | undefined;

  if (contrat.idBoutique) {
    boutiqueId = contrat.idBoutique.toString();
    console.log('→ idBoutique:', boutiqueId);

  } else if ((contrat as any).userId) {
    const userId = (contrat as any).userId.toString();
    const user = this.users.find((u: any) => u._id?.toString() === userId);
    console.log('→ userId user:', user);

    if (user) {
      const boutique = this.boutiques.find(b => b.nom === user.nom);
      boutiqueId = boutique?._id?.toString();
      console.log('→ boutique par nom:', boutique);
    }
  }

  console.log('→ Navigation vers boutiqueId:', boutiqueId);

  if (boutiqueId) {
  const boutique = this.boutiques.find(b => b._id?.toString() === boutiqueId);
  this.router.navigate(['/client/boutique', boutiqueId], {
    state: { nomBoutique: boutique?.nom || 'Boutique' }
  });
} else {
    console.warn('Aucune boutique trouvée');
  }
}

  getColorForType(typeCommerce?: string): string {
      if (!typeCommerce) return '#9e9e9e';
      const code = this.boutiqueService.getColorForType(typeCommerce);
      return '#' + code.toString(16).padStart(6, '0');
    }

    isFavoriBoutique(boutiqueId: string): boolean {
    return this.favoriService.isFavori(boutiqueId);
  }

  toggleFavoriBoutique(event: Event, boutiqueId: string) {
    event.stopPropagation(); // empêche le clic de naviguer vers la boutique
    this.favoriService.toggleLocal(boutiqueId);
    this.favoriService.toggle(this.clientId, 'boutique', boutiqueId).subscribe({
      next: (res: { favori: boolean }) => {
        const msg = res.favori ? '❤️ Boutique ajoutée aux favoris' : 'Boutique retirée des favoris';
        this.snackBar.open(msg, '', { duration: 2000 });
      },
      error: () => this.favoriService.toggleLocal(boutiqueId)
    });
  }

  get idsFavoris(): Set<string> {
    return this.favoriService.idsFavoris();
  }

  loadCommandesEnAttente() {
    this.achatService.getCommandesEnAttente(this.clientId).subscribe({
      next: res => this.commandesEnAttente.set(res.achats)
    });
  }

  toggleCommandes() { this.showCommandes.update(v => !v); }

  commandeRecue(achat: any) {
    this.achatService.marquerCommandeRecue(achat._id).subscribe({
      next: () => {
        this.commandesEnAttente.update(list => list.filter(a => a._id !== achat._id));

        const idBoutiqueStr = achat.idBoutique?._id?.toString()
          ?? achat.idBoutique?.toString()
          ?? '';

        console.log('idBoutiqueStr résolu:', idBoutiqueStr);

        const boutiqueLocale = this.boutiques.find(b =>
          b._id?.toString() === idBoutiqueStr
        );

        console.log('boutiqueLocale trouvée:', boutiqueLocale);

        if (boutiqueLocale?.nom) {
          this.ouvrirDialogNotation(achat, boutiqueLocale.nom);
        } else {
          this.boutiqueService.getBoutiqueById(idBoutiqueStr).subscribe({
            next: b  => this.ouvrirDialogNotation(achat, b.nom),
            error: () => this.ouvrirDialogNotation(achat, 'Boutique inconnue')
          });
        }
      }
    });
  }

private ouvrirDialogNotation(achat: any, nomBoutique: string) {
  console.log('>>> nomBoutique reçu dans ouvrirDialogNotation:', nomBoutique); 
  this.dialog.open(NotationCommandeComponent, {
    width: '560px',
    maxWidth: '95vw',
    data: {
      clientId:    this.clientId,
      idBoutique:  achat.idBoutique,
      nomBoutique,
      produits:    achat.details.map((d: any) => ({
        idProduit: d.idProduit,
        nom:       d.nom
      }))
    }
  });
}

  getTotalCommande(achat: any): number {
    return achat.details.reduce((sum: number, d: any) =>
      sum + d.prixUnitaire * d.quantite, 0
    );
  }

  loadStatsBoutiques() {
    this.boutiqueService.getBoutiques().subscribe({
      next: boutiques => {
        boutiques.forEach(b => {
          const id = b._id?.toString();
          if (!id) return;
          this.noteService.getStatsBoutique(id).subscribe({
            next: stats => {
              if (stats.total > 0) {
                this.statsBoutiquesMap.update(map => ({ ...map, [id]: stats }));
              }
            }
          });
        });
      }
    });
  }

  getStatsBoutique(boutiqueId?: any): StatNote | null {
    if (!boutiqueId) return null;
    return this.statsBoutiquesMap()[boutiqueId.toString()] ?? null;
  }
  
}