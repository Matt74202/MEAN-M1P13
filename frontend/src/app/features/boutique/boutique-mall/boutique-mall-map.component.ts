import {
  AfterViewInit, Component, ElementRef, EventEmitter,
  Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild
} from '@angular/core';
import * as PIXI from 'pixi.js';
import { Box, Boutique, Contrat, Etage } from '@app/model/mall-models';
import { BoutiqueService } from '@app/services/boutique.service';

@Component({
  selector: 'app-boutique-mall-map',
  standalone: true,
  template: `<div #mapContainer class="map-pixi"></div>`,
  styles: [`
    :host { display: block; width: 100%; height: 100%; position: relative; }
    .map-pixi { width: 100%; height: 100%; background: #e5e5e5; }
    canvas { width: 100% !important; height: 100% !important; }
  `]
})
export class BoutiqueMallMapComponent implements AfterViewInit, OnDestroy, OnChanges {

  @Input() boxs: Box[] = [];
  @Input() boutiques: Boutique[] = [];
  @Input() users: any[] = [];
  @Input() contrats: Contrat[] = [];
  @Input() currentEtage: Etage = 'RC';
  @Input() selectedTypeCommerce: string | null = null;
  @Input() idsFavoris: Set<string> = new Set();
  /** ID de la box appartenant au gérant connecté — surlignage vert foncé */
  @Input() maBoxId: string | null = null;

  @Output() boutiqueClick = new EventEmitter<Box>();

  @ViewChild('mapContainer') mapContainerRef!: ElementRef<HTMLDivElement>;

  private app?: PIXI.Application;

  private root       = new PIXI.Container();
  private mapContent = new PIXI.Container();
  private boxesContainers: Map<string, PIXI.Container> = new Map();

  private readonly SCALE_FACTOR = 0.9;

  // Couleurs spéciales pour la vue boutique
  private readonly COLOR_MA_BOX  = 0x2e7d32;   // vert foncé — ma boutique
  private readonly COLOR_LIBRE   = 0x7d936c;   // vert accent — libre
  private readonly COLOR_OCCUPEE = 0xf59e0b;   // ambre — occupée par autre

  constructor(private boutiqueService: BoutiqueService) {}

  async ngAfterViewInit() {
    const el   = this.mapContainerRef.nativeElement;
    const rect = el.getBoundingClientRect();

    this.app = new PIXI.Application();
    await this.app.init({
      width:           rect.width  || 1600,
      height:          rect.height || 900,
      backgroundColor: 0xf8f9f5,
      antialias:       true,
      resolution:      window.devicePixelRatio || 1,
      autoDensity:     true,
      resizeTo:        el
    });

    el.appendChild(this.app.canvas);

    this.mapContent.scale.set(this.SCALE_FACTOR);
    this.root.addChild(this.mapContent);
    this.app.stage.addChild(this.root);

    this.drawMap(true);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.app) return;

    if (
      changes['selectedTypeCommerce'] ||
      changes['idsFavoris']           ||
      changes['maBoxId']
    ) {
      this.boxesContainers.forEach(c => this.mapContent.removeChild(c));
      this.boxesContainers.clear();
    }

    if (changes['users'] || changes['contrats'] || changes['boutiques']) {
      this.boxesContainers.forEach(c => this.mapContent.removeChild(c));
      this.boxesContainers.clear();
    }

    if (
      changes['boxs']                 ||
      changes['contrats']             ||
      changes['boutiques']            ||
      changes['users']                ||
      changes['currentEtage']         ||
      changes['selectedTypeCommerce'] ||
      changes['idsFavoris']           ||
      changes['maBoxId']
    ) {
      this.drawMap();
    }
  }

  public forceRedraw() {
    this.drawMap(false);
  }

  private drawMap(isInitial = false) {
    if (!this.app) return;

    if (isInitial) {
      this.mapContent.removeChildren();
      this.boxesContainers.clear();

      const bg = new PIXI.Graphics()
        .rect(
          0, 0,
          this.app.screen.width  / this.SCALE_FACTOR,
          this.app.screen.height / this.SCALE_FACTOR
        )
        .fill(0xf8f9f5);
      this.mapContent.addChild(bg);
    }

    for (const [id, cont] of this.boxesContainers.entries()) {
      if (!this.boxs.some(b => b._id === id && b.etage === this.currentEtage)) {
        this.mapContent.removeChild(cont);
        this.boxesContainers.delete(id);
      }
    }

    this.boxs
      .filter(b => b.etage === this.currentEtage)
      .forEach(box => {
        let container = this.boxesContainers.get(box._id);

        if (!container) {
          container = this.createBoxContainer(box);
          this.boxesContainers.set(box._id, container);
          this.mapContent.addChild(container);
        }

        container.x        = box.x;
        container.y        = box.y;
        container.rotation = box.rotation ?? 0;
      });

    this.app.renderer.render(this.app.stage);
  }

  // ── Utilitaires ──────────────────────────────────────────────────────────────
  private toStringId(id: any): string {
    if (!id) return '';
    if (typeof id === 'string') return id;
    if (id._id) return typeof id._id === 'string' ? id._id : id._id.toString();
    if (id.toString) return id.toString();
    return String(id);
  }

  private getContratBoxId(contrat: any): string {
    return this.toStringId(contrat.idBox || contrat.boxId);
  }

  private getContrat(boxId: string): Contrat | undefined {
    return this.contrats.find(c => {
      if (this.getContratBoxId(c) !== this.toStringId(boxId)) return false;
      return c.statut === 'ACTIF';
    });
  }

  private getBoutique(contrat: Contrat): Boutique | undefined {
    if (contrat.idBoutique && typeof contrat.idBoutique === 'object' && (contrat.idBoutique as any).nom) {
      return contrat.idBoutique as any;
    }
    if (contrat.idBoutique) {
      return this.boutiques.find(b =>
        this.toStringId(b._id) === this.toStringId(contrat.idBoutique)
      );
    }
    if ((contrat as any).userId) {
      const user = this.users.find((u: any) =>
        this.toStringId(u._id) === this.toStringId((contrat as any).userId)
      );
      if (user) return {
        _id:          user._id,
        nom:          user.nom,
        typeCommerce: user.TypeCommerce ?? 'Inconnu',
        mail:         user.mail,
      } as unknown as Boutique;
    }
    return undefined;
  }

  // ── Création du container visuel d'une box ───────────────────────────────────
  private createBoxContainer(box: Box): PIXI.Container {
    const w = box.width  ?? 140;
    const h = box.height ?? 100;

    const boxIdStr = this.toStringId(box._id);
    const contrat  = this.getContrat(boxIdStr);
    const boutique = contrat ? this.getBoutique(contrat) : undefined;

    // ── Mode "vue boutique" (maBoxId fourni) ──
    const estMaBox    = this.maBoxId !== null && boxIdStr === this.maBoxId;
    const estOccupee  = !!contrat;
    const modeVueBoutique = this.maBoxId !== null;

    // ── Mode "vue client" (filtre par type) ──
    const isFiltered = !modeVueBoutique && this.selectedTypeCommerce
      ? boutique?.typeCommerce !== this.selectedTypeCommerce
      : false;

    const container = new PIXI.Container();
    container.pivot.set(w / 2, h / 2);

    // Déterminer la couleur selon le mode
    let wallColor: number | undefined;
    let bgColor: number | undefined;

    if (modeVueBoutique) {
      if (estMaBox) {
        wallColor = this.COLOR_MA_BOX;
        bgColor   = this.lightenColor(this.COLOR_MA_BOX, 0.75);
      } else if (estOccupee) {
        wallColor = this.COLOR_OCCUPEE;
        bgColor   = this.lightenColor(this.COLOR_OCCUPEE, 0.85);
      } else {
        // Libre
        wallColor = this.COLOR_LIBRE;
        bgColor   = this.lightenColor(this.COLOR_LIBRE, 0.82);
      }
    } else {
      // Comportement original
      const typeColor = boutique
        ? this.boutiqueService.getColorForType(boutique.typeCommerce)
        : undefined;
      wallColor = typeColor ?? (estOccupee ? 0xff8888 : 0x888888);
      bgColor   = estOccupee
        ? (typeColor ? this.lightenColor(typeColor, 0.85) : 0xffdddd)
        : 0xffffff;
    }

    // Fond
    const background = new PIXI.Graphics();
    this.drawBackground(background, w, h, wallColor!, bgColor!);
    container.addChild(background);

    // ── Halo "ma box" — bordure épaisse pulsante autour ──
    if (estMaBox) {
      const glow = new PIXI.Graphics();
      glow.roundRect(-w/2 - 5, -h/2 - 5, w + 10, h + 10, 12)
          .fill({ color: this.COLOR_MA_BOX, alpha: 0.18 });
      glow.roundRect(-w/2 - 3, -h/2 - 3, w + 6, h + 6, 10)
          .stroke({ width: 4, color: this.COLOR_MA_BOX, alpha: 0.9 });
      container.addChildAt(glow, 0); // derrière le fond

      // Animation pulsation via ticker
      let tick = 0;
      const pulse = () => {
        tick += 0.06;
        glow.alpha = 0.6 + Math.sin(tick) * 0.4;
      };
      this.app?.ticker.add(pulse);
      // Stocker pour cleanup si besoin
      (container as any).__pulseTicker = pulse;
    }

    // Opacité réduite pour les boxes filtrées (mode client)
    container.alpha = isFiltered ? 0.25 : 1;

    // ── Textes ──
    const textContainer = new PIXI.Container();
    textContainer.rotation = -(box.rotation ?? 0);

    const labelColor = estMaBox ? 0x1b5e20 : 0x222222;

    const label = new PIXI.Text(box.nom, {
      fontSize: 14, fill: labelColor,
      fontWeight: 'bold', align: 'center'
    });
    label.anchor.set(0.5);
    label.y = boutique ? -8 : 0;
    textContainer.addChild(label);

    if (boutique) {
      const bLabel = new PIXI.Text(boutique.nom, {
        fontSize: 12, fill: estMaBox ? 0x2e7d32 : 0x333333, align: 'center',
        wordWrap: true, wordWrapWidth: w * 0.85, breakWords: true
      });
      bLabel.anchor.set(0.5);
      bLabel.y = 10;
      textContainer.addChild(bLabel);

      const tLabel = new PIXI.Text(boutique.typeCommerce, {
        fontSize: 10, fill: 0x666666,
        fontStyle: 'italic', align: 'center'
      });
      tLabel.anchor.set(0.5);
      tLabel.y = 26;
      textContainer.addChild(tLabel);
    } else if (!estOccupee && modeVueBoutique) {
      // Box libre — afficher "Libre"
      const libreLabel = new PIXI.Text('Libre', {
        fontSize: 11, fill: 0x4a7c59,
        fontStyle: 'italic', align: 'center'
      });
      libreLabel.anchor.set(0.5);
      libreLabel.y = 14;
      textContainer.addChild(libreLabel);
    }

    container.addChild(textContainer);

    // ── Épingle "ma boutique" ──
    if (estMaBox) {
      const pin = new PIXI.Text('📍', { fontSize: 18 });
      pin.anchor.set(0.5);
      pin.x =  w / 2 - 16;
      pin.y = -h / 2 + 14;
      pin.rotation = -(box.rotation ?? 0);
      container.addChild(pin);
    }

    // ── Cœur favori (mode client uniquement) ──
    if (!modeVueBoutique && boutique) {
      const boutiqueId = this.toStringId(boutique._id);
      const estFavori  = this.idsFavoris.has(boutiqueId);
      const heartText  = new PIXI.Text(estFavori ? '❤️' : '🤍', { fontSize: 14 });
      heartText.anchor.set(0.5);
      heartText.x =  w / 2 - 14;
      heartText.y = -h / 2 + 12;
      heartText.rotation = -(box.rotation ?? 0);
      container.addChild(heartText);
    }

    // ── Zone cliquable ──
    const cliquable = !isFiltered && (
      (!modeVueBoutique && !!boutique) ||
      (modeVueBoutique && !!boutique && !estMaBox)
    );

    if (cliquable) {
      const hitArea = new PIXI.Graphics();
      hitArea.rect(-w/2, -h/2, w, h).fill(0x000000, 0);
      hitArea.eventMode = 'static';
      hitArea.cursor    = 'pointer';

      hitArea.on('pointerover', () => {
        background.tint = 0xdddddd;
        this.app?.renderer.render(this.app.stage);
      });
      hitArea.on('pointerout', () => {
        background.tint = 0xffffff;
        this.app?.renderer.render(this.app.stage);
      });
      hitArea.on('pointerdown', () => {
        this.boutiqueClick.emit(box);
      });

      container.addChild(hitArea);
    }

    return container;
  }

  // ── Dessin du fond de box ─────────────────────────────────────────────────────
  private drawBackground(
    graphics:  PIXI.Graphics,
    w:         number,
    h:         number,
    wallColor: number,
    bgColor:   number,
  ) {
    const doorWidth = w * 0.6;

    graphics.clear();
    graphics.roundRect(-w/2, -h/2, w, h, 8).fill(bgColor);
    graphics.setStrokeStyle({ width: 2, color: wallColor });

    const left      = -w / 2;
    const right     =  w / 2;
    const top       = -h / 2;
    const bottom    =  h / 2;
    const doorLeft  = -doorWidth / 2;
    const doorRight =  doorWidth / 2;

    graphics.moveTo(left,      top);    graphics.lineTo(right,      top);
    graphics.moveTo(right,     top);    graphics.lineTo(right,      bottom);
    graphics.moveTo(left,      bottom); graphics.lineTo(doorLeft,   bottom);
    graphics.moveTo(doorRight, bottom); graphics.lineTo(right,      bottom);
    graphics.moveTo(left,      bottom); graphics.lineTo(left,       top);
    graphics.stroke();
  }

  private lightenColor(color: number, factor: number): number {
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8)  & 0xFF;
    const b =  color        & 0xFF;
    return (Math.round(r + (255-r)*factor) << 16) |
           (Math.round(g + (255-g)*factor) << 8)  |
            Math.round(b + (255-b)*factor);
  }

  ngOnDestroy() {
    if (this.app) {
      // Nettoyer les tickers de pulsation
      this.boxesContainers.forEach(c => {
        if ((c as any).__pulseTicker) {
          this.app?.ticker.remove((c as any).__pulseTicker);
        }
      });
      this.app.stage.removeAllListeners();
      this.app.destroy(true, { children: true, texture: true });
      this.app = undefined;
    }
  }
}