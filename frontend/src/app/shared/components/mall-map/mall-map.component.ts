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
  @Output() editBox = new EventEmitter<Box>();   // on garde pour compatibilité, mais on va ajouter un nouvel event

  @Input() editMode: boolean = false;

  // Nouvel event pour signaler un changement de statut
  @Output() statusChange = new EventEmitter<{ box: Box; newStatus: 'LIBRE' | 'NON_FONCTIONNEL' }>();

  @ViewChild('mapContainer') mapContainerRef!: ElementRef<HTMLDivElement>;

  private app?: PIXI.Application;
  private mapContainerPixi = new PIXI.Container();

  async ngAfterViewInit() {
    const container = this.mapContainerRef?.nativeElement;
    if (!container) return;

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
    if (changes['editMode'] && !changes['editMode'].firstChange && this.app) {
      this.drawMap();
    }
    // Optionnel : redessiner aussi si boxs change (utile si statut modifié)
    if (changes['boxs'] && this.app) {
      this.drawMap();
    }
  }

  private drawMap(): void {
    this.mapContainerPixi.removeChildren();

    this.boxs.forEach(box => {
      const type = this.types.find(t => t._id === box.idType);
      if (!type) return;

      const g = new PIXI.Graphics();

      // Couleur de fond selon statut
      let fill: number;
      let textColor: number;
      let border = 0xc0c0c0;

      if (box.statut === 'OCCUPE') {
        fill = 0xf0f0f0;
        textColor = 0x4a5568;
      } else if (box.statut === 'NON_FONCTIONNEL') {
        fill = 0xffebee;           // rouge très clair
        textColor = 0xc62828;      // rouge foncé
        border = 0xef5350;         // bordure rouge
      } else { // LIBRE
        fill = 0xebf5ff;
        textColor = 0x2c5282;
      }

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
      let labelText = box._id;
      if (contrat) {
        const boutique = this.boutiques.find(b => b._id === contrat.idBoutique);
        if (boutique) labelText = boutique.nom;
      } else if (box.statut === 'NON_FONCTIONNEL') {
        labelText = 'Non fonctionnel';
      } else {
        labelText = 'Libre';
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

      // === Icônes d'action en mode édition ===
      if (this.editMode) {
        if (box.statut === 'LIBRE') {
          // Icône X pour marquer NON_FONCTIONNEL
          const iconX = new PIXI.Text('✕', {
            fontSize: 22,
            fill: 0xd32f2f,           // rouge Material
            fontWeight: 'bold',
            fontFamily: 'Arial, sans-serif',
            dropShadow: {
              color: 0xffffff,
              blur: 4,
              distance: 2,
              alpha: 0.6,
              angle: Math.PI / 4,          
            }
          });

          iconX.anchor.set(1, 0);
          iconX.x = box.x + type.longueur - 10;
          iconX.y = box.y + 12;

          iconX.eventMode = 'static';
          iconX.cursor = 'pointer';

          iconX.on('pointerover', () => {
            iconX.scale.set(1.3);
            iconX.tint = 0xb71c1c;
          });
          iconX.on('pointerout', () => {
            iconX.scale.set(1);
            iconX.tint = 0xffffff;
          });
          iconX.on('pointerdown', (e) => {
            e.stopPropagation();
            this.statusChange.emit({ box, newStatus: 'NON_FONCTIONNEL' });
          });

          this.mapContainerPixi.addChild(iconX);
        }
        else if (box.statut === 'NON_FONCTIONNEL') {
          // Icône check pour remettre en LIBRE
          const iconCheck = new PIXI.Text('✓', {
            fontSize: 22,
            fill: 0x2e7d32,           
            fontWeight: 'bold',
            fontFamily: 'Arial, sans-serif',
            dropShadow: {
              color: 0xffffff,
              blur: 4,
              distance: 2,
              alpha: 0.6,
              angle: Math.PI / 4,        
            }
          });

          iconCheck.anchor.set(1, 0);
          iconCheck.x = box.x + type.longueur - 10;
          iconCheck.y = box.y + 12;

          iconCheck.eventMode = 'static';
          iconCheck.cursor = 'pointer';

          iconCheck.on('pointerover', () => {
            iconCheck.scale.set(1.3);
            iconCheck.tint = 0x1b5e20;
          });
          iconCheck.on('pointerout', () => {
            iconCheck.scale.set(1);
            iconCheck.tint = 0xffffff;
          });
          iconCheck.on('pointerdown', (e) => {
            e.stopPropagation();
            this.statusChange.emit({ box, newStatus: 'LIBRE' });
          });

          this.mapContainerPixi.addChild(iconCheck);
        }
        // Pas d'icône pour OCCUPE
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