import {
  AfterViewInit, Component, ElementRef, EventEmitter,
  Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild
} from '@angular/core';
import * as PIXI from 'pixi.js';
import { TypeBoutique, Box, Boutique, Contrat, Etage } from '@app/model/mall-models';
import { BoutiqueService } from '@app/services/boutique.service';

@Component({
  selector: 'app-mall-map',
  standalone: true,
  template: `<div #mapContainer class="map-pixi"></div>`,
  styles: [`
    :host { display: block; width: 100%; height: 100%; position: relative; }
    .map-pixi {
      width: 100%;
      height: 100%;
      background: #e5e5e5;
      overflow-x: auto;
      overflow-y: hidden;
    }
    canvas { display: block; }
  `]
})
export class MallMapComponent implements AfterViewInit, OnDestroy, OnChanges {

  @Input() types: TypeBoutique[] = [];
  @Input() boxs: Box[] = [];
  @Input() boutiques: Boutique[] = [];
  @Input() users: any[] = [];
  @Input() contrats: Contrat[] = [];
  @Input() editMode = false;
  @Input() currentEtage: Etage = 'RC';

  @Output() selectBox = new EventEmitter<Box>();
  @Output() editBox = new EventEmitter<Box>();
  @Output() statusChange = new EventEmitter<{ box: Box; newStatus: 'LIBRE' | 'NON_FONCTIONNEL' }>();
  @Output() deleteBox = new EventEmitter<Box>();
  @Output() loyerChange = new EventEmitter<{ box: Box; newLoyer: number }>();
  @Output() boxPositionChanged = new EventEmitter<Box>();

  @ViewChild('mapContainer') mapContainerRef!: ElementRef<HTMLDivElement>;

  private app?: PIXI.Application;
  private root = new PIXI.Container();
  private mapContent = new PIXI.Container();
  private boxesContainers: Map<string, PIXI.Container> = new Map();
  private selectedBoxId: string | null = null;

  private isDragging = false;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private currentDraggedBox: Box | null = null;
  private currentDraggedContainer: PIXI.Container | null = null;

  // Taille fixe + scroll horizontal : identique à l'original
  private readonly SCALE_FACTOR = 0.8;

  constructor(private boutiqueService: BoutiqueService) {}

  async ngAfterViewInit() {
    const el = this.mapContainerRef.nativeElement;

    this.app = new PIXI.Application();
    await this.app.init({
      width: 1600,
      height: 900,
      backgroundColor: 0xf8f9f5,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      // Pas de resizeTo : canvas fixe 1600x900, overflow-x: auto gère le reste
    });

    el.appendChild(this.app.canvas);

    this.mapContent.scale.set(this.SCALE_FACTOR);
    this.root.addChild(this.mapContent);
    this.app.stage.addChild(this.root);
    this.app.stage.eventMode = 'static';

    this.app.stage.on('pointermove', (e) => {
      if (!this.isDragging || !this.currentDraggedBox || !this.currentDraggedContainer) return;
      const adjustedX = e.global.x / this.SCALE_FACTOR;
      const adjustedY = e.global.y / this.SCALE_FACTOR;
      this.currentDraggedBox.x = adjustedX - this.dragOffsetX;
      this.currentDraggedBox.y = adjustedY - this.dragOffsetY;
      this.currentDraggedContainer.x = this.currentDraggedBox.x;
      this.currentDraggedContainer.y = this.currentDraggedBox.y;
    });

    this.app.stage.on('pointerup', () => this.endDrag());
    this.app.stage.on('pointerupoutside', () => this.endDrag());

    this.drawMap(true);
  }

