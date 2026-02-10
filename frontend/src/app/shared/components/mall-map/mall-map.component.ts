import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import * as PIXI from 'pixi.js';

import { TypeBoutique, Box, Boutique, Contrat, Etage } from '@app/model/mall-models';

@Component({
  selector: 'app-mall-map',
  standalone: true,
  template: `<div #mapContainer class="map-pixi"></div>`,
  styles: [`
    :host { display: block; width: 100%; height: 100%; position: relative; }
    .map-pixi { width: 100%; height: 100%; background: #e5e5e5; }
    canvas { width: 100% !important; height: 100% !important; }
  `]
})
export class MallMapComponent implements AfterViewInit, OnDestroy, OnChanges {

  @Input() types: TypeBoutique[] = [];
  @Input() boxs: Box[] = [];
  @Input() boutiques: Boutique[] = [];
  @Input() contrats: Contrat[] = [];
  @Input() editMode = false;
  @Input() currentEtage: Etage = 'RC';

  @Output() selectBox = new EventEmitter<Box>();
  @Output() editBox = new EventEmitter<Box>();
  @Output() statusChange = new EventEmitter<{ box: Box; newStatus: 'LIBRE' | 'NON_FONCTIONNEL' }>();
  @Output() deleteBox = new EventEmitter<Box>();

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

  async ngAfterViewInit() {
    const el = this.mapContainerRef.nativeElement;
    const rect = el.getBoundingClientRect();

    this.app = new PIXI.Application();
    await this.app.init({
      width: rect.width || 1600,
      height: rect.height || 900,
      backgroundColor: 0xe5e5e5,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      resizeTo: el
    });

    el.appendChild(this.app.canvas);

    this.root.addChild(this.mapContent);
    this.app.stage.addChild(this.root);

    this.app.stage.eventMode = 'static';

    this.app.stage.on('pointermove', (e) => {
      if (!this.isDragging || !this.currentDraggedBox || !this.currentDraggedContainer) return;
      this.currentDraggedBox.x = e.global.x - this.dragOffsetX;
      this.currentDraggedBox.y = e.global.y - this.dragOffsetY;
      this.currentDraggedContainer.x = this.currentDraggedBox.x;
      this.currentDraggedContainer.y = this.currentDraggedBox.y;
    });

    this.app.stage.on('pointerup', () => this.endDrag());
    this.app.stage.on('pointerupoutside', () => this.endDrag());

    this.drawMap(true);
  }

  private endDrag() {
    this.isDragging = false;
    this.currentDraggedBox = null;
    this.currentDraggedContainer = null;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.app && (changes['editMode'] || changes['currentEtage'] || changes['boxs'])) {
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

    const bg = new PIXI.Graphics().rect(0, 0, this.app.screen.width, this.app.screen.height).fill(0xf5f5f5);
    this.mapContent.addChild(bg);

    const hall = new PIXI.Graphics()
      .roundRect(this.app.screen.width * 0.35, 0, this.app.screen.width * 0.3, this.app.screen.height, 30)
      .fill(0xfafafa);
    this.mapContent.addChild(hall);
  }

  // Nettoyage des containers disparus
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

      const needsRecreate = !container ||
                           container.children.length < 4 ||  // +1 pour le bouton rotation
                           (this.editMode !== !!container.getChildByName('statusIcon'));

      if (needsRecreate) {
        if (container) {
          this.mapContent.removeChild(container);
          this.boxesContainers.delete(box._id);
        }
        container = this.createBoxContainer(box);
        this.boxesContainers.set(box._id, container);
        this.mapContent.addChild(container);
      }

      const boxContainer: PIXI.Container = container!;

      boxContainer.x = box.x;
      boxContainer.y = box.y;
      boxContainer.rotation = box.rotation ?? 0;
    });

  this.app.renderer.render(this.app.stage);
}

  private createRotateButton(box: Box, container: PIXI.Container): PIXI.Container {
    const rotateBtn = new PIXI.Container();
    rotateBtn.name = 'rotateBtn';
    rotateBtn.x = (box.width ?? 140) / 2 + 35;
    rotateBtn.y = 0;

    const circle = new PIXI.Graphics().circle(0, 0, 18).fill(0x0288d1);
    rotateBtn.addChild(circle);

    const arrow = new PIXI.Text('↻', {
      fontSize: 24,
      fill: 0xffffff,
      fontWeight: 'bold'
    });
    arrow.anchor.set(0.5);
    rotateBtn.addChild(arrow);

    rotateBtn.eventMode = 'static';
    rotateBtn.cursor = 'pointer';

    rotateBtn.on('pointerdown', e => {
      e.stopPropagation();
      const current = box.rotation ?? 0;
      box.rotation = (current + Math.PI / 2) % (Math.PI * 2);
      container.rotation = box.rotation;
      this.app?.renderer.render(this.app.stage);
    });

    return rotateBtn;
  }

  private updateNonFunctionalText(container: PIXI.Container, isFree: boolean, w: number, h: number): void {
  // Supprimer l'ancien texte s'il existe
  const existing = container.children.find(c => c.name === 'nonFunctionalText');
  if (existing) {
    container.removeChild(existing);
  }

  if (!isFree) {
    const text = new PIXI.Text('NON FONCTIONNEL', {
      fontSize: 11,                     // plus petit pour moins encombrer
      fill: 0xb71c1c,
      fontWeight: 'bold',
      align: 'center',
      wordWrap: true,
      wordWrapWidth: w * 0.8,
      breakWords: true,
      fontStyle: 'italic',              // option : italique pour le différencier
    });

    text.name = 'nonFunctionalText';
    text.anchor.set(0.5, 0.5);
    text.x = 0;
    text.y = 18;                      // ← ici : décalé vers le bas (ajuste 18 → 22 ou 25 si besoin)
    text.alpha = 0.65;                // transparence pour ne pas masquer l'ID

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

  const background = new PIXI.Graphics();
  this.updateBoxBackground(background, container as any, box.statut === 'LIBRE');
  container.addChild(background);
  (container as any).backgroundRef = background;

  const label = new PIXI.Text(box._id, {
    fontSize: 14,
    fill: 0x222222,
    align: 'center'
  });
  label.anchor.set(0.5);
  container.addChild(label);

  const dragArea = new PIXI.Graphics();
  dragArea.rect(-w/2, -h/2, w, h).fill(0x000000, 0);
  dragArea.eventMode = 'static';
  dragArea.cursor = 'move';
  container.addChild(dragArea);

  if (this.editMode) {
    const isFree = box.statut === 'LIBRE';

    // ───────────────────────────────
    // Cercle d'état ─ haut gauche (taille alignée avec les autres icônes)
    // ───────────────────────────────
    const statusCircle = new PIXI.Graphics();
    const circleRadius = 14; // rayon → diamètre ≈ 28 px (proche des icônes 28–32 px)
    statusCircle.circle(-w/2 + 24, -h/2 + 20, circleRadius);
    statusCircle.fill(isFree ? 0x2e7d32 : 0xd32f2f); // vert / rouge
    statusCircle.eventMode = 'static';
    statusCircle.cursor = 'pointer';

    (container as any).statusCircleRef = statusCircle;

    statusCircle.on('pointerdown', (e) => {
      e.stopPropagation();

      const newIsFree = box.statut === 'NON_FONCTIONNEL'; // inverse l'état actuel
      const newStatus: 'LIBRE' | 'NON_FONCTIONNEL' = newIsFree ? 'LIBRE' : 'NON_FONCTIONNEL';

      box.statut = newStatus;

      // Mise à jour immédiate du cercle
      statusCircle.clear();
      statusCircle.circle(-w/2 + 24, -h/2 + 20, circleRadius);
      statusCircle.fill(newIsFree ? 0x2e7d32 : 0xd32f2f);

      // Mise à jour du fond du box
      this.updateBoxBackground(background, container as any, newIsFree);

      // Mise à jour du texte "NON FONCTIONNEL"
      this.updateNonFunctionalText(container, newIsFree, w, h);

      this.statusChange.emit({ box, newStatus });
      this.app?.renderer.render(this.app.stage);
    });

    container.addChild(statusCircle);

    // Création initiale du texte "NON FONCTIONNEL" si besoin
    this.updateNonFunctionalText(container, isFree, w, h);

    // ───────────────────────────────
    // Rotation ─ milieu haut
    // ───────────────────────────────
    const rotateIcon = new PIXI.Text('↻', {
      fontSize: 28,
      fill: 0x0288d1,
      fontWeight: 'bold'
    });
    rotateIcon.x = 0;
    rotateIcon.y = -h/2 + 8;
    rotateIcon.eventMode = 'static';
    rotateIcon.cursor = 'pointer';

    rotateIcon.on('pointerdown', (e) => {
      e.stopPropagation();
      const current = box.rotation ?? 0;
      box.rotation = (current + Math.PI / 2) % (Math.PI * 2);
      container.rotation = box.rotation;

      container.scale.set(1.08);
      setTimeout(() => container.scale.set(1), 140);

      this.app?.renderer.render(this.app.stage);
    });

    container.addChild(rotateIcon);

    // ───────────────────────────────
    // Supprimer ─ haut droit
    // ───────────────────────────────
    const trash = new PIXI.Text('×', {
      fontSize: 32,
      fill: 0xd32f2f,
      fontWeight: 'bold'
    });
    trash.x = w/2 - 38;
    trash.y = -h/2 + 8;
    trash.eventMode = 'static';
    trash.cursor = 'pointer';

    trash.on('pointerdown', (e) => {
      e.stopPropagation();
      if (confirm(`Supprimer définitivement ${box._id} ?`)) {
        container.alpha = 0.3;
        setTimeout(() => {
          this.deleteBox.emit(box);
        }, 150);
      }
    });

    container.addChild(trash);
  }

  // Drag
  dragArea.on('pointerdown', e => {
    if (!this.editMode) return;
    this.isDragging = true;
    this.currentDraggedBox = box;
    this.currentDraggedContainer = container;
    this.dragOffsetX = e.global.x - box.x;
    this.dragOffsetY = e.global.y - box.y;
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

  private updateBoxBackground(graphics: PIXI.Graphics, container: any, isFree: boolean) {
    const w = container.boxWidth as number;
    const h = container.boxHeight as number;

    graphics.clear();
    graphics.roundRect(-w/2, -h/2, w, h, 8)
      .fill(isFree ? 0xffffff : 0xffdddd)
      .stroke({ width: 2, color: isFree ? 0x888888 : 0xff8888 });
  }

  ngOnDestroy() {
    if (this.app) {
      this.app.stage.removeAllListeners();
      this.app.destroy(true, { children: true, texture: true });
      this.app = undefined;
    }
  }
}