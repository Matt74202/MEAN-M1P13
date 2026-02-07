import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild } from '@angular/core';
import * as PIXI from 'pixi.js';

import { TypeBoutique, Box, Boutique, Contrat } from '@app/model/mall-models'; 

@Component({
  selector: 'app-mall-map',
  standalone: true,
  template: `<div #mapContainer class="map-pixi"></div>`,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .map-pixi { width: 100%; height: 100%; position: relative; }
    .map-pixi canvas { position: absolute !important; inset: 0; width: 100% !important; height: 100% !important; }
  `]
})
export class MallMapComponent implements AfterViewInit, OnDestroy, OnChanges {

  @Input() types: TypeBoutique[] = [];
  @Input() boxs: Box[] = [];
  @Input() boutiques: Boutique[] = [];
  @Input() contrats: Contrat[] = [];
  @Input() modeTexture: PIXI.Texture | null = null;

  @Output() selectBox = new EventEmitter<Box>();
  @Output() editBox = new EventEmitter<Box>();

  @Input() editMode: boolean = false;

  @ViewChild('mapContainer') mapContainerRef!: ElementRef<HTMLDivElement>;

  private app?: PIXI.Application;
  private mapContainerPixi = new PIXI.Container();

  async ngAfterViewInit() {
    const container = this.mapContainerRef?.nativeElement;
    if (!container) return;

    // Petit délai pour s'assurer que le conteneur a bien ses dimensions
    await new Promise(r => setTimeout(r, 50));

    const rect = container.getBoundingClientRect();
    const w = Math.max(800, Math.round(rect.width || 1200));
    const h = Math.max(500, Math.round(rect.height || 700));

    this.app = new PIXI.Application();

    await this.app.init({
      width: w,
      height: h,
      backgroundColor: 0xffffff,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.appendChild(this.app.canvas);
    this.app.canvas.style.width = '100%';
    this.app.canvas.style.height = '100%';
    this.app.canvas.style.display = 'block';

    this.app.stage.addChild(this.mapContainerPixi);

    this.drawMap();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Redessiner quand editMode change (mais pas au premier rendu)
    if (changes['editMode'] && !changes['editMode'].firstChange && this.app) {
      this.drawMap();
    }
  }

  private drawMap(): void {
    this.mapContainerPixi.removeChildren();

    this.boxs.forEach(box => {
      const type = this.types.find(t => t._id === box.idType);
      if (!type) return;

      const g = new PIXI.Graphics();
      const fill = box.statut === 'LIBRE' ? 0xebf5ff : 0xf0f0f0;
      const border = 0xc0c0c0;
      const textColor = box.statut === 'LIBRE' ? 0x2c5282 : 0x4a5568;

      g.rect(box.x, box.y, type.longueur, type.largeur)
        .fill(fill)
        .stroke({ width: 1.5, color: border, alignment: 0.5 });

      g.eventMode = 'static';
      g.cursor = 'pointer';

      g.on('pointerover', () => { g.tint = 0xe0e0e0; });
      g.on('pointerout', () => { g.tint = 0xffffff; });
      g.on('pointerdown', () => this.selectBox.emit(box));

      this.mapContainerPixi.addChild(g);

      // Label
      const contrat = this.contrats.find(c => c.idBox === box._id && c.statut === 'ACTIF');
      let labelText = box.statut === 'LIBRE' ? 'Libre' : box._id;
      if (contrat) {
        const boutique = this.boutiques.find(b => b._id === contrat.idBoutique);
        if (boutique) labelText = boutique.nom;
      }

      const label = new PIXI.Text({
        text: `${type.nom.charAt(0)}\n${labelText}`,
        style: {
          fontFamily: 'Arial, sans-serif',
          fontSize: 13,
          fontWeight: '500',
          fill: textColor,
          align: 'center',
          leading: -2,
          wordWrap: true,
          wordWrapWidth: type.longueur - 10,
        }
      });
      label.anchor.set(0.5);
      label.x = box.x + type.longueur / 2;
      label.y = box.y + type.largeur / 2;
      this.mapContainerPixi.addChild(label);

      // Icône crayon en mode édition
      if (this.editMode) {
        const editIcon = new PIXI.Text('✏', {
          fontSize: 20,
          fill: 0x555555,
          fontWeight: '500',
          fontFamily: 'Arial, sans-serif',
          dropShadow: {
            color: 0xffffff,
            blur: 3,
            distance: 1,
            alpha: 0.7,
            angle: Math.PI / 4
          }
        });

        editIcon.anchor.set(1, 0);
        editIcon.x = box.x + type.longueur - 12;
        editIcon.y = box.y + 20;
        editIcon.rotation = Math.PI / 3; // ≈ 60° (penché comme un crayon)

        editIcon.eventMode = 'static';
        editIcon.cursor = 'pointer';

        editIcon.on('pointerover', () => {
          editIcon.scale.set(1.25);
          editIcon.tint = 0x1976d2; // bleu Material
        });

        editIcon.on('pointerout', () => {
          editIcon.scale.set(1);
          editIcon.tint = 0xffffff;
        });

        editIcon.on('pointerdown', (e) => {
          e.stopPropagation(); // Empêche de déclencher aussi le selectBox
          this.editBox.emit(box);
        });

        this.mapContainerPixi.addChild(editIcon);
      }
    });
  }

  ngOnDestroy() {
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true });
      this.app = undefined;
    }
  }
}