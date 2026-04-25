import Phaser from 'phaser';
import { Badminton } from './Badminton';

export class Player extends Phaser.GameObjects.Container {
  declare public body: Phaser.Physics.Arcade.Body;
  private isPlayerControlled: boolean;
  private speed: number = 200;
  private jumpForce: number = 450;
  private isJumping: boolean = false;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private racketSprite!: Phaser.GameObjects.Sprite;
  private hitCooldown: number = 0;
  private hitCooldownTime: number = 500;
  private lastHitTime: number = 0;
  private facingRight: boolean = true;

  constructor(scene: Phaser.Scene, x: number, y: number, isPlayer: boolean) {
    super(scene, x, y);
    this.isPlayerControlled = isPlayer;
    this.facingRight = !isPlayer;
    
    this.createPlayerSprite();
    
    scene.add.existing(this);
    scene.physics.add.existing(this);
    
    this.setupPhysics();
    
    this.setSize(50, 100);
    this.setDepth(2);
  }

  private createPlayerSprite(): void {
    const playerGraphics = this.scene.add.graphics();
    
    playerGraphics.fillStyle(0x3b82f6, 1);
    playerGraphics.fillCircle(0, -40, 20);
    
    playerGraphics.fillStyle(0x1e40af, 1);
    playerGraphics.fillRect(-15, -20, 30, 40);
    
    playerGraphics.fillStyle(0x1e3a8a, 1);
    playerGraphics.fillRect(-12, 20, 10, 30);
    playerGraphics.fillRect(2, 20, 10, 30);
    
    playerGraphics.generateTexture('player_body');
    playerGraphics.destroy();
    
    const racketGraphics = this.scene.add.graphics();
    racketGraphics.lineStyle(3, 0x8b4513, 1);
    racketGraphics.strokeCircle(0, -20, 25);
    
    racketGraphics.lineStyle(1, 0xffffff, 0.5);
    for (let i = -20; i <= 20; i += 8) {
      racketGraphics.lineBetween(i, -40, i, 0);
    }
    for (let i = -40; i <= 0; i += 8) {
      racketGraphics.lineBetween(-20, i, 20, i);
    }
    
    racketGraphics.fillStyle(0x8b4513, 1);
    racketGraphics.fillRect(-3, 0, 6, 25);
    
    racketGraphics.generateTexture('racket');
    racketGraphics.destroy();
    
    this.playerSprite = this.scene.add.sprite(0, 0, 'player_body');
    this.add(this.playerSprite);
    
    this.racketSprite = this.scene.add.sprite(this.facingRight ? 30 : -30, -10, 'racket');
    this.racketSprite.setScale(0.8);
    this.racketSprite.setFlipX(!this.facingRight);
    this.add(this.racketSprite);
  }

  private setupPhysics(): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);
    body.setGravityY(800);
    body.setBounce(0.2);
    
    this.scene.physics.world.setBounds(50, 50, 1100, 500);
  }

  public update(wasd: any, _pointer?: Phaser.Input.Pointer): void {
    const body = this.body;
    let moveX = 0;
    let moveY = 0;
    
    if (wasd.left.isDown) {
      moveX = -1;
    }
    if (wasd.right.isDown) {
      moveX = 1;
    }
    if (wasd.up.isDown && !this.isJumping) {
      moveY = -1;
    }
    
    const boundaryLeft = this.isPlayerControlled ? 60 : 610;
    const boundaryRight = this.isPlayerControlled ? 590 : 1140;
    
    if (moveX !== 0) {
      body.setVelocityX(moveX * this.speed);
    } else {
      body.setVelocityX(body.velocity.x * 0.8);
    }
    
    if (moveY < 0) {
      body.setVelocityY(-this.jumpForce);
      this.isJumping = true;
    }
    
    if (body.onFloor() || body.y >= 450) {
      this.isJumping = false;
    }
    
    if (body.x < boundaryLeft) {
      body.x = boundaryLeft;
      body.setVelocityX(0);
    }
    if (body.x > boundaryRight) {
      body.x = boundaryRight;
      body.setVelocityX(0);
    }
    if (body.y > 450) {
      body.y = 450;
      body.setVelocityY(0);
      this.isJumping = false;
    }
    
    const currentTime = this.scene.time.now;
    if (currentTime - this.lastHitTime < this.hitCooldownTime) {
      this.hitCooldown = this.hitCooldownTime - (currentTime - this.lastHitTime);
    } else {
      this.hitCooldown = 0;
    }
    
    this.updateRacketAnimation();
  }

  private updateRacketAnimation(): void {
    const swingAngle = Math.sin(this.scene.time.now * 0.01) * 10;
    
    if (this.hitCooldown > 0) {
      this.racketSprite.setRotation(this.facingRight ? -0.8 : 0.8);
      this.racketSprite.x = this.facingRight ? 40 : -40;
    } else {
      this.racketSprite.setRotation(Phaser.Math.DegToRad(swingAngle));
      this.racketSprite.x = this.facingRight ? 30 : -30;
    }
  }

  public canHit(shuttlecock: Badminton): boolean {
    if (this.hitCooldown > 0) return false;
    
    const distance = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      shuttlecock.x,
      shuttlecock.y
    );
    
    const shuttlecockBody = shuttlecock.body as Phaser.Physics.Arcade.Body;
    const isComingTowards = this.isPlayerControlled 
      ? shuttlecockBody.velocity.x > 0 
      : shuttlecockBody.velocity.x < 0;
    
    return distance < 100 && isComingTowards;
  }

  public hitShuttlecock(shuttlecock: Badminton, pointer: Phaser.Input.Pointer): void {
    const currentTime = this.scene.time.now;
    this.lastHitTime = currentTime;
    this.hitCooldown = this.hitCooldownTime;
    
    const shuttlecockBody = shuttlecock.body as Phaser.Physics.Arcade.Body;
    
    let targetX: number;
    let targetY: number;
    
    if (this.isPlayerControlled) {
      targetX = Phaser.Math.Clamp(pointer.x, 650, 1100);
      targetY = Phaser.Math.Clamp(pointer.y, 100, 450);
    } else {
      targetX = Phaser.Math.Clamp(pointer.x, 100, 550);
      targetY = Phaser.Math.Clamp(pointer.y, 100, 450);
    }
    
    const angle = Phaser.Math.Angle.Between(
      shuttlecock.x,
      shuttlecock.y,
      targetX,
      targetY
    );
    
    const distance = Phaser.Math.Distance.Between(
      shuttlecock.x,
      shuttlecock.y,
      targetX,
      targetY
    );
    
    const power = Phaser.Math.Clamp(distance / 5, 300, 600);
    
    shuttlecockBody.setVelocity(
      Math.cos(angle) * power,
      Math.sin(angle) * power - 200
    );
    
    shuttlecockBody.setAngularVelocity(this.isPlayerControlled ? 500 : -500);
    shuttlecock.setGravityY(300);
    
    this.playHitAnimation();
  }

  public serve(shuttlecock: Badminton): void {
    if (this.isPlayerControlled) {
      shuttlecock.setPosition(this.x + 30, this.y - 60);
      shuttlecock.setVelocity(400, -350);
      shuttlecock.setAngularVelocity(300);
    } else {
      shuttlecock.setPosition(this.x - 30, this.y - 60);
      shuttlecock.setVelocity(-400, -350);
      shuttlecock.setAngularVelocity(-300);
    }
    
    shuttlecock.setGravityY(300);
  }

  protected playHitAnimation(): void {
    this.scene.tweens.add({
      targets: this.racketSprite,
      rotation: this.facingRight ? -1.2 : 1.2,
      duration: 150,
      yoyo: true,
      ease: 'Power2'
    });
  }
}
