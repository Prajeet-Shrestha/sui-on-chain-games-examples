import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { COLOR_PALETTE } from '../constants';

class VirusScene extends Phaser.Scene {
  private virus!: Phaser.GameObjects.Graphics;
  private eyeL!: Phaser.GameObjects.Graphics;
  private eyeR!: Phaser.GameObjects.Graphics;
  private pupilL!: Phaser.GameObjects.Graphics;
  private pupilR!: Phaser.GameObjects.Graphics;
  
  // Wobble state
  private bumpOffsets: number[] = [];
  private phaseOffset = 0;
  
  // Eye jiggle state
  private eyeParams = { cx: 0, cy: 0, pupilSize: 0, eyeOffsetX: 0, eyeOffsetY: 0 };
  private lastPointerX = 0;
  private lastPointerY = 0;
  private hasPointerMoved = false;
  
  // Virus geometry for animation loop
  private virusCx = 0;
  private virusCy = 0;
  private virusSize = 0;
  
  constructor() {
    super({ key: 'VirusScene' });
  }

  create() {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const size = Math.min(this.scale.width, this.scale.height) * 0.6; // Virus size relative to container

    // Generate random bump offsets
    this.bumpOffsets = Array.from({ length: 16 }, () => Math.random() * 0.4 + 0.8);
    this.phaseOffset = Math.random() * Math.PI * 2;

    // Virus Body
    this.virus = this.add.graphics();
    
    // Eyes
    const eyeSize = size * 0.16;
    const pupilSize = eyeSize * 0.55;
    const eyeOffsetX = size * 0.18;
    const eyeOffsetY = -size * 0.12;

    this.eyeL = this.add.graphics();
    this.eyeR = this.add.graphics();
    this.pupilL = this.add.graphics();
    this.pupilR = this.add.graphics();

    // Draw static eyes (whites)
    this.eyeL.fillStyle(0xffffff, 1);
    this.eyeL.fillCircle(cx - eyeOffsetX, cy + eyeOffsetY, eyeSize);
    this.eyeR.fillStyle(0xffffff, 1);
    this.eyeR.fillCircle(cx + eyeOffsetX, cy + eyeOffsetY, eyeSize);

    // Initial pupil draw
    this.updatePupils(cx, cy, cx, cy, pupilSize, eyeOffsetX, eyeOffsetY);

    // Store eye params for use in animation loop
    this.eyeParams = { cx, cy, pupilSize, eyeOffsetX, eyeOffsetY };

    // Mouse tracking — position set from React via setGlobalPointer()
    this.lastPointerX = cx;
    this.lastPointerY = cy;
    this.hasPointerMoved = false;

    // Store for animation loop
    this.virusCx = cx;
    this.virusCy = cy;
    this.virusSize = size;

    // Combined animation loop: body wobble + pupil jiggle
    this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        this.drawVirusBody(this.virusCx, this.virusCy, this.virusSize);
        this.jigglePupils();
      }
    });
  }

  /** Called from React component with coordinates relative to the canvas */
  public setGlobalPointer(localX: number, localY: number) {
    this.lastPointerX = localX;
    this.lastPointerY = localY;
    this.hasPointerMoved = true;
  }

  private updatePupils(
    targetX: number, 
    targetY: number, 
    cx: number, 
    cy: number, 
    pupilSize: number, 
    eyeOffsetX: number, 
    eyeOffsetY: number
  ) {
    const maxDist = pupilSize * 0.6;
    
    // Left Eye
    const elX = cx - eyeOffsetX;
    const elY = cy + eyeOffsetY;
    const angleL = Phaser.Math.Angle.Between(elX, elY, targetX, targetY);
    const distL = Math.min(Phaser.Math.Distance.Between(elX, elY, targetX, targetY), maxDist);
    
    this.pupilL.clear();
    this.pupilL.fillStyle(0x111111, 1);
    this.pupilL.fillCircle(elX + Math.cos(angleL) * distL, elY + Math.sin(angleL) * distL, pupilSize);

    // Right Eye
    const erX = cx + eyeOffsetX;
    const erY = cy + eyeOffsetY;
    const angleR = Phaser.Math.Angle.Between(erX, erY, targetX, targetY);
    const distR = Math.min(Phaser.Math.Distance.Between(erX, erY, targetX, targetY), maxDist);

    this.pupilR.clear();
    this.pupilR.fillStyle(0x111111, 1);
    this.pupilR.fillCircle(erX + Math.cos(angleR) * distR, erY + Math.sin(angleR) * distR, pupilSize);
  }

  private jigglePupils() {
    const { cx, cy, pupilSize, eyeOffsetX, eyeOffsetY } = this.eyeParams;
    const t = this.time.now * 0.002;
    
    // Idle jiggle: sine-wave based random-looking pupil movement
    let targetX: number;
    let targetY: number;
    
    if (this.hasPointerMoved) {
      // Follow mouse with a subtle jiggle overlay
      const jx = Math.sin(t * 3.1) * 2;
      const jy = Math.cos(t * 2.7) * 2;
      targetX = this.lastPointerX + jx;
      targetY = this.lastPointerY + jy;
    } else {
      // Idle mode: pupils wander around randomly
      const wanderX = Math.sin(t * 0.7) * 15 + Math.sin(t * 1.9) * 8;
      const wanderY = Math.cos(t * 0.9) * 12 + Math.cos(t * 2.3) * 6;
      targetX = cx + wanderX;
      targetY = cy + wanderY;
    }
    
    this.updatePupils(targetX, targetY, cx, cy, pupilSize, eyeOffsetX, eyeOffsetY);
  }

  private drawVirusBody(cx: number, cy: number, size: number) {
    const time = this.time.now;
    const g = this.virus;
    g.clear();
    
    // Green color (matches standard game start)
    const color = parseInt(COLOR_PALETTE[2].replace('#', ''), 16);
    g.fillStyle(color, 1);

    const points: {x: number, y: number}[] = [];
    const totalPoints = 24; // More points = smoother amoeba shape
    
    // Circular base radius (no square mapping)
    const baseR = size * 0.48; 

    // Generate points around a circle with gentle organic deformation
    for (let i = 0; i < totalPoints; i++) {
        const angle = (Math.PI * 2 * i) / totalPoints;
        
        const t = time * 0.001; // Very slow time scale for gentle motion
        const offset = this.bumpOffsets[i % this.bumpOffsets.length] ?? 1;
        
        // Two slow waves — gentle, amoeba-like breathing
        const w1 = Math.sin(t * 0.8 + this.phaseOffset + i * 0.4) * 3.0;
        const w2 = Math.sin(t * 1.4 + i * 0.9 + this.phaseOffset * 0.7) * 2.0;

        const wobble = w1 + w2;
        
        // Per-vertex static variation for organic irregularity
        const bumpiness = (offset - 1) * 5;

        const r = baseR + wobble + bumpiness;

        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        points.push({ x: px, y: py });
    }

    // Draw smooth closed curve using quadratic bezier through midpoints
    const len = points.length;
    const pLast = points[len - 1];
    const pFirst = points[0];

    const path = new Phaser.Curves.Path((pLast.x + pFirst.x) / 2, (pLast.y + pFirst.y) / 2);

    for (let i = 0; i < len; i++) {
        const p = points[i];
        const pNext = points[(i + 1) % len];
        const midX = (p.x + pNext.x) / 2;
        const midY = (p.y + pNext.y) / 2;
        path.quadraticBezierTo(p.x, p.y, midX, midY);
    }
    
    path.closePath();
    
    // Use beginPath/lineTo/fillPath instead of fillPoints to avoid
    // black gaps caused by triangle-fan rendering of concave shapes
    const smoothPoints = path.getPoints(64);
    g.beginPath();
    g.moveTo(smoothPoints[0].x, smoothPoints[0].y);
    for (let i = 1; i < smoothPoints.length; i++) {
        g.lineTo(smoothPoints[i].x, smoothPoints[i].y);
    }
    g.closePath();
    g.fillPath();
  }
}

export function PhaserVirus() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<VirusScene | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.CANVAS,
      parent: containerRef.current,
      width: 140,
      height: 140,
      transparent: true,
      scene: VirusScene,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;

    // Grab scene reference once it's ready
    game.events.once('ready', () => {
      sceneRef.current = game.scene.getScene('VirusScene') as VirusScene;
    });

    return () => {
      game.destroy(true);
    };
  }, []);

  // Window-level mouse tracking — eyes follow cursor across the entire page
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const scene = sceneRef.current;
      const el = containerRef.current;
      if (!scene || !el) return;

      // Convert page coords to canvas-local coords
      const rect = el.getBoundingClientRect();
      const scaleX = 140 / rect.width;
      const scaleY = 140 / rect.height;
      const localX = (e.clientX - rect.left) * scaleX;
      const localY = (e.clientY - rect.top) * scaleY;
      scene.setGlobalPointer(localX, localY);
    };

    window.addEventListener('mousemove', onMouseMove);
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []);

  return <div ref={containerRef} style={{ width: '140px', height: '140px' }} />;
}
