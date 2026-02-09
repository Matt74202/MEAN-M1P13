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

  @ViewChild('mapContainer') mapContainerRef!: ElementRef<HTMLDivElement>;

  private app?: PIXI.Application;
  private root = new PIXI.Container();
  private mapContent = new PIXI.Container();

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

    this.drawMap();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (this.app && (changes['editMode'] || changes['currentEtage'] || changes['boxs'])) {
      this.drawMap();
    }
  }

  forceRedraw() {
    if (this.app) this.drawMap();
  }

  private drawMap() {
    if (!this.app) return;

    this.mapContent.removeChildren();

    const W = this.app.screen.width;
    const H = this.app.screen.height;

    // Fond général (couloirs)
    const background = new PIXI.Graphics();
    background.rect(0, 0, W, H).fill(0xf5f5f5);
    this.mapContent.addChild(background);

    // Hall central vide
    const hallX = W * 0.35;
    const hallW = W * 0.30;
    const hall = new PIXI.Graphics();
    hall.roundRect(hallX, 0, hallW, H, 30).fill(0xfafafa);
    this.mapContent.addChild(hall);

    // Boxes
    const visible = this.boxs.filter(b => b.etage === this.currentEtage);

    visible.forEach(box => {
      const type = this.types.find(t => t._id === box.idType);
      if (!type) return;

      const x = box.x;
      const y = box.y;
      const w = type.longueur;
      const h = type.largeur;

      let floorColor = 0xffffff;
      let wallColor = 0xaaaaaa;
      let decoColor = 0xd0d0d0;
      let textColor = 0x222222;

      if (box.statut === 'OCCUPE') floorColor = 0xfafafa;
      if (box.statut === 'NON_FONCTIONNEL') {
        floorColor = 0xffeeee;
        wallColor = 0xff9999;
        textColor = 0xb71c1c;
      }

      const container = new PIXI.Container();

      // Ombre
      const shadow = new PIXI.Graphics();
      shadow.roundRect(x + 3, y + 3, w, h, 6).fill(0x000000, 0.1);
      container.addChild(shadow);

      // Sol
      const room = new PIXI.Graphics();
      room.roundRect(x, y, w, h, 6).fill(floorColor);
      container.addChild(room);

      // Murs
      const t = 2;
      const wall = new PIXI.Graphics();
      wall
        .rect(x, y, w, t)
        .rect(x, y, t, h)
        .rect(x + w - t, y, t, h)
        .rect(x, y + h - t, w, t)
        .fill(wallColor);
      container.addChild(wall);

      // Porte
      const doorW = 20;
      const door = new PIXI.Graphics();
      door.rect(x + w / 2 - doorW / 2, y + h - t, doorW, t).fill(0xf2f2f2);
      container.addChild(door);

      // Comptoir
      const counter = new PIXI.Graphics();
      counter.roundRect(x + 10, y + h - 28, w - 20, 12, 3).fill(0xc8b090);
      container.addChild(counter);

      // Étagères
      const shelfL = new PIXI.Graphics();
      shelfL.rect(x + 10, y + 20, 10, h - 60).fill(decoColor);
      container.addChild(shelfL);

      const shelfR = new PIXI.Graphics();
      shelfR.rect(x + w - 20, y + 20, 10, h - 60).fill(decoColor);
      container.addChild(shelfR);

      // Déco centrale
      const deco = new PIXI.Graphics();
      deco.roundRect(x + w / 2 - 12, y + 30, 24, 24, 6).fill(0xe0e0e0);
      container.addChild(deco);

      // Cadre
      const frame = new PIXI.Graphics();
      frame.lineStyle(2, 0x555555, 0.7);
      frame.roundRect(x - 2, y - 2, w + 4, h + 4, 8);
      container.addChild(frame);

      // Interaction
      room.eventMode = 'static';
      room.cursor = 'pointer';
      room.on('pointerdown', () => this.selectBox.emit(box));

      // Nom / statut
      const contrat = this.contrats.find(c => c.idBox === box._id && c.statut === 'ACTIF');
      let name = box._id;
      if (contrat) {
        const b = this.boutiques.find(bb => bb._id === contrat.idBoutique);
        if (b) name = b.nom;
      } else if (box.statut === 'NON_FONCTIONNEL') {
        name = 'Non fonctionnel';
      }

      const label = new PIXI.Text({
        text: name,
        style: {
          fontFamily: 'Arial',
          fontSize: 11,
          fill: textColor,
          fontWeight: '600',
          align: 'center',
          wordWrap: true,
          wordWrapWidth: w - 12
        }
      });
      label.anchor.set(0.5);
      label.x = x + w / 2;
      label.y = y + h / 2;
      container.addChild(label);

      // Icône changement statut
      if (this.editMode) {
        const icon = new PIXI.Text(box.statut === 'LIBRE' ? '✕' : '✓', {
          fontSize: 18,
          fill: box.statut === 'LIBRE' ? 0xc62828 : 0x2e7d32,
          fontWeight: 'bold'
        });
        icon.x = x + w - 16;
        icon.y = y + 4;
        icon.eventMode = 'static';
        icon.cursor = 'pointer';
        icon.on('pointerdown', e => {
          e.stopPropagation();
          this.statusChange.emit({
            box,
            newStatus: box.statut === 'LIBRE' ? 'NON_FONCTIONNEL' : 'LIBRE'
          });
        });
        container.addChild(icon);
      }

      this.mapContent.addChild(container);
    });

    if (this.app) this.app.renderer.render(this.app.stage);
  }

  ngOnDestroy() {
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true });
      this.app = undefined;
    }
  }
}