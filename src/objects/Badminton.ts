import Phaser from 'phaser';

export class Badminton extends Phaser.GameObjects.Sprite {
  declare public body: Phaser.Physics.Arcade.Body;
  private particles!: any;
  private trailEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private airResistance: number = 0.995;
  private spinFactor: number = 0.001;
  private isEmitterOn: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, '');
    this.createShuttlecockTexture();
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setupPhysics();
    this.createTrail();
    
    this.setDepth(10);
  }

  private createShuttlecockTexture(): void {
    const graphics = this.scene.add.graphics();
    
    graphics.fillStyle(0xffffff, 1);
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const featherLength = 25;
      const featherWidth = 5;
      
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      
      const x1 = -2 * cos - (-5) * sin;
      const y1 = -2 * sin + (-5) * cos;
      
      const x2 = -featherWidth / 2 * cos - (-featherLength) * sin;
      const y2 = -featherWidth / 2 * sin + (-featherLength) * cos;
      
      const x3 = featherWidth / 2 * cos - (-featherLength) * sin;
      const y3 = featherWidth / 2 * sin + (-featherLength) * cos;
      
      const x4 = 2 * cos - (-5) * sin;
      const y4 = 2 * sin + (-5) * cos;
      
      graphics.fillStyle(0xffffff, 0.9);
      graphics.beginPath();
      graphics.moveTo(x1, y1);
      graphics.lineTo(x2, y2);
      graphics.lineTo(x3, y3);
      graphics.lineTo(x4, y4);
      graphics.closePath();
      graphics.fillPath();
      
      graphics.lineStyle(1, 0xe0e0e0, 0.8);
      graphics.strokePath();
    }
    
    graphics.fillStyle(0x8b4513, 1);
    graphics.beginPath();
    graphics.arc(0, 5, 8, 0, Math.PI * 2);
    graphics.fillPath();
    
    graphics.fillStyle(0x654321, 1);
    graphics.beginPath();
    graphics.arc(0, 3, 6, 0, Math.PI * 2);
    graphics.fillPath();
    
    graphics.generateTexture('shuttlecock');
    graphics.destroy();
    
    this.setTexture('shuttlecock');
    this.setScale(0.8);
  }

  private setupPhysics(): void {
    this.body.setCollideWorldBounds(true);
    this.body.setBounce(0.3, 0.5);
    this.body.setDrag(10, 10);
    this.body.setGravityY(0);
    this.body.setSize(20, 20, true);
  }

  private createTrail(): void {
    this.particles = this.scene.add.particles(0, 0, 'shuttlecock', {
      x: this.x,
      y: this.y,
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.5, end: 0 },
      lifespan: 150,
      frequency: 80
    });
    
    this.trailEmitter = this.particles.emitters.first;
    this.trailEmitter.stop();
    this.particles.setDepth(9);
  }

  public setVelocity(vx: number, vy: number): void {
    this.body.setVelocity(vx, vy);
  }

  public setAngularVelocity(velocity: number): void {
    this.body.setAngularVelocity(velocity);
  }

  public setGravityY(value: number): void {
    this.body.setGravityY(value);
  }

  public update(): void {
    this.updatePhysics();
    this.updateRotation();
    this.updateTrail();
  }

  private updatePhysics(): void {
    const velocity = this.body.velocity;
    
    if (velocity.length() > 100) {
      const speed = velocity.length();
      const dragForce = this.airResistance * speed * 0.001;
      
      velocity.x *= (1 - dragForce);
      velocity.y *= (1 - dragForce);
      
      const spinEffect = this.body.angularVelocity * this.spinFactor;
      const perpendicular = new Phaser.Math.Vector2(-velocity.y, velocity.x).normalize();
      
      velocity.x += perpendicular.x * spinEffect * 10;
      velocity.y += perpendicular.y * spinEffect * 10;
    }
    
    if (this.body.angularVelocity !== 0) {
      this.body.angularVelocity *= 0.99;
      if (Math.abs(this.body.angularVelocity) < 10) {
        this.body.setAngularVelocity(0);
      }
    }
  }

  private updateRotation(): void {
    const velocity = this.body.velocity;
    
    if (velocity.length() > 50) {
      const targetAngle = Phaser.Math.Angle.Between(
        0, 0,
        velocity.x, velocity.y
      ) + Math.PI / 2;
      
      const currentAngle = this.rotation;
      const angleDiff = Phaser.Math.Angle.Wrap(targetAngle - currentAngle);
      
      this.rotation += angleDiff * 0.1;
    }
  }

  private updateTrail(): void {
    const velocity = this.body.velocity;
    
    if (velocity.length() > 100) {
      if (!this.isEmitterOn) {
        this.trailEmitter.start();
        this.isEmitterOn = true;
      }
      
      this.trailEmitter.setPosition(this.x, this.y);
    } else {
      if (this.isEmitterOn) {
        this.trailEmitter.stop();
        this.isEmitterOn = false;
      }
    }
  }

  public getVelocity(): Phaser.Math.Vector2 {
    return this.body.velocity.clone();
  }

  public getPredictedPosition(timeMs: number): { x: number; y: number } {
    const timeStep = 0.016;
    let simX = this.x;
    let simY = this.y;
    let simVelX = this.body.velocity.x;
    let simVelY = this.body.velocity.y;
    const gravity = this.body.gravity.y;
    
    for (let t = 0; t < timeMs / 16; t++) {
      simX += simVelX * timeStep;
      simY += simVelY * timeStep;
      simVelY += gravity * timeStep;
      
      const speed = Math.sqrt(simVelX * simVelX + simVelY * simVelY);
      if (speed > 100) {
        const dragForce = this.airResistance * speed * 0.001;
        simVelX *= (1 - dragForce);
        simVelY *= (1 - dragForce);
      }
    }
    
    return { x: simX, y: simY };
  }
}