  private endDrag() {
    if (this.isDragging && this.currentDraggedBox) {
      this.boxPositionChanged.emit(this.currentDraggedBox);
    }
    this.isDragging = false;
    this.currentDraggedBox = null;
    this.currentDraggedContainer = null;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!this.app) return;
    if (changes['users']) {
      this.boxesContainers.forEach(cont => this.mapContent.removeChild(cont));
      this.boxesContainers.clear();
    }
    if (changes['editMode'] || changes['currentEtage'] || changes['boxs'] ||
        changes['contrats'] || changes['boutiques'] || changes['users']) {
      this.drawMap();
    }
  }

  public forceRedraw() { this.drawMap(false); }

  private getContratBoxId(contrat: any): string {
    return this.toStringId(contrat.idBox || contrat.boxId);
  }

  private drawMap(isInitial = false) {
    if (!this.app) return;

    if (isInitial) {
      this.mapContent.removeChildren();
      this.boxesContainers.clear();
      const bg = new PIXI.Graphics()
        .rect(0, 0, this.app.screen.width / this.SCALE_FACTOR, this.app.screen.height / this.SCALE_FACTOR)
        .fill(0xf8f9f5);
      this.mapContent.addChild(bg);
    }

    for (const [id, cont] of this.boxesContainers.entries()) {
      if (!this.boxs.some(b => b._id === id && b.etage === this.currentEtage)) {
        this.mapContent.removeChild(cont);
        this.boxesContainers.delete(id);
      }
    }

    this.boxs.filter(b => b.etage === this.currentEtage).forEach(box => {
      let container = this.boxesContainers.get(box._id);
      const hasStatusIcon = !!container?.getChildByName('statusIcon');
      const needsRecreate = !container ||
        (this.editMode && !hasStatusIcon) || (!this.editMode && hasStatusIcon);

      if (needsRecreate) {
        if (container) { this.mapContent.removeChild(container); this.boxesContainers.delete(box._id); }
        container = this.createBoxContainer(box);
        this.boxesContainers.set(box._id, container);
        this.mapContent.addChild(container);
      }

      container!.x = box.x;
      container!.y = box.y;
      container!.rotation = box.rotation ?? 0;
    });

    this.app.renderer.render(this.app.stage);
  }

  private toStringId(id: any): string {
    if (!id) return '';
    if (typeof id === 'string') return id;
    if (id._id) return typeof id._id === 'string' ? id._id : id._id.toString();
    if (id.toString) return id.toString();
    return String(id);
  }

  private getActiveContratForBox(boxId: string): Contrat | undefined {
    const now = new Date();
    return this.contrats.find(c => {
      const contratBoxId = this.getContratBoxId(c);
      if (contratBoxId !== this.toStringId(boxId)) return false;
      if (c.statut !== 'ACTIF') return false;
      return now >= new Date(c.dateDebut) && now <= new Date(c.dateFin);
    });
  }

  private getBoutiqueForContrat(contrat: Contrat): Boutique | undefined {
    if (contrat.idBoutique && typeof contrat.idBoutique === 'object' && (contrat.idBoutique as any).nom) {
      return contrat.idBoutique as any;
    }
    if (contrat.idBoutique) {
      return this.boutiques.find(b => this.toStringId(b._id) === this.toStringId(contrat.idBoutique));
    }
    if ((contrat as any).userId) {
      const userId = this.toStringId((contrat as any).userId);
      const user = this.users?.find((u: any) => this.toStringId(u._id) === userId);
      if (user) {
        return { _id: user._id, nom: user.nom, typeCommerce: (user as any).TypeCommerce ?? 'Inconnu', mail: user.mail } as unknown as Boutique;
      }
    }
    return undefined;
  }

  private getColorForType(typeCommerce: string): number {
    return this.boutiqueService.getColorForType(typeCommerce);
  }

  private updateNonFunctionalText(container: PIXI.Container, isFree: boolean, w: number, h: number): void {
    const existing = container.children.find(c => c.name === 'nonFunctionalText');
    if (existing) container.removeChild(existing);
    if (!isFree) {
      const text = new PIXI.Text('NON FONCTIONNEL', {
        fontSize: 11, fill: 0xb71c1c, fontWeight: 'bold', align: 'center',
        wordWrap: true, wordWrapWidth: w * 0.8, breakWords: true, fontStyle: 'italic',
      });
      text.name = 'nonFunctionalText';
      text.anchor.set(0.5, 0.5);
      text.x = 0; text.y = 18; text.alpha = 0.65;
      container.addChild(text);
    }
  }

  private createBoxContainer(box: Box): PIXI.Container {
    const w = box.width ?? 140;
    const h = box.height ?? 100;

    const container = new PIXI.Container();
    container.pivot.set(w / 2, h / 2);
    container.x = box.x;
    container.y = box.y;
    container.rotation = box.rotation ?? 0;
    (container as any).boxWidth = w;
    (container as any).boxHeight = h;

    const activeContrat = this.getActiveContratForBox(box._id);
    const boutique = activeContrat ? this.getBoutiqueForContrat(activeContrat) : undefined;
    const typeColor = boutique ? this.getColorForType(boutique.typeCommerce) : undefined;

    const background = new PIXI.Graphics();
    this.updateBoxBackground(background, container as any, box.statut === 'LIBRE', typeColor);
    container.addChild(background);
    (container as any).backgroundRef = background;

    const textContainer = new PIXI.Container();
    textContainer.rotation = -(box.rotation ?? 0);

    const label = new PIXI.Text(box.nom, { fontSize: 14, fill: 0x222222, align: 'center', fontWeight: 'bold' });
    label.anchor.set(0.5);
    label.y = -8;
    textContainer.addChild(label);

    if (boutique) {
      const boutiqueLabel = new PIXI.Text(boutique.nom, {
        fontSize: 12, fill: 0x333333, align: 'center', wordWrap: true, wordWrapWidth: w * 0.85, breakWords: true
      });
      boutiqueLabel.name = 'boutiqueLabel';
      boutiqueLabel.anchor.set(0.5);
      boutiqueLabel.y = 10;
      textContainer.addChild(boutiqueLabel);

      const typeLabel = new PIXI.Text(boutique.typeCommerce, { fontSize: 10, fill: 0x666666, align: 'center', fontStyle: 'italic' });
      typeLabel.name = 'typeLabel';
      typeLabel.anchor.set(0.5);
      typeLabel.y = 26;
      textContainer.addChild(typeLabel);
    }

    container.addChild(textContainer);

    const dragArea = new PIXI.Graphics();
    dragArea.rect(-w/2, -h/2, w, h).fill(0x000000, 0);
    dragArea.eventMode = 'static';
    dragArea.cursor = 'move';
    container.addChild(dragArea);

    if (this.editMode) {
      const isFree = box.statut === 'LIBRE';
      const iconY = -h / 2 + 22;
      const startX = w / 2 - 20;
      const gap = 28;

      const statusCircle = new PIXI.Graphics();
      const circleRadius = 9;
      statusCircle.circle(0, 0, circleRadius);
      statusCircle.fill(isFree ? 0x2e7d32 : 0xd32f2f);
      statusCircle.x = startX - gap * 3;
      statusCircle.y = iconY;
      statusCircle.eventMode = 'static';
      statusCircle.cursor = 'pointer';
      statusCircle.name = 'statusIcon';
      (container as any).statusCircleRef = statusCircle;

      statusCircle.on('pointerdown', (e) => {
        e.stopPropagation();
        const newIsFree = box.statut === 'NON_FONCTIONNEL';
        const newStatus: 'LIBRE' | 'NON_FONCTIONNEL' = newIsFree ? 'LIBRE' : 'NON_FONCTIONNEL';
        box.statut = newStatus;
        statusCircle.clear();
        statusCircle.circle(0, 0, circleRadius);
        statusCircle.fill(newIsFree ? 0x2e7d32 : 0xd32f2f);
        this.updateBoxBackground(background, container as any, newIsFree, typeColor);
        this.updateNonFunctionalText(container, newIsFree, w, h);
        this.statusChange.emit({ box, newStatus });
        this.app?.renderer.render(this.app.stage);
      });
      container.addChild(statusCircle);

      const loyerIcon = new PIXI.Text('💰', { fontSize: 20, align: 'center' });
      loyerIcon.anchor.set(0.5);
      loyerIcon.x = startX - gap * 2;
      loyerIcon.y = iconY;
      loyerIcon.eventMode = 'static';
      loyerIcon.cursor = 'pointer';
      loyerIcon.name = 'loyerIcon';
      loyerIcon.on('pointerdown', (e) => {
        e.stopPropagation();
        const currentLoyer = box.loyer ?? 0;
        const newLoyerStr = prompt(`Loyer actuel : ${currentLoyer.toLocaleString()} Ar\n\nNouveau loyer (en Ariary) :`, currentLoyer.toString());
        if (newLoyerStr === null) return;
        const newLoyer = parseInt(newLoyerStr.replace(/\s/g, ''));
        if (isNaN(newLoyer) || newLoyer < 0) { alert('Veuillez entrer un montant valide (nombre positif)'); return; }
        box.loyer = newLoyer;
        this.loyerChange.emit({ box, newLoyer });
        loyerIcon.scale.set(1.3);
        setTimeout(() => loyerIcon.scale.set(1), 150);
      });
      container.addChild(loyerIcon);

      const rotateIcon = new PIXI.Text('↻', { fontSize: 26, fill: 0x0288d1, fontWeight: 'bold' });
      rotateIcon.anchor.set(0.5);
      rotateIcon.x = startX - gap;
      rotateIcon.y = iconY;
      rotateIcon.eventMode = 'static';
      rotateIcon.cursor = 'pointer';
      rotateIcon.name = 'rotateIcon';
      rotateIcon.on('pointerdown', (e) => {
        e.stopPropagation();
        const current = box.rotation ?? 0;
        box.rotation = (current + Math.PI / 2) % (Math.PI * 2);
        container.rotation = box.rotation;
        textContainer.rotation = -box.rotation;
        container.scale.set(1.08);
        setTimeout(() => container.scale.set(1), 140);
        this.boxPositionChanged.emit(box);
        this.app?.renderer.render(this.app.stage);
      });
      container.addChild(rotateIcon);

      const trash = new PIXI.Text('×', { fontSize: 30, fill: 0xd32f2f, fontWeight: 'bold' });
      trash.anchor.set(0.5);
      trash.x = startX;
      trash.y = iconY;
      trash.eventMode = 'static';
      trash.cursor = 'pointer';
      trash.name = 'deleteIcon';
      trash.on('pointerdown', (e) => {
        e.stopPropagation();
        if (confirm(`Supprimer définitivement ${box.nom} ?`)) {
          container.alpha = 0.3;
          setTimeout(() => this.deleteBox.emit(box), 150);
        }
      });
      container.addChild(trash);
    }

    dragArea.on('pointerdown', e => {
      if (!this.editMode) return;
      this.isDragging = true;
      this.currentDraggedBox = box;
      this.currentDraggedContainer = container;
      const adjustedX = e.global.x / this.SCALE_FACTOR;
      const adjustedY = e.global.y / this.SCALE_FACTOR;
      this.dragOffsetX = adjustedX - box.x;
      this.dragOffsetY = adjustedY - box.y;
      e.stopPropagation();
    });

    container.on('pointerdown', e => {
      if (e.target !== container && e.target !== dragArea) return;
      this.selectedBoxId = box._id;
      this.selectBox.emit(box);
      this.app?.renderer.render(this.app.stage);
    });

    return container;
  }

  private updateBoxBackground(graphics: PIXI.Graphics, container: any, isFree: boolean, typeColor?: number) {
    const w = container.boxWidth as number;
    const h = container.boxHeight as number;
    const doorWidth = w * 0.6;
    graphics.clear();

    let bgColor: number, wallColor: number;
    if (typeColor !== undefined) {
      wallColor = typeColor; bgColor = this.lightenColor(typeColor, 0.85);
    } else if (isFree) {
      bgColor = 0xffffff; wallColor = 0x888888;
    } else {
      bgColor = 0xffdddd; wallColor = 0xff8888;
    }

    graphics.roundRect(-w/2, -h/2, w, h, 8).fill(bgColor);
    graphics.setStrokeStyle({ width: 2, color: wallColor });

    const left = -w/2, right = w/2, top = -h/2, bottom = h/2;
    const doorLeft = -doorWidth/2, doorRight = doorWidth/2;

    graphics.moveTo(left, top).lineTo(right, top);
    graphics.moveTo(right, top).lineTo(right, bottom);
    graphics.moveTo(left, bottom).lineTo(doorLeft, bottom);
    graphics.moveTo(doorRight, bottom).lineTo(right, bottom);
    graphics.moveTo(left, bottom).lineTo(left, top);
    graphics.stroke();
  }

  private lightenColor(color: number, factor: number): number {
    const r = (color >> 16) & 0xFF, g = (color >> 8) & 0xFF, b = color & 0xFF;
    return (Math.round(r + (255-r)*factor) << 16) | (Math.round(g + (255-g)*factor) << 8) | Math.round(b + (255-b)*factor);
  }

  ngOnDestroy() {
    if (this.app) {
      this.app.stage.removeAllListeners();
      this.app.destroy(true, { children: true, texture: true });
      this.app = undefined;
    }
  }
}

