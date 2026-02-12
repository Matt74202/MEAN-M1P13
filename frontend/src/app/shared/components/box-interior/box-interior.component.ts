import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Output } from '@angular/core';

import { Application, Container, Graphics, Text } from 'pixi.js';

import { Box, TypeBoutique, Contrat, Boutique } from '@app/model/mall-models';

@Component({
  selector: 'app-box-interior',
  standalone: true,
  template: `<div class="interior-pixi"></div>`,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }
    .interior-pixi { width: 100%; height: 100%; position: relative; }
    .interior-pixi canvas { position: absolute; inset: 0; width: 100% !important; height: 100% !important; }
  `]
})
export class BoxInteriorComponent implements AfterViewInit, OnDestroy {

  @Input() box!: Box;
  @Input() type!: TypeBoutique;
  @Input() contrat?: Contrat | null;
  @Input() boutique?: Boutique | null;

  @Output() back = new EventEmitter<void>();

  private app?: Application;
  private container = new Container();

  constructor(private elementRef: ElementRef) {}

  async ngAfterViewInit() {
    const host = this.elementRef.nativeElement.querySelector('.interior-pixi') as HTMLElement;
    if (!host) return;

    // Attendre un tick Angular + un petit délai pour que le layout se stabilise
    await new Promise(resolve => setTimeout(resolve, 0));           // tick
    await new Promise(resolve => setTimeout(resolve, 100));        // 100ms → souvent suffisant

    const rect = host.getBoundingClientRect();
    console.log('Rect après délai:', rect);  // ← ajoute ce log pour vérifier

    const w = Math.max(800, Math.round(rect.width));
    const h = Math.max(500, Math.round(rect.height || 600));  // fallback si toujours 0

    this.app = new Application();

    await this.app.init({
      width: w,
      height: h,
      backgroundColor: 0xffffff,  
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    host.appendChild(this.app.canvas);
    this.app.canvas.style.width = '100%';
    this.app.canvas.style.height = '100%';
    this.app.canvas.style.display = 'block';

    this.app.stage.addChild(this.container);

    this.drawInterior();

    // Optionnel : forcer un resize initial
    this.app.renderer.resize(w, h);
  }

  private drawInterior() {
  if (!this.app) return;
  this.container.removeChildren();

  const screenW = this.app.screen.width;
  const screenH = this.app.screen.height;

  // Dimensions de base de la pièce
  const roomW = Math.min(900, screenW * 0.80);
  const roomH = Math.min(600, screenH * 0.70);

  const centerX = screenW / 2;
  const roomX = centerX - roomW / 2;
  const roomY = 100; // tu peux toujours ajuster si besoin

  // ───────────────────────────────────────────────
  // Sol avec effet parquet
  // ───────────────────────────────────────────────
  const floor = new Graphics();
  floor
    .moveTo(roomX - 80, roomY + roomH - 60)
    .lineTo(roomX + roomW + 80, roomY + roomH - 60)
    .lineTo(roomX + roomW + 50, roomY + roomH + 40)
    .lineTo(roomX - 50, roomY + roomH + 40)
    .closePath()
    .fill(0xe6e0d6);

  for (let i = 1; i < 14; i++) {
    floor
      .moveTo(roomX - 80 + i * (roomW + 160) / 14, roomY + roomH - 60)
      .lineTo(roomX - 50 + i * (roomW + 100) / 14, roomY + roomH + 40)
      .stroke({ width: 0.8, color: 0xd2c6b8 });
  }
  this.container.addChild(floor);

  // ───────────────────────────────────────────────
  // Mur arrière
  // ───────────────────────────────────────────────
  const wallBack = new Graphics();
  wallBack
    .rect(roomX, roomY, roomW, roomH - 60)
    .fill(0xf6f6f6)
    .stroke({ width: 3, color: 0xccd4df });

  for (let i = 1; i < 9; i++) {
    wallBack
      .moveTo(roomX + i * roomW / 9, roomY)
      .lineTo(roomX + i * roomW / 9, roomY + roomH - 60)
      .stroke({ width: 0.6, color: 0xe9ecef });
  }
  this.container.addChild(wallBack);

  // ───────────────────────────────────────────────
  // Murs latéraux en perspective
  // ───────────────────────────────────────────────
  const wallLeft = new Graphics();
  wallLeft
    .moveTo(roomX, roomY + roomH - 60)
    .lineTo(roomX - 80, roomY + roomH - 20)
    .lineTo(roomX - 80, roomY + 60)
    .lineTo(roomX, roomY)
    .closePath()
    .fill(0xf1f1f1)
    .stroke({ width: 2, color: 0xd4d9df });
  this.container.addChild(wallLeft);

  const wallRight = new Graphics();
  wallRight
    .moveTo(roomX + roomW, roomY + roomH - 60)
    .lineTo(roomX + roomW + 80, roomY + roomH - 20)
    .lineTo(roomX + roomW + 80, roomY + 60)
    .lineTo(roomX + roomW, roomY)
    .closePath()
    .fill(0xf1f1f1)
    .stroke({ width: 2, color: 0xd4d9df });
  this.container.addChild(wallRight);

  // ───────────────────────────────────────────────
  // Enseigne / Titre
  // ───────────────────────────────────────────────
  const contrat = this.contrat;
  const type = this.type;
  let boutiqueName = '';

  if (contrat && this.boutique) {
    boutiqueName = this.boutique.nom;
  }

  if (boutiqueName) {
    const sign = new Container();
    const bg = new Graphics();
    bg.roundRect(-200, -45, 400, 90, 20)
      .fill(0xaab992)
      .stroke({ width: 4, color: 0x5c6b5c });

    const text = new Text(boutiqueName.toUpperCase(), {
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: 34,
      fill: 0xffffff,
      fontWeight: '900',
      letterSpacing: 2,
      align: 'center',
      dropShadow: { color: 0x000000, blur: 6, angle: Math.PI / 3, distance: 4, alpha: 0.7 }
    });
    text.anchor.set(0.5);

    sign.addChild(bg);
    sign.addChild(text);
    sign.x = centerX;
    sign.y = roomY - 30;
    this.container.addChild(sign);
  } else {
    const title = new Text(`INTÉRIEUR - ${this.box._id} (${type.nom})`, {
      fontFamily: 'Arial',
      fontSize: 28,
      fill: 0x1e40af,
      fontWeight: 'bold',
      align: 'center'
    });
    title.anchor.set(0.5);
    title.x = centerX;
    title.y = roomY - 20;
    this.container.addChild(title);
  }

 // ───────────────────────────────────────────────
// ÉTAGÈRES (gauche et droite)
// ───────────────────────────────────────────────
const shelfZoneTop = roomY + 80;             // marge haute un peu réduite
const shelfZoneBottom = roomY + roomH - 110; // marge basse réduite → plus de place totale
const shelfZoneHeight = shelfZoneBottom - shelfZoneTop;

const nbLeft = type.nbEtagereGauche ?? 1;
const nbRight = type.nbEtagereDroite ?? 1;

// Facteur d’espacement dynamique : plus il y a d’étagères, plus on ajoute d’air
const extraSpaceFactor = (nb: number) => {
  if (nb <= 1) return 1.0;
  if (nb === 2) return 1.15;
  return 1.35; // ← pour 3 étagères : +35% d’espace supplémentaire
};

// Fonction pour dessiner une étagère (hauteur 32 pour meilleure visibilité)
const drawShelf = (baseX: number, baseY: number, width: number, height = 32, depth = 40, flip = false) => {
  const shelf = new Container();
  const g = new Graphics();
  const wood = 0x8b6f47;
  const woodDark = 0x5c4023;
  const woodLight = 0xa68a64;

  g.rect(baseX, baseY, width, height)
    .fill(wood)
    .stroke({ width: 2, color: woodDark });

  g.rect(baseX, baseY + height - 8, width, 8)
    .fill(woodDark);

  if (!flip) {
    g.moveTo(baseX + width, baseY)
      .lineTo(baseX + width + depth, baseY + depth * 0.35)
      .lineTo(baseX + width + depth, baseY + height + depth * 0.35 - 8)
      .lineTo(baseX + width, baseY + height)
      .closePath()
      .fill(woodLight)
      .stroke({ width: 1.8, color: woodDark });
  } else {
    g.moveTo(baseX, baseY)
      .lineTo(baseX - depth, baseY + depth * 0.35)
      .lineTo(baseX - depth, baseY + height + depth * 0.35 - 8)
      .lineTo(baseX, baseY + height)
      .closePath()
      .fill(woodLight)
      .stroke({ width: 1.8, color: woodDark });
  }

  const shadow = new Graphics();
  shadow.rect(baseX + 10, baseY + height + 4, width - 20, 16)
    .fill(0x000000)
    .alpha = 0.12;

  shelf.addChild(shadow);
  shelf.addChild(g);
  this.container.addChild(shelf);
};

// Étagères gauches
if (nbLeft > 0) {
  const factorLeft = extraSpaceFactor(nbLeft);
  const spacingLeft = shelfZoneHeight / (nbLeft + factorLeft);
  for (let i = 1; i <= nbLeft; i++) {
    const yPos = shelfZoneTop + i * spacingLeft - 16;
    drawShelf(roomX + 60, yPos, 180);
  }
}

// Étagères droites
if (nbRight > 0) {
  const factorRight = extraSpaceFactor(nbRight);
  const spacingRight = shelfZoneHeight / (nbRight + factorRight);
  for (let i = 1; i <= nbRight; i++) {
    const yPos = shelfZoneTop + i * spacingRight - 16;
    drawShelf(roomX + roomW - 240, yPos, 180, 32, 40, true);
  }
}

  // ───────────────────────────────────────────────
  // Bouton RETOUR
  // ───────────────────────────────────────────────
  const btnWidth = 240;
  const btnHeight = 60;
  const btnX = centerX - btnWidth / 2;
  let btnY = roomY + roomH + 50;

  if (btnY + btnHeight > screenH - 30) {
    btnY = screenH - btnHeight - 30;
  }

  const btn = new Graphics();
  btn.roundRect(btnX, btnY, btnWidth, btnHeight, 12)
     .fill(0x2563eb)
     .stroke({ width: 3, color: 0x1d4ed8 });

  const btnText = new Text('RETOUR', {
    fontFamily: 'Arial',
    fontSize: 26,
    fill: 0xffffff,
    fontWeight: 'bold',
    align: 'center'
  });
  btnText.anchor.set(0.5);
  btnText.x = btnX + btnWidth / 2;
  btnText.y = btnY + btnHeight / 2;

  btn.eventMode = 'static';
  btn.cursor = 'pointer';
  btn.on('pointerdown', () => this.back.emit());

  this.container.addChild(btn);
  this.container.addChild(btnText);

  this.app.renderer.render(this.app.stage);
}

  ngOnDestroy() {
    if (this.app) {
      this.app.destroy(true, { children: true });
      this.app = undefined;
    }
  }
}