import Phaser from 'phaser';
import { Player } from '../objects/Player';
import { ComputerPlayer } from '../objects/ComputerPlayer';
import { Badminton } from '../objects/Badminton';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private computer!: ComputerPlayer;
  private shuttlecock!: Badminton;
  private net!: Phaser.GameObjects.Rectangle;
  private scoreText!: Phaser.GameObjects.Text;
  private playerScore: number = 0;
  private computerScore: number = 0;
  private gameState: 'waiting' | 'playing' | 'scored' = 'waiting';
  private lastServer: 'player' | 'computer' = 'player';
  private netZone!: Phaser.GameObjects.Zone;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.createCourt();
    this.createNet();
    this.createPlayers();
    this.createShuttlecock();
    this.createUI();
    this.setupInput();
    
    this.resetGame();
  }

  private createCourt(): void {
    const graphics = this.add.graphics();
    
    graphics.fillStyle(0x2e7d32, 1);
    graphics.fillRect(50, 50, 1100, 500);
    
    graphics.lineStyle(4, 0xffffff, 1);
    graphics.strokeRect(50, 50, 1100, 500);
    
    graphics.lineStyle(2, 0xffffff, 0.8);
    graphics.lineBetween(100, 50, 100, 550);
    graphics.lineBetween(1100, 50, 1100, 550);
    
    graphics.lineStyle(2, 0xffffff, 0.6);
    graphics.lineBetween(50, 200, 100, 200);
    graphics.lineBetween(50, 400, 100, 400);
    graphics.lineBetween(1100, 200, 1150, 200);
    graphics.lineBetween(1100, 400, 1150, 400);
    
    graphics.lineStyle(2, 0xffcc00, 0.8);
    graphics.lineBetween(600, 50, 600, 550);
    
    graphics.setDepth(1);
  }

  private createNet(): void {
    this.net = this.add.rectangle(600, 400, 10, 300, 0x8b4513);
    this.net.setDepth(5);
    
    const netGraphics = this.add.graphics();
    netGraphics.lineStyle(2, 0xffffff, 0.8);
    
    for (let y = 250; y <= 550; y += 20) {
      netGraphics.lineBetween(595, y, 605, y);
    }
    
    for (let x = 595; x <= 605; x += 5) {
      netGraphics.lineBetween(x, 250, x, 550);
    }
    
    netGraphics.setDepth(6);
    
    this.netZone = this.add.zone(600, 400, 20, 300);
    this.physics.add.existing(this.netZone, true);
  }

  private createPlayers(): void {
    this.player = new Player(this, 200, 400, true);
    this.computer = new ComputerPlayer(this, 1000, 400, false);
  }

  private createShuttlecock(): void {
    this.shuttlecock = new Badminton(this, 600, 200);
  }

  private createUI(): void {
    this.scoreText = this.add.text(600, 30, '你: 0  -  电脑: 0', {
      fontSize: '28px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5).setDepth(10);
    
    this.add.text(600, 570, 'WASD 移动 | 鼠标左键 发球/回击', {
      fontSize: '16px',
      color: '#ffff00',
      fontFamily: 'Arial, sans-serif'
    }).setOrigin(0.5).setDepth(10);
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown()) {
        this.handlePlayerHit();
      }
    });
  }

  private handlePlayerHit(): void {
    if (this.gameState === 'waiting' || this.gameState === 'scored') {
      this.startServe('player');
      return;
    }
    
    if (this.gameState === 'playing' && this.player.canHit(this.shuttlecock)) {
      this.player.hitShuttlecock(this.shuttlecock, this.input.activePointer);
    }
  }

  private startServe(server: 'player' | 'computer'): void {
    this.gameState = 'playing';
    this.lastServer = server;
    
    if (server === 'player') {
      this.player.serve(this.shuttlecock);
    } else {
      this.computer.serve(this.shuttlecock);
    }
  }

  private resetShuttlecock(server: 'player' | 'computer'): void {
    if (server === 'player') {
      this.shuttlecock.setPosition(200, 350);
      this.shuttlecock.setVelocity(0, 0);
      this.shuttlecock.setAngularVelocity(0);
    } else {
      this.shuttlecock.setPosition(1000, 350);
      this.shuttlecock.setVelocity(0, 0);
      this.shuttlecock.setAngularVelocity(0);
    }
    
    this.shuttlecock.setGravityY(0);
    this.gameState = 'scored';
  }

  private resetGame(): void {
    this.playerScore = 0;
    this.computerScore = 0;
    this.updateScore();
    this.lastServer = 'player';
    this.resetShuttlecock(this.lastServer);
    this.gameState = 'waiting';
  }

  private updateScore(): void {
    this.scoreText.setText(`你: ${this.playerScore}  -  电脑: ${this.computerScore}`);
  }

  private checkScoring(): void {
    const shuttlecockY = this.shuttlecock.y;
    const shuttlecockX = this.shuttlecock.x;
    
    if (shuttlecockY > 550) {
      if (shuttlecockX < 600) {
        this.computerScore++;
        this.lastServer = 'player';
      } else {
        this.playerScore++;
        this.lastServer = 'computer';
      }
      
      this.updateScore();
      this.resetShuttlecock(this.lastServer);
    }
    
    if (this.gameState === 'playing') {
      const shuttlecockBody = this.shuttlecock.body as Phaser.Physics.Arcade.Body;
      
      if (this.physics.overlap(this.shuttlecock, this.netZone)) {
        const shuttlecockVelocity = shuttlecockBody.velocity;
        
        if (shuttlecockVelocity.x > 0 && shuttlecockX < 600) {
          if (shuttlecockY > 280) {
            this.playerScore++;
            this.lastServer = 'computer';
            this.updateScore();
            this.resetShuttlecock(this.lastServer);
          } else {
            shuttlecockBody.setVelocityX(-shuttlecockVelocity.x * 0.5);
            shuttlecockBody.setVelocityY(Math.abs(shuttlecockVelocity.y) * 0.3);
          }
        } else if (shuttlecockVelocity.x < 0 && shuttlecockX > 600) {
          if (shuttlecockY > 280) {
            this.computerScore++;
            this.lastServer = 'player';
            this.updateScore();
            this.resetShuttlecock(this.lastServer);
          } else {
            shuttlecockBody.setVelocityX(-shuttlecockVelocity.x * 0.5);
            shuttlecockBody.setVelocityY(Math.abs(shuttlecockVelocity.y) * 0.3);
          }
        }
      }
    }
  }

  update(): void {
    const wasd = {
      up: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D)
    };
    
    this.player.update(wasd, this.input.activePointer);
    this.computer.update(this.shuttlecock);
    this.shuttlecock.update();
    
    if (this.gameState === 'playing') {
      this.checkScoring();
    }
    
    if (this.gameState === 'playing' && this.computer.canHit(this.shuttlecock)) {
      this.computer.autoHit(this.shuttlecock);
    }
  }
}
