import {
  AfterViewInit, Component, ElementRef, EventEmitter,
  Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild
} from '@angular/core';
import * as PIXI from 'pixi.js';
import { Box, Boutique, Contrat, Etage } from '@app/model/mall-models';
import { BoutiqueService } from '@app/services/boutique.service';

@Component({
  selector: 'app-client-mall-map',
  standalone: true,
  template: `<div #mapContainer class="map-pixi"></div>`,
  styles: [`
    :host { display: block; width: 100%; height: 100%; position: relative; }
    .map-pixi { width: 100%; height: 100%; background: #e5e5e5; }
    canvas { width: 100% !important; height: 100% !important; }
  `]
})
export class ClientMallMapComponent implements AfterViewInit, OnDestroy, OnChanges {

  @Input() boxs: Box[] = [];
  @Input() boutiques: Boutique[] = [];
  @Input() users: any[] = [];
  @Input() contrats: Contrat[] = [];
  @Input() currentEtage: Etage = 'RC';
  @Input() selectedTypeCommerce: string | null = null;
  @Input() idsFavoris: Set<string> = new Set();

  @Output() boutiqueClick = new EventEmitter<Box>();

  @ViewChild('mapContainer') mapContainerRef!: ElementRef<HTMLDivElement>;

  private app?: PIXI.Application;

  // ── Même structure que MallMapComponent ──
  private root       = new PIXI.Container();
  private mapContent = new PIXI.Container();

  private boxesContainers: Map<string, PIXI.Container> = new Map();

  // ── Même SCALE_FACTOR que l'admin ──
  private readonly SCALE_FACTOR = 0.9;

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

    // ── Même hiérarchie root → mapContent ──
    this.mapContent.scale.set(this.SCALE_FACTOR);
    this.root.addChild(this.mapContent);
    this.app.stage.addChild(this.root);

    this.drawMap(true);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.app) return;

    if (changes['selectedTypeCommerce'] || changes['idsFavoris']) {
      this.boxesContainers.forEach(c => this.mapContent.removeChild(c));
      this.boxesContainers.clear();
    }

    if (changes['users'] || changes['contrats'] || changes['boutiques']) {
      this.boxesContainers.forEach(c => this.mapContent.removeChild(c));
      this.boxesContainers.clear();
    }

    if (
      changes['boxs']                  ||
      changes['contrats']              ||
      changes['boutiques']             ||
      changes['users']                 ||
      changes['currentEtage']          ||
      changes['selectedTypeCommerce']  ||
      changes['idsFavoris']
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

      // ── Même fond que l'admin ──
      const bg = new PIXI.Graphics()
        .rect(
          0, 0,
          this.app.screen.width  / this.SCALE_FACTOR,
          this.app.screen.height / this.SCALE_FACTOR
        )
        .fill(0xf8f9f5);
      this.mapContent.addChild(bg);
    }

    // Supprimer les boxes qui n'existent plus
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

  // ── Utilitaires identiques à MallMapComponent ──
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
    const now = new Date();
    return this.contrats.find(c => {
      if (this.getContratBoxId(c) !== this.toStringId(boxId)) return false;
      if (c.statut !== 'ACTIF') return false;
      return now >= new Date(c.dateDebut) && now <= new Date(c.dateFin);
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

  private createBoxContainer(box: Box): PIXI.Container {
  const w = box.width  ?? 140;
  const h = box.height ?? 100;

  const contrat  = this.getContrat(box._id);
  const boutique = contrat ? this.getBoutique(contrat) : undefined;

  const isFiltered = this.selectedTypeCommerce
    ? boutique?.typeCommerce !== this.selectedTypeCommerce
    : false;

  const container = new PIXI.Container();
  container.pivot.set(w / 2, h / 2);

  const typeColor = boutique
    ? this.boutiqueService.getColorForType(boutique.typeCommerce)
    : undefined;

  const background = new PIXI.Graphics();
  this.drawBackground(background, w, h, box.statut === 'LIBRE', typeColor);
  container.addChild(background);
  container.alpha = isFiltered ? 0.25 : 1;

  // ── Textes ──
  const textContainer = new PIXI.Container();
  textContainer.rotation = -(box.rotation ?? 0);

  const label = new PIXI.Text(box.nom, {
    fontSize: 14, fill: 0x222222,
    fontWeight: 'bold', align: 'center'
  });
  label.anchor.set(0.5);
  label.y = boutique ? -8 : 0;
  textContainer.addChild(label);

  if (boutique) {
    const bLabel = new PIXI.Text(boutique.nom, {
      fontSize: 12, fill: 0x333333, align: 'center',
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
  }

  container.addChild(textContainer);

  // ── Cœur favori ──────────────────────────────
  if (boutique) {
    const boutiqueId = this.toStringId(boutique._id);
    const estFavori  = this.idsFavoris.has(boutiqueId);

    const heartText = new PIXI.Text(estFavori ? '❤️' : '🤍', {
      fontSize: 14,
    });
    heartText.anchor.set(0.5);
    // Positionner en haut à droite de la box
    heartText.x =  w / 2 - 14;
    heartText.y = -h / 2 + 12;
    heartText.rotation = -(box.rotation ?? 0);

    container.addChild(heartText);
  }
  // ─────────────────────────────────────────────

  // ── Zone cliquable ──
  if (boutique && !isFiltered) {
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

  // ── Même logique que updateBoxBackground de l'admin ──
  private drawBackground(
    graphics:  PIXI.Graphics,
    w:         number,
    h:         number,
    isFree:    boolean,
    typeColor?: number
  ) {
    const doorWidth = w * 0.6;

    graphics.clear();

    let bgColor:   number;
    let wallColor: number;

    if (typeColor !== undefined) {
      wallColor = typeColor;
      bgColor   = this.lightenColor(typeColor, 0.85);
    } else if (isFree) {
      bgColor   = 0xffffff;
      wallColor = 0x888888;
    } else {
      // occupée sans type connu → fallback rouge
      bgColor   = 0xffdddd;
      wallColor = 0xff8888;
    }

    graphics.roundRect(-w/2, -h/2, w, h, 8).fill(bgColor);
    graphics.setStrokeStyle({ width: 2, color: wallColor });

    const left     = -w / 2;
    const right    =  w / 2;
    const top      = -h / 2;
    const bottom   =  h / 2;
    const doorLeft = -doorWidth / 2;
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
      this.app.stage.removeAllListeners();
      this.app.destroy(true, { children: true, texture: true });
      this.app = undefined;
    }
  }

}