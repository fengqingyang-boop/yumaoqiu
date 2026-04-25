import Phaser from 'phaser';
import { Player } from './Player';
import { Badminton } from './Badminton';

export class ComputerPlayer extends Player {
  private targetPosition: { x: number; y: number };
  private aiState: 'idle' | 'moving' | 'hitting' = 'idle';
  private reactionDelay: number = 100;
  private lastActionTime: number = 0;
  private predictionTime: number = 500;
  private difficulty: number = 0.7;

  constructor(scene: Phaser.Scene, x: number, y: number, isPlayer: boolean) {
    super(scene, x, y, isPlayer);
    this.targetPosition = { x, y };
  }

  public update(shuttlecock: Badminton): void {
    this.updateTargetPosition(shuttlecock);
    this.moveTowardsTarget();
    
    if (this.aiState === 'hitting') {
      this.aiState = 'idle';
    }
  }

  private updateTargetPosition(shuttlecock: Badminton): void {
    const shuttlecockBody = shuttlecock.body as Phaser.Physics.Arcade.Body;
    const shuttlecockVelocity = shuttlecockBody.velocity;
    
    if (shuttlecockVelocity.x < -50) {
      const futurePosition = this.predictShuttlecockPosition(shuttlecock, shuttlecockVelocity);
      
      const randomOffsetX = (Math.random() - 0.5) * 60 * (1 - this.difficulty);
      const randomOffsetY = (Math.random() - 0.5) * 40 * (1 - this.difficulty);
      
      this.targetPosition.x = Phaser.Math.Clamp(
        futurePosition.x + randomOffsetX,
        610,
        1140
      );
      this.targetPosition.y = Phaser.Math.Clamp(
        futurePosition.y + randomOffsetY - 30,
        100,
        450
      );
      
      this.aiState = 'moving';
    } else if (shuttlecockVelocity.x > 50) {
      this.targetPosition.x = 900;
      this.targetPosition.y = 400;
      this.aiState = 'idle';
    } else {
      this.targetPosition.x = 900;
      this.targetPosition.y = 400;
      this.aiState = 'idle';
    }
  }

  private predictShuttlecockPosition(
    shuttlecock: Badminton,
    velocity: Phaser.Math.Vector2
  ): { x: number; y: number } {
    const gravity = 300;
    let timeStep = 0.016;
    let simX = shuttlecock.x;
    let simY = shuttlecock.y;
    let simVelX = velocity.x;
    let simVelY = velocity.y;
    
    for (let t = 0; t < this.predictionTime / 16; t++) {
      simX += simVelX * timeStep;
      simY += simVelY * timeStep;
      simVelY += gravity * timeStep;
      
      if (simX <= 600) {
        break;
      }
    }
    
    return { x: simX, y: simY };
  }

  private moveTowardsTarget(): void {
    const body = this.body;
    const speed = 180 * this.difficulty;
    
    const dx = this.targetPosition.x - body.x;
    const dy = this.targetPosition.y - body.y;
    
    if (Math.abs(dx) > 10) {
      body.setVelocityX(Math.sign(dx) * speed);
    } else {
      body.setVelocityX(body.velocity.x * 0.8);
    }
    
    if (dy < -50 && body.y >= 450) {
      body.setVelocityY(-400 * this.difficulty);
    }
    
    if (body.y > 450) {
      body.y = 450;
      body.setVelocityY(0);
    }
  }

  public autoHit(shuttlecock: Badminton): boolean {
    const currentTime = this.scene.time.now;
    
    if (currentTime - this.lastActionTime < this.reactionDelay) {
      return false;
    }
    
    this.lastActionTime = currentTime;
    
    const shuttlecockBody = shuttlecock.body as Phaser.Physics.Arcade.Body;
    
    if (shuttlecockBody.velocity.x >= 0) {
      return false;
    }
    
    const hitPositions = [
      { x: 200, y: 200 },
      { x: 200, y: 300 },
      { x: 150, y: 250 },
      { x: 300, y: 250 }
    ];
    
    const randomHit = hitPositions[Math.floor(Math.random() * hitPositions.length)];
    const targetX = randomHit.x + (Math.random() - 0.5) * 50;
    const targetY = randomHit.y + (Math.random() - 0.5) * 50;
    
    const angle = Phaser.Math.Angle.Between(
      shuttlecock.x,
      shuttlecock.y,
      targetX,
      targetY
    );
    
    const power = 350 + Math.random() * 150;
    
    shuttlecock.setVelocity(
      Math.cos(angle) * power,
      Math.sin(angle) * power - 200
    );
    
    shuttlecock.setAngularVelocity(-500);
    shuttlecock.setGravityY(300);
    
    this.aiState = 'hitting';
    super.playHitAnimation();
    
    return true;
  }
}
