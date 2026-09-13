import { ParticleSystem } from './ParticleSystem.js';
import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { defaultBlockchain } from '../blockchain/Blockchain.js';
import { minerEngine } from '../blockchain/ConsensusPoW.js';
import { playerWallet, NPC_MERCHANTS } from '../blockchain/Wallet.js';
import { nodeNetwork } from '../blockchain/NodeNetwork.js';
import { fiftyOneAttack } from '../blockchain/FiftyOneAttack.js';
import { doubleSpendSim } from '../blockchain/DoubleSpendSim.js';
import { smartContractEngine } from '../blockchain/SmartContract.js';
import { consensusPoS } from '../blockchain/ConsensusPoS.js';
import { posAttackSim } from '../blockchain/PosAttacks.js';
import { consensusComparison } from '../blockchain/ConsensusComparison.js';
import { posThresholdAttack } from '../blockchain/PosThresholdAttack.js';
import { finalitySimulator } from '../blockchain/FinalitySimulator.js';
import { mergeSimulation } from '../blockchain/MergeSimulation.js';
import { forkSimulator } from '../blockchain/ForkSimulator.js';

export class CanvasRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.particleSystem = new ParticleSystem();
    this.contractCallPacket = null;

    // Chapter 3 Network Scene state
    this.networkPackets = [];
    this.networkNodesPos = [
      { id: 'node_alpha', x: -340, y: -200, width: 230, height: 185 },
      { id: 'node_beta',  x: 110,  y: -200, width: 230, height: 185 },
      { id: 'node_gamma', x: -340, y: 35,   width: 230, height: 185 },
      { id: 'node_delta', x: 110,  y: 35,   width: 230, height: 185 }
    ];

    // Camera state
    this.camera = {
      x: 0,
      y: 0,
      zoom: 1.0,
      minZoom: 0.35,
      maxZoom: 2.5
    };

    // Interaction state
    this.isDragging = false;
    this.dragStartPos = { x: 0, y: 0 };
    this.lastMousePos = { x: 0, y: 0 };
    this.hoveredBlockIndex = null;
    this.blockBounds = [];
    this.mineBtnBounds = null;
    this.isHoveringMineBtn = false;

    // Simulation metrics
    this.fps = 60;
    this.frameCount = 0;
    this.lastFpsUpdate = performance.now();
    this.lastFrameTime = performance.now();

    // Custom visual scene hooks
    this.sceneData = {
      inputText: "Satoshi",
      nonce: 0,
      hash: "",
      avalancheRate: 0,
      isHashing: false
    };

    this.miningLockBanner = null;

    this.initCanvas();
    this.bindEvents();
  }

  initCanvas() {
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;

    // Center camera on first load
    if (this.camera.x === 0 && this.camera.y === 0) {
      this.camera.x = this.width / 2;
      this.camera.y = this.height / 2;
    }
  }

  bindEvents() {
    // Mouse pan and click controls
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.dragStartPos = { x: e.clientX, y: e.clientY };
      this.lastMousePos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      // Calculate world coordinates for hover testing
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldX = (mouseX - this.camera.x) / this.camera.zoom;
      const worldY = (mouseY - this.camera.y) / this.camera.zoom;

      // Hit-test mine button bounds
      let overMineBtn = false;
      if (this.mineBtnBounds) {
        if (
          worldX >= this.mineBtnBounds.x &&
          worldX <= this.mineBtnBounds.x + this.mineBtnBounds.width &&
          worldY >= this.mineBtnBounds.y &&
          worldY <= this.mineBtnBounds.y + this.mineBtnBounds.height
        ) {
          overMineBtn = true;
        }
      }
      this.isHoveringMineBtn = overMineBtn;

      // Hit-test block bounds
      let foundIndex = null;
      for (const b of this.blockBounds) {
        if (
          worldX >= b.x &&
          worldX <= b.x + b.width &&
          worldY >= b.y &&
          worldY <= b.y + b.height
        ) {
          foundIndex = b.index;
          break;
        }
      }

      this.hoveredBlockIndex = foundIndex;

      if (this.isDragging) {
        const dx = e.clientX - this.lastMousePos.x;
        const dy = e.clientY - this.lastMousePos.y;
        this.camera.x += dx;
        this.camera.y += dy;
        this.lastMousePos = { x: e.clientX, y: e.clientY };
        this.canvas.style.cursor = 'grabbing';
      } else {
        this.canvas.style.cursor = (overMineBtn || foundIndex !== null) ? 'pointer' : 'grab';
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (this.isDragging) {
        const dist = Math.hypot(e.clientX - this.dragStartPos.x, e.clientY - this.dragStartPos.y);
        // If minimal movement, treat as a click
        if (dist < 6) {
          if (this.isHoveringMineBtn) {
            // Clicked Mine Block button on canvas
            if (minerEngine.isMining) {
              minerEngine.stopMining();
            } else {
              const candidate = defaultBlockchain.candidateBlock || defaultBlockchain.createCandidateBlock(null, minerEngine.difficulty);
              minerEngine.startMining(candidate, minerEngine.difficulty);
            }
          } else if (this.hoveredBlockIndex !== null) {
            const block = defaultBlockchain.chain.find(b => b.index === this.hoveredBlockIndex) || defaultBlockchain.candidateBlock;
            if (block) {
              console.log(`[Block Click] Clicked Block #${this.hoveredBlockIndex} | previousHash: ${block.previousHash}`);
              eventBus.emit('BLOCK_CLICKED', { index: this.hoveredBlockIndex, block });
              eventBus.emit('BLOCK_INSPECTED', { index: this.hoveredBlockIndex, block });
              eventBus.emit('BLOCK_SELECTED', { index: this.hoveredBlockIndex, block });
            }
          }
        }
      }
      this.isDragging = false;
      this.canvas.style.cursor = (this.isHoveringMineBtn || this.hoveredBlockIndex !== null) ? 'pointer' : 'grab';
    });

    // Zoom controls via wheel
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      this.setZoom(this.camera.zoom * zoomFactor);
    }, { passive: false });

    // HUD buttons
    document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
      this.setZoom(this.camera.zoom * 1.15);
    });

    document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
      this.setZoom(this.camera.zoom * 0.85);
    });

    document.getElementById('btn-zoom-reset')?.addEventListener('click', () => {
      this.resetCamera();
    });

    // Listen to hash updates for Chapter 1
    eventBus.on('HASH_UPDATED', (data) => {
      this.sceneData.inputText = data.input;
      this.sceneData.nonce = data.nonce;
      this.sceneData.hash = data.hash;
      this.sceneData.avalancheRate = data.avalancheRate || 0;
      this.particleSystem.emitBurst(0, 0, '#00f0ff', 16);
    });

    // Listen to chain events
    eventBus.on('CHAIN_TAMPERED', ({ tamperedIndex }) => {
      const b = this.blockBounds.find(item => item.index === tamperedIndex);
      if (b) {
        this.particleSystem.emitBurst(b.x + b.width / 2, b.y + b.height / 2, '#ff3366', 25);
      }
    });

    eventBus.on('CHAIN_REPAIRED', () => {
      this.particleSystem.emitBurst(0, 0, '#00ff88', 35);
    });

    // Mining Celebration Effect
    eventBus.on('MINING_SUCCESS', ({ block, stats }) => {
      const b = this.blockBounds.find(item => item.index === block.index);
      const cx = b ? b.x + b.width / 2 : 0;
      const cy = b ? b.y + b.height / 2 : 0;
      this.particleSystem.emitBurst(cx, cy, '#00ff88', 60);
      this.particleSystem.emitBurst(cx, cy, '#ffb703', 50);
      this.particleSystem.emitBurst(cx, cy, '#00f0ff', 40);
      this.particleSystem.emitBurst(cx, cy, '#ffffff', 25);

      const diff = stats ? stats.difficulty : (block.difficulty || 2);
      this.miningLockBanner = {
        title: `BLOCK #${block.index} LOCKED INTO CHAIN 🔒`,
        subtitle: `Proof of Work Verified (Target: '${'0'.repeat(diff)}') • Subsidy: +50.0 QUEST`,
        alpha: 1.0
      };
    });

    // Transaction Sent Animation for Wallet Scene
    eventBus.on('TRANSACTION_SENT', ({ tx }) => {
      this.activeTxPacket = {
        tx,
        progress: 0,
        startX: -100,
        startY: 0,
        targetY: tx.toName?.includes('Bob') ? -92 : tx.toName?.includes('Alice') ? 2 : 98,
        targetX: 140
      };
      this.particleSystem.emitBurst(-100, 0, '#9d4edd', 25);
    });

    // P2P Network Broadcast Events (Chapter 3)
    eventBus.on('BROADCAST_STARTED', ({ tx, attackScenario }) => {
      this.networkPackets = this.networkNodesPos.map((pos, idx) => ({
        targetId: pos.id,
        startX: 0,
        startY: -10,
        targetX: pos.x + pos.width / 2,
        targetY: pos.y + pos.height / 2,
        progress: 0,
        speed: 0.03 + (idx % 2) * 0.008,
        attackScenario
      }));
      this.particleSystem.emitBurst(0, -10, '#00f0ff', 30);
    });

    eventBus.on('NODE_VERIFIED', ({ node, allPass }) => {
      const pos = this.networkNodesPos.find(p => p.id === node.id);
      if (pos) {
        const cx = pos.x + pos.width / 2;
        const cy = pos.y + pos.height / 2;
        if (allPass) {
          this.particleSystem.emitBurst(cx, cy, '#00ff88', 25);
        } else {
          this.particleSystem.emitBurst(cx, cy, '#ff3366', 35);
        }
      }
    });

    // 51% Attack event listeners
    eventBus.on('ATTACK_51_BLOCK_MINED', ({ chain, block }) => {
      const isHonest = chain === 'honest';
      const color = isHonest ? '#00ff88' : '#ff3366';
      const cx = -190 + (block.index - 1) * 160;
      const cy = isHonest ? -110 : 100;
      this.particleSystem.emitBurst(cx, cy, color, 30);
    });

    eventBus.on('ATTACK_51_REORG', () => {
      this.particleSystem.emitBurst(0, 0, '#ff3366', 60);
      this.particleSystem.emitBurst(0, 0, '#ffb703', 50);
      this.particleSystem.emitBurst(0, 0, '#00f0ff', 40);
    });

    // Double-Spend Attack event listeners
    eventBus.on('DOUBLE_SPEND_TX1_SENT', () => {
      this.particleSystem.emitBurst(-130, -50, '#00ff88', 35);
      this.particleSystem.emitBurst(10, -50, '#00f0ff', 30);
    });

    eventBus.on('DOUBLE_SPEND_ATTEMPTED', () => {
      this.particleSystem.emitBurst(-130, 50, '#ff3366', 35);
      this.particleSystem.emitBurst(10, 50, '#ffb703', 30);
    });

    eventBus.on('DOUBLE_SPEND_REJECTED', () => {
      this.particleSystem.emitBurst(10, 0, '#ff3366', 50);
      this.particleSystem.emitBurst(10, 0, '#ffb703', 40);
    });

    // PoS Attacks Simulation Events
    eventBus.on('NOTHING_AT_STAKE_SLASHED', () => {
      this.particleSystem.emitBurst(250, 0, '#ff3366', 50);
      this.particleSystem.emitBurst(250, 0, '#ff9e00', 40);
    });
    eventBus.on('LONG_RANGE_ATTACK_DEFENDED', () => {
      this.particleSystem.emitBurst(60, 0, '#00f0ff', 50);
      this.particleSystem.emitBurst(60, 0, '#00ff88', 40);
    });

    // PoS Slashing & Consensus Events
    this.activeSlashingAnimation = null;
    eventBus.on('POS_SLASHING_TRIGGERED', (data) => {
      this.activeSlashingAnimation = {
        validatorId: data.validator ? data.validator.id : data.validatorId,
        validatorName: data.validator ? data.validator.name : 'Validator',
        stakeBurned: data.stakeBurned || data.slashedStake || 0,
        penaltyPercent: data.penaltyPercent || 100,
        offenseLabel: data.offenseLabel || data.offenseType || 'SLASHED',
        offenseIcon: data.offenseIcon || '⚔️',
        startTime: performance.now(),
        durationMs: 3500
      };
      this.particleSystem.emitBurst(0, 0, '#ff3366', 60);
      this.particleSystem.emitBurst(0, 0, '#ff9e00', 45);
      this.particleSystem.emitBurst(0, 0, '#ff0033', 35);
    });

    // Smart Contract events (Chapter 7)
    eventBus.on('CONTRACT_DEPLOYED', () => {
      this.particleSystem.emitBurst(180, 0, '#00f0ff', 40);
      this.particleSystem.emitBurst(180, 0, '#ffb703', 30);
    });

    // The Merge Upgrade Event Listener
    eventBus.on('THE_MERGE_TRIGGERED', () => {
      this.particleSystem.emitBurst(0, -60, '#ffd700', 80);
      this.particleSystem.emitBurst(0, -60, '#00ff88', 60);
      this.particleSystem.emitBurst(0, -60, '#00f0ff', 60);
      this.particleSystem.emitBurst(0, -60, '#ffffff', 40);
    });

    eventBus.on('CONTRACT_INVOKED', ({ fnName }) => {
      this.contractCallPacket = {
        fnName,
        progress: 0,
        startX: -140,
        startY: 0,
        targetX: 80,
        targetY: 0
      };
      this.particleSystem.emitBurst(-140, 0, '#9d4edd', 25);
    });
  }

  setZoom(val) {
    this.camera.zoom = Math.max(this.camera.minZoom, Math.min(this.camera.maxZoom, val));
  }

  resetCamera() {
    this.camera.x = this.width / 2;
    this.camera.y = this.height / 2;
    this.camera.zoom = 1.0;
  }

  updateMetrics(now) {
    this.frameCount++;
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;

      const fpsEl = document.getElementById('hud-fps');
      if (fpsEl) fpsEl.textContent = `${this.fps} FPS`;
    }
  }

  start() {
    const loop = (now) => {
      const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
      this.lastFrameTime = now;

      this.updateMetrics(now);

      if (!gameState.simulationPaused) {
        this.particleSystem.update(dt * 60);
      }

      this.render();
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Background Grid
    this.drawBackgroundGrid(ctx);

    // 2. Camera Transform
    ctx.save();
    ctx.translate(this.camera.x, this.camera.y);
    ctx.scale(this.camera.zoom, this.camera.zoom);

    // 3. Render Active Scene
    const lvl = gameState.currentLevel;
    if (forkSimulator && forkSimulator.isActive) {
      this.drawForkSimulatorScene(ctx);
    } else if (mergeSimulation && mergeSimulation.isActive) {
      this.drawMergeSimulationScene(ctx);
    } else if (finalitySimulator && finalitySimulator.isActive) {
      this.drawFinalityComparisonScene(ctx);
    } else if (consensusComparison && consensusComparison.isActive) {
      this.drawSplitScreenComparison(ctx);
    } else if (posAttackSim && posAttackSim.isActive) {
      this.drawPosAttackScene(ctx);
    } else if (posThresholdAttack && posThresholdAttack.isActive) {
      this.drawPosThresholdAttackScene(ctx);
    } else if (consensusPoS && consensusPoS.isActive) {
      this.drawPoSValidatorScene(ctx);
    } else if (doubleSpendSim.isActive) {
      this.drawDoubleSpendScene(ctx);
    } else if (fiftyOneAttack.isActive) {
      this.drawFiftyOneAttackScene(ctx);
    } else if (lvl === 1 || lvl === 2) {
      this.drawBlockchainScene(ctx);
    } else if (lvl === 3 || gameState.currentChapter === 6) {
      this.drawWalletScene(ctx);
    } else if (lvl === 4 || gameState.currentChapter === 3) {
      this.drawNetworkScene(ctx);
    } else if (lvl === 5) {
      if (fiftyOneAttack.isActive) this.drawFiftyOneAttackScene(ctx);
      else this.drawDoubleSpendScene(ctx);
    } else if (lvl === 6 || gameState.currentChapter === 7) {
      this.drawSmartContractScene(ctx);
    } else {
      this.drawBlockchainScene(ctx);
    }

    // 4. Particle System
    this.particleSystem.draw(ctx);

    ctx.restore();

    // 5. Mining Lock Overlay Banner
    if (this.miningLockBanner && this.miningLockBanner.alpha > 0.01) {
      this.drawMiningLockBanner(ctx);
      this.miningLockBanner.alpha -= 0.005;
    }
  }

  drawMiningLockBanner(ctx) {
    if (!this.miningLockBanner) return;
    ctx.save();
    const b = this.miningLockBanner;
    ctx.globalAlpha = Math.max(0, Math.min(1, b.alpha));
    const bannerW = 440;
    const bannerH = 52;
    const x = (this.width - bannerW) / 2;
    const y = 80;

    // Outer glow
    ctx.shadowColor = 'rgba(255, 183, 3, 0.6)';
    ctx.shadowBlur = 18;

    // Background card
    ctx.fillStyle = 'rgba(11, 17, 30, 0.95)';
    ctx.beginPath();
    ctx.roundRect(x, y, bannerW, bannerH, 8);
    ctx.fill();

    // Border
    ctx.strokeStyle = 'rgba(255, 183, 3, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Title
    ctx.fillStyle = '#ffb703';
    ctx.font = 'bold 12.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.title, x + bannerW / 2, y + 18);

    // Subtitle
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '10.5px "JetBrains Mono", Consolas, monospace';
    ctx.fillText(b.subtitle, x + bannerW / 2, y + 36);

    ctx.restore();
  }

  drawBackgroundGrid(ctx) {
    const gridSize = 40 * this.camera.zoom;
    const offsetX = (this.camera.x % gridSize);
    const offsetY = (this.camera.y % gridSize);

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    for (let x = offsetX; x < this.width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    for (let y = offsetY; y < this.height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
    }
    ctx.stroke();

    // Radial vignette
    const grad = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 100,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) / 1.2
    );
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(5, 8, 15, 0.7)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.restore();
  }

  /**
   * Render Connected Blockchain with interactive tamper detection and broken links
   */
  drawBlockchainScene(ctx) {
    const chain = defaultBlockchain.chain;
    const integrity = defaultBlockchain.getChainIntegrity();
    const time = performance.now() * 0.003;

    const cardW = 220;
    const cardH = 180;
    const spacing = 85;
    const totalW = chain.length * cardW + (chain.length - 1) * spacing;
    const startX = -totalW / 2;
    const startY = -cardH / 2;

    this.blockBounds = [];

    // --- A. Draw Connecting Links First ---
    for (let i = 1; i < chain.length; i++) {
      const x1 = startX + (i - 1) * (cardW + spacing) + cardW;
      const y1 = startY + cardH / 2;
      const x2 = startX + i * (cardW + spacing);
      const y2 = y1;

      const isBroken = integrity.brokenLinks.includes(i);

      ctx.save();
      if (isBroken) {
        // Fractured Broken Red Cable
        ctx.strokeStyle = '#ff3366';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(255, 51, 102, 0.8)';
        ctx.shadowBlur = 14;

        // Draw jagged broken laser path
        const midX = (x1 + x2) / 2;
        const jitter = Math.sin(time * 8 + i) * 6;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(midX - 10, y1);
        ctx.lineTo(midX - 4, y1 + jitter);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(midX + 4, y1 - jitter);
        ctx.lineTo(midX + 10, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Broken link warning badge
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 51, 102, 0.2)';
        ctx.strokeStyle = '#ff3366';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(midX - 42, y1 - 24, 84, 18, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ff3366';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚠️ MISMATCH', midX, y1 - 15);

        // Continuous spark emitters for broken links
        if (Math.random() < 0.25) {
          this.particleSystem.emitBurst(midX, y1, '#ff3366', 2);
        }
      } else {
        // Healthy Glowing Cyan/Green Cable
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'rgba(0, 240, 255, 0.4)';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Flowing data packet pulse
        const packetProgress = (time * 0.8 + i * 0.3) % 1;
        const px = x1 + (x2 - x1) * packetProgress;
        ctx.fillStyle = '#00ff88';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(px, y1, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Connected link badge
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0, 240, 255, 0.1)';
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
        ctx.lineWidth = 1;
        const midX = (x1 + x2) / 2;
        ctx.beginPath();
        ctx.roundRect(midX - 30, y1 - 22, 60, 16, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#00f0ff';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⛓ LINKED', midX, y1 - 14);
      }
      ctx.restore();
    }

    // --- B. Draw Block Cards ---
    for (let i = 0; i < chain.length; i++) {
      const block = chain[i];
      const x = startX + i * (cardW + spacing);
      const y = startY;

      this.blockBounds.push({ x, y, width: cardW, height: cardH, index: i });

      const isHovered = this.hoveredBlockIndex === i;
      const isInvalid = integrity.invalidBlocks.includes(i) || (i > 0 && integrity.brokenLinks.includes(i)) || (i + 1 < chain.length && integrity.brokenLinks.includes(i + 1));

      ctx.save();

      // Card Background & Border
      ctx.fillStyle = isHovered ? '#16233b' : '#0f182a';
      if (isInvalid) {
        ctx.strokeStyle = '#ff3366';
        ctx.shadowColor = 'rgba(255, 51, 102, 0.4)';
        ctx.shadowBlur = isHovered ? 18 : 10;
      } else {
        ctx.strokeStyle = isHovered ? '#00f0ff' : 'rgba(0, 240, 255, 0.4)';
        ctx.shadowColor = 'rgba(0, 240, 255, 0.3)';
        ctx.shadowBlur = isHovered ? 16 : 6;
      }
      ctx.lineWidth = isHovered ? 2.5 : 1.5;

      ctx.beginPath();
      ctx.roundRect(x, y, cardW, cardH, 10);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 1. Header Row (Block Index & Validity Pill)
      const blockTitle = i === 0 ? 'BLOCK #0 (GENESIS)' : `BLOCK #${i}`;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(blockTitle, x + 12, y + 24);

      // Status Pill
      const pillX = x + cardW - 68;
      const pillY = y + 12;
      ctx.fillStyle = isInvalid ? 'rgba(255, 51, 102, 0.15)' : 'rgba(0, 255, 136, 0.15)';
      ctx.strokeStyle = isInvalid ? '#ff3366' : '#00ff88';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, 56, 18, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isInvalid ? '#ff3366' : '#00ff88';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(isInvalid ? 'TAMPERED' : 'VALID', pillX + 28, pillY + 12);

      // 2. Data / Transaction Summary
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('TRANSACTION DATA', x + 12, y + 50);

      // Data text bubble
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.roundRect(x + 12, y + 56, cardW - 24, 34, 4);
      ctx.fill();

      ctx.fillStyle = isInvalid ? '#ff99aa' : '#f8fafc';
      ctx.font = '11px -apple-system, sans-serif';
      const summary = block.getSummary();
      const displayTx = summary.length > 25 ? summary.substring(0, 25) + '...' : summary;
      ctx.fillText(displayTx, x + 18, y + 78);

      // 3. Nonce & Difficulty / Mining stats
      ctx.fillStyle = '#ffb703';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`Nonce: ${block.nonce}`, x + 12, y + 106);

      if (block.miningStats) {
        ctx.fillStyle = '#00ff88';
        const timeSec = (block.miningStats.timeMs / 1000).toFixed(1);
        ctx.fillText(`⏱ ${timeSec}s (${block.miningStats.attempts.toLocaleString()} nonces)`, x + 88, y + 106);
      }

      // 4. Hashes (Truncated)
      ctx.fillStyle = '#64748b';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText('PREV HASH:', x + 12, y + 124);
      ctx.fillStyle = isInvalid ? '#ff7799' : '#94a3b8';
      const truncPrev = block.previousHash.substring(0, 8) + '...' + block.previousHash.substring(58);
      ctx.fillText(truncPrev, x + 72, y + 124);

      ctx.fillStyle = '#64748b';
      ctx.fillText('BLOCK HASH:', x + 12, y + 140);
      ctx.fillStyle = isInvalid ? '#ff3366' : '#00ff88';
      const truncHash = block.hash.substring(0, 8) + '...' + block.hash.substring(58);
      ctx.fillText(truncHash, x + 76, y + 140);

      // 5. Interactive Click Prompt
      ctx.fillStyle = isHovered ? '#00f0ff' : '#475569';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[ Click to Edit / Tamper ]', x + cardW / 2, y + 165);

      ctx.restore();
    }

    // --- C. Draw Unmined Candidate Block & Link (if exists) ---
    const candidate = defaultBlockchain.candidateBlock;
    if (candidate) {
      const i = chain.length;
      const prevBlockX = startX + (i - 1) * (cardW + spacing) + cardW;
      const prevBlockY = startY + cardH / 2;
      const candX = startX + i * (cardW + spacing);
      const candY = startY;

      // 1. Pending Cable Link
      ctx.save();
      ctx.strokeStyle = minerEngine.isMining ? 'rgba(255, 183, 3, 0.9)' : 'rgba(255, 183, 3, 0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(prevBlockX, prevBlockY);
      ctx.lineTo(candX, prevBlockY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Pending badge on wire
      const midWireX = (prevBlockX + candX) / 2;
      ctx.fillStyle = 'rgba(255, 183, 3, 0.15)';
      ctx.strokeStyle = 'rgba(255, 183, 3, 0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(midWireX - 44, prevBlockY - 20, 88, 16, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffb703';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(minerEngine.isMining ? '⛏️ MINING...' : '⏳ PENDING PROOF', midWireX, prevBlockY - 12);
      ctx.restore();

      // 2. Candidate Block Card
      ctx.save();
      const isCandHovered = this.hoveredBlockIndex === candidate.index;
      ctx.fillStyle = minerEngine.isMining ? '#1c1607' : '#141005';
      ctx.strokeStyle = minerEngine.isMining ? '#ffb703' : 'rgba(255, 183, 3, 0.6)';
      ctx.shadowColor = 'rgba(255, 183, 3, 0.5)';
      ctx.shadowBlur = minerEngine.isMining ? 20 : (isCandHovered ? 14 : 6);
      ctx.lineWidth = minerEngine.isMining ? 2.5 : 1.5;

      ctx.beginPath();
      ctx.roundRect(candX, candY, cardW, cardH, 10);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      this.blockBounds.push({ x: candX, y: candY, width: cardW, height: cardH, index: candidate.index });

      // Header: Index & Unmined Status
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`BLOCK #${candidate.index} [UNMINED]`, candX + 12, candY + 24);

      // Target Difficulty Pill
      const targetPrefix = '0'.repeat(minerEngine.difficulty);
      ctx.fillStyle = 'rgba(255, 183, 3, 0.15)';
      ctx.strokeStyle = '#ffb703';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(candX + cardW - 74, candY + 12, 62, 18, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffb703';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`REQ: ${targetPrefix}`, candX + cardW - 43, candY + 24);

      // Transaction Data
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('PENDING TX PAYLOAD', candX + 12, candY + 50);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.roundRect(candX + 12, candY + 56, cardW - 24, 30, 4);
      ctx.fill();

      ctx.fillStyle = '#ffdf80';
      ctx.font = '11px -apple-system, sans-serif';
      const candTx = candidate.getSummary();
      ctx.fillText(candTx.length > 25 ? candTx.substring(0, 25) + '...' : candTx, candX + 18, candY + 76);

      // Live Nonce & Hash Guess
      ctx.fillStyle = '#ffb703';
      ctx.font = '10px "JetBrains Mono", monospace';
      const liveNonce = minerEngine.isMining ? candidate.nonce : (candidate.nonce || 0);
      ctx.fillText(`Nonce: ${liveNonce.toLocaleString()}`, candX + 12, candY + 104);

      // Hash preview
      ctx.fillStyle = '#64748b';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText('HASH:', candX + 12, candY + 120);

      const liveHash = candidate.hash;
      const leadingZeros = liveHash.startsWith(targetPrefix) ? targetPrefix.length : 0;
      ctx.fillStyle = leadingZeros > 0 ? '#00ff88' : (minerEngine.isMining ? '#ffb703' : '#94a3b8');
      ctx.fillText(liveHash.substring(0, 10) + '...' + liveHash.substring(58), candX + 48, candY + 120);

      // 3. Glowing Interactive "Mine Block" Button inside card
      const btnW = cardW - 24;
      const btnH = 28;
      const btnX = candX + 12;
      const btnY = candY + 138;

      this.mineBtnBounds = { x: btnX, y: btnY, width: btnW, height: btnH };

      const isBtnHovered = this.isHoveringMineBtn;
      ctx.fillStyle = minerEngine.isMining
        ? (isBtnHovered ? '#ff4d79' : '#ff3366')
        : (isBtnHovered ? '#ffc72e' : '#ffb703');

      ctx.shadowColor = minerEngine.isMining ? 'rgba(255, 51, 102, 0.6)' : 'rgba(255, 183, 3, 0.6)';
      ctx.shadowBlur = isBtnHovered ? 12 : 6;
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 6);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#0a0e17';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (minerEngine.isMining) {
        ctx.fillText(`⏹ STOP (${minerEngine.attempts.toLocaleString()} H)`, btnX + btnW / 2, btnY + btnH / 2);
      } else {
        ctx.fillText(`⛏️ MINE BLOCK (${targetPrefix})`, btnX + btnW / 2, btnY + btnH / 2);
      }

      // 4. Mining particle sparkles around unmined block
      if (minerEngine.isMining) {
        const sparkX = candX + Math.random() * cardW;
        const sparkY = candY + Math.random() * cardH;
        this.particleSystem.emitBurst(sparkX, sparkY, '#ffb703', 2);
      }

      ctx.restore();
    } else {
      this.mineBtnBounds = null;
    }
  }

  drawChapter1Visuals(ctx) {
    const time = performance.now() * 0.002;
    const { inputText, hash, nonce } = this.sceneData;

    // Left Input Hopper
    ctx.save();
    ctx.fillStyle = '#121c30';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0, 240, 255, 0.3)';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.roundRect(-320, -70, 180, 140, 8);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('INPUT PAYLOAD', -305, -45);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px -apple-system, sans-serif';
    const displayInput = inputText.length > 14 ? inputText.substring(0, 14) + '...' : (inputText || '[Empty]');
    ctx.fillText(displayInput, -305, -20);

    ctx.fillStyle = '#ffb703';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText(`Nonce: ${nonce}`, -305, 5);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(`${(inputText + nonce).length * 8} bits in`, -305, 35);
    ctx.restore();

    // Central SHA-256 Compression Core
    ctx.save();
    ctx.fillStyle = '#0b111e';
    ctx.strokeStyle = '#9d4edd';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(157, 78, 221, 0.5)';
    ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.arc(0, 0, 75, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, 60, time, time + Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 255, 136, 0.6)';
    ctx.beginPath();
    ctx.arc(0, 0, 45, -time * 1.5, -time * 1.5 + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SHA-256', 0, -8);

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText('64 ROUNDS', 0, 12);
    ctx.restore();

    // Data stream lines
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-140, 0);
    ctx.lineTo(-75, 0);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 255, 136, 0.4)';
    ctx.beginPath();
    ctx.moveTo(75, 0);
    ctx.lineTo(140, 0);
    ctx.stroke();
    ctx.restore();

    // Right Output Hash Vault
    ctx.save();
    ctx.fillStyle = '#121c30';
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0, 255, 136, 0.3)';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.roundRect(140, -70, 220, 140, 8);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('FIXED 256-BIT DIGEST', 155, -45);

    const safeHash = hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.fillText(safeHash.substring(0, 16), 155, -20);
    ctx.fillText(safeHash.substring(16, 32), 155, -3);
    ctx.fillText(safeHash.substring(32, 48), 155, 14);
    ctx.fillText(safeHash.substring(48, 64), 155, 31);

    ctx.fillStyle = '#64748b';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('Exact 64 hex chars (32 bytes)', 155, 52);
    ctx.restore();
  }

  /**
   * Render Chapter 6: Wallet and P2P Merchant Payment Network
   */
  drawWalletScene(ctx) {
    const time = performance.now() * 0.002;

    // --- 1. Connecting Conduits from Player (-100, 0) to Merchants ---
    const merchantTargets = [
      { y: -92, name: "Bob (Armory)" },
      { y: 2, name: "Alice (Potions)" },
      { y: 98, name: "Charlie (Cyberdeck)" }
    ];

    ctx.save();
    merchantTargets.forEach((m, idx) => {
      ctx.strokeStyle = 'rgba(157, 78, 221, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-100, 0);
      ctx.bezierCurveTo(0, 0, 40, m.y, 140, m.y);
      ctx.stroke();

      // Flowing data pulse
      const pulseProgress = (time * 0.6 + idx * 0.33) % 1;
      const t = pulseProgress;
      // Cubic bezier point calculation
      const p0 = { x: -100, y: 0 };
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 40, y: m.y };
      const p3 = { x: 140, y: m.y };

      const bx = Math.pow(1 - t, 3) * p0.x + 3 * Math.pow(1 - t, 2) * t * p1.x + 3 * (1 - t) * Math.pow(t, 2) * p2.x + Math.pow(t, 3) * p3.x;
      const by = Math.pow(1 - t, 3) * p0.y + 3 * Math.pow(1 - t, 2) * t * p1.y + 3 * (1 - t) * Math.pow(t, 2) * p2.y + Math.pow(t, 3) * p3.y;

      ctx.fillStyle = '#9d4edd';
      ctx.shadowColor = '#9d4edd';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // --- 2. Active Transaction Packet Animation ---
    if (this.activeTxPacket) {
      this.activeTxPacket.progress += 0.02;
      const prog = Math.min(1, this.activeTxPacket.progress);

      const px = this.activeTxPacket.startX + (this.activeTxPacket.targetX - this.activeTxPacket.startX) * prog;
      const py = this.activeTxPacket.startY + (this.activeTxPacket.targetY - this.activeTxPacket.startY) * prog;

      ctx.save();
      ctx.fillStyle = '#1c132b';
      ctx.strokeStyle = '#9d4edd';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(157, 78, 221, 0.8)';
      ctx.shadowBlur = 15;

      ctx.beginPath();
      ctx.roundRect(px - 60, py - 18, 120, 36, 6);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${this.activeTxPacket.tx.amount.toFixed(1)} QUEST ➔`, px, py - 4);

      ctx.fillStyle = '#00ff88';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText('[SIGNED 🖋️]', px, py + 8);

      // Trailing sparks
      if (Math.random() < 0.4) {
        this.particleSystem.emitBurst(px, py, '#9d4edd', 2);
      }
      ctx.restore();

      if (prog >= 1) {
        this.particleSystem.emitBurst(this.activeTxPacket.targetX + 60, this.activeTxPacket.targetY, '#00ff88', 35);
        this.activeTxPacket = null;
      }
    }

    // --- 3. Player Wallet Node Card (Left) ---
    ctx.save();
    const wx = -320;
    const wy = -105;
    const ww = 220;
    const wh = 210;

    ctx.fillStyle = '#0e1626';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0, 240, 255, 0.35)';
    ctx.shadowBlur = 14;

    ctx.beginPath();
    ctx.roundRect(wx, wy, ww, wh, 10);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    // Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('💼 PLAYER WALLET', wx + 14, wy + 24);

    ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(wx + ww - 68, wy + 12, 56, 18, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ACTIVE', wx + ww - 40, wy + 24);

    // Balance display
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('CONFIRMED BALANCE', wx + 14, wy + 52);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.fillText(`${playerWallet.balance.toFixed(2)}`, wx + 14, wy + 76);
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText('QUEST', wx + 14 + ctx.measureText(`${playerWallet.balance.toFixed(2)} `).width, wy + 76);

    // Nonce & Address
    ctx.fillStyle = '#ffb703';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(`Sequence Nonce: #${playerWallet.nonce}`, wx + 14, wy + 104);

    ctx.fillStyle = '#64748b';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText('PUBLIC ADDRESS:', wx + 14, wy + 124);

    ctx.fillStyle = '#94a3b8';
    const shortAddr = playerWallet.address.substring(0, 10) + '...' + playerWallet.address.substring(34);
    ctx.fillText(shortAddr, wx + 14, wy + 138);

    // Keypair Status
    ctx.fillStyle = '#64748b';
    ctx.fillText('SECURITY STATUS:', wx + 14, wy + 158);
    ctx.fillStyle = '#00ff88';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('✓ Private Key Ready [ECDSA Mock]', wx + 14, wy + 172);

    // Output Port
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(wx + ww, wy + wh / 2, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // --- 4. NPC Merchant Node Cards (Right) ---
    const merchants = [
      {
        name: "Merchant Bob",
        tag: "Armory & Node Shields",
        address: "0xBob894...8390",
        y: -130,
        color: '#ffb703',
        icon: '🛡️'
      },
      {
        name: "Merchant Alice",
        tag: "Potion Lab & Gas Fuel",
        address: "0xAlice5...8901",
        y: -35,
        color: '#00ff88',
        icon: '🧪'
      },
      {
        name: "Merchant Charlie",
        tag: "Cyberdeck Hardware",
        address: "0xChar72...3019",
        y: 60,
        color: '#9d4edd',
        icon: '💻'
      }
    ];

    merchants.forEach(m => {
      ctx.save();
      const mx = 140;
      const my = m.y;
      const mw = 210;
      const mh = 70;

      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = m.color;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = m.color;
      ctx.shadowBlur = 6;

      ctx.beginPath();
      ctx.roundRect(mx, my, mw, mh, 8);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      // Header
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${m.icon} ${m.name}`, mx + 12, my + 22);

      // Subtitle
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.fillText(m.tag, mx + 12, my + 38);

      // Address
      ctx.fillStyle = '#64748b';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText(`Addr: ${m.address}`, mx + 12, my + 54);

      // Input Port
      ctx.fillStyle = m.color;
      ctx.shadowColor = m.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(mx, my + mh / 2, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }

  drawNetworkScene(ctx) {
    const nodes = nodeNetwork.nodes;
    const positions = this.networkNodesPos;

    // --- Title Header in Canvas ---
    ctx.save();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PEER-TO-PEER GOSSIP NETWORK • BYZANTINE FAULT TOLERANT VALIDATION', 0, -225);
    ctx.restore();

    // --- 1. Peer-to-Peer Mesh Topology Links ---
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);

    // Outer mesh perimeter & diagonals
    const coords = positions.map(p => ({
      id: p.id,
      cx: p.x + p.width / 2,
      cy: p.y + p.height / 2
    }));

    // Connect all node pairs in mesh
    for (let i = 0; i < coords.length; i++) {
      for (let j = i + 1; j < coords.length; j++) {
        ctx.beginPath();
        ctx.moveTo(coords[i].cx, coords[i].cy);
        ctx.lineTo(coords[j].cx, coords[j].cy);
        ctx.stroke();
      }
    }

    // Connect central transmitter hub (0, -10) to each node
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    for (const c of coords) {
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(c.cx, c.cy);
      ctx.stroke();
    }
    ctx.restore();

    // Animated data pulse along mesh lines
    const t = (Date.now() * 0.0008) % 1;
    ctx.save();
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    for (let i = 0; i < coords.length; i++) {
      const next = coords[(i + 1) % coords.length];
      const px = coords[i].cx + (next.cx - coords[i].cx) * t;
      const py = coords[i].cy + (next.cy - coords[i].cy) * t;
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // --- 2. Central Broadcast Transmitter Hub ---
    ctx.save();
    const hubPulse = Math.sin(Date.now() * 0.004) * 4;
    // Outer glow wave
    ctx.strokeStyle = nodeNetwork.isBroadcasting ? 'rgba(255, 183, 3, 0.4)' : 'rgba(0, 240, 255, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -10, 36 + hubPulse, 0, Math.PI * 2);
    ctx.stroke();

    // Transmitter disk
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = nodeNetwork.isBroadcasting ? '#ffb703' : '#00f0ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = nodeNetwork.isBroadcasting ? '#ffb703' : '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, -10, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📡', 0, -10);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillText('MEMPOOL HUB', 0, 28);
    ctx.restore();

    // --- 3. Flying Broadcast Packets ---
    if (this.networkPackets && this.networkPackets.length > 0) {
      this.networkPackets.forEach((pkt) => {
        pkt.progress += pkt.speed || 0.035;
        const prog = Math.min(1, pkt.progress);
        const curX = pkt.startX + (pkt.targetX - pkt.startX) * prog;
        const curY = pkt.startY + (pkt.targetY - pkt.startY) * prog;

        ctx.save();
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = pkt.attackScenario === 'VALID' ? '#00f0ff' : '#ffb703';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = pkt.attackScenario === 'VALID' ? '#00f0ff' : '#ffb703';
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.roundRect(curX - 28, curY - 12, 56, 24, 6);
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TX ✉️', curX, curY);

        if (Math.random() < 0.35) {
          this.particleSystem.emitBurst(curX, curY, pkt.attackScenario === 'VALID' ? '#00f0ff' : '#ffb703', 2);
        }
        ctx.restore();

        if (prog >= 1 && !pkt.arrived) {
          pkt.arrived = true;
          this.particleSystem.emitBurst(pkt.targetX, pkt.targetY, '#00f0ff', 14);
        }
      });

      this.networkPackets = this.networkPackets.filter(pkt => pkt.progress < 1);
    }

    // --- 4. The 4 Network Node Cards ---
    nodes.forEach((node) => {
      const pos = positions.find(p => p.id === node.id);
      if (!pos) return;

      const { x, y, width, height } = pos;
      let primaryColor = '#334155';
      let shadowColor = 'rgba(0, 240, 255, 0.15)';
      let bgColor = '#0d1527';
      let badgeText = 'IDLE';

      if (node.status === 'approved') {
        primaryColor = '#00ff88';
        shadowColor = 'rgba(0, 255, 136, 0.45)';
        bgColor = '#091a1e';
        badgeText = 'APPROVED';
      } else if (node.status === 'rejected') {
        primaryColor = '#ff3366';
        shadowColor = 'rgba(255, 51, 102, 0.5)';
        bgColor = '#1f0d14';
        badgeText = 'REJECTED';
      } else if (node.status === 'checking') {
        primaryColor = '#ffb703';
        shadowColor = 'rgba(255, 183, 3, 0.45)';
        bgColor = '#1a1409';
        badgeText = 'CHECKING...';
      }

      ctx.save();
      ctx.fillStyle = bgColor;
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = node.status === 'idle' ? 1.5 : 2;
      ctx.shadowColor = shadowColor;
      ctx.shadowBlur = node.status === 'idle' ? 6 : 14;

      // Card outline
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 10);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Header: Avatar & Node Name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${node.avatar} ${node.name}`, x + 12, y + 22);

      // Subtitle / Role
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.fillText(node.role, x + 12, y + 36);

      // Status Badge Pill (Top Right)
      const pillW = 75;
      const pillH = 18;
      const pillX = x + width - pillW - 10;
      const pillY = y + 12;

      ctx.fillStyle = `${primaryColor}22`;
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = primaryColor;
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(badgeText, pillX + pillW / 2, pillY + 12);

      // Separator Line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 46);
      ctx.lineTo(x + width - 10, y + 46);
      ctx.stroke();

      // Scanning bar effect when checking
      if (node.status === 'checking') {
        const scanY = y + 48 + ((Date.now() * 0.08) % (height - 80));
        ctx.strokeStyle = 'rgba(255, 183, 3, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 10, scanY);
        ctx.lineTo(x + width - 10, scanY);
        ctx.stroke();
      }

      // 4 Sequential Checks Rows
      const checkItems = [
        { label: 'Signature Valid', check: node.checks.sig },
        { label: 'Sufficient Balance', check: node.checks.balance },
        { label: 'Nonce Correct (N+1)', check: node.checks.nonce },
        { label: 'Not a Double-Spend', check: node.checks.doubleSpend }
      ];

      const startY = y + 62;
      const rowHeight = 22;

      checkItems.forEach((item, rIdx) => {
        const rowY = startY + rIdx * rowHeight;
        const st = item.check ? item.check.status : 'pending';

        let sym = '·';
        let symColor = '#64748b';
        let statusTag = 'WAITING';

        if (st === 'pass') {
          sym = '✓';
          symColor = '#00ff88';
          statusTag = 'VALID';
        } else if (st === 'fail') {
          sym = '✕';
          symColor = '#ff3366';
          statusTag = 'REJECTED';
        } else if (node.status === 'checking') {
          sym = '⚙';
          symColor = '#ffb703';
          statusTag = 'CHECK';
        }

        // Check icon
        ctx.fillStyle = symColor;
        ctx.font = 'bold 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(sym, x + 14, rowY);

        // Check label
        ctx.fillStyle = st === 'fail' ? '#ff3366' : '#cbd5e1';
        ctx.font = '11px -apple-system, sans-serif';
        ctx.fillText(item.label, x + 30, rowY);

        // Check result tag
        ctx.fillStyle = symColor;
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(statusTag, x + width - 14, rowY);
      });

      // Card Bottom Status Banner
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.moveTo(x + 10, y + height - 26);
      ctx.lineTo(x + width - 10, y + height - 26);
      ctx.stroke();

      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';

      if (node.status === 'rejected') {
        ctx.fillStyle = '#ff3366';
        const reason = node.failureReason || 'Verification Failed!';
        const shortReason = reason.length > 28 ? reason.substring(0, 26) + '...' : reason;
        ctx.fillText(`⚠️ ${shortReason}`, x + 12, y + height - 10);
      } else if (node.status === 'approved') {
        ctx.fillStyle = '#00ff88';
        ctx.fillText('✓ 4/4 Checks Passed [Vote: Accept]', x + 12, y + height - 10);
      } else if (node.status === 'checking') {
        ctx.fillStyle = '#ffb703';
        ctx.fillText('⚙️ Executing Invariant Checks...', x + 12, y + height - 10);
      } else {
        ctx.fillStyle = '#64748b';
        ctx.fillText('• Peer Listening (Port 8333)', x + 12, y + height - 10);
      }

      ctx.restore();
    });
  }

  drawFiftyOneAttackScene(ctx) {
    const honestChain = fiftyOneAttack.honestChain;
    const attackerChain = fiftyOneAttack.attackerChain;
    const isReorg = fiftyOneAttack.reorgHappened;

    // 1. Scene Header & Telemetry
    ctx.save();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('51% CONSENSUS ATTACK SIMULATION — NAKAMOTO LONGEST-CHAIN REORGANIZATION', 0, -220);

    // Hashrate distribution pill
    const hrX = -180;
    const hrY = -205;
    const hrW = 360;
    const hrH = 14;

    // 40% Honest hashrate segment (green)
    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.roundRect(hrX, hrY, hrW * 0.4, hrH, [4, 0, 0, 4]);
    ctx.fill();

    // 60% Attacker hashrate segment (red)
    ctx.fillStyle = '#ff3366';
    ctx.beginPath();
    ctx.roundRect(hrX + hrW * 0.4, hrY, hrW * 0.6, hrH, [0, 4, 4, 0]);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HONEST: 40%', hrX + (hrW * 0.2), hrY + 10);
    ctx.fillText('ATTACKER: 60%', hrX + (hrW * 0.7), hrY + 10);
    ctx.restore();

    // 2. Track Banners & Mining Progress Bars
    // Top Honest Track Banner
    ctx.save();
    ctx.fillStyle = isReorg ? '#ff3366' : '#00ff88';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(isReorg ? '🛡️ HONEST CHAIN (SUPERSEDED & ORPHANED)' : '🛡️ HONEST CHAIN (40% HASHRATE)', -240, -172);

    // Honest Mining Progress Bar
    if (!isReorg && fiftyOneAttack.isRunning) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(80, -182, 120, 8, 4);
      ctx.fill();

      ctx.fillStyle = '#00ff88';
      ctx.beginPath();
      ctx.roundRect(80, -182, 120 * (fiftyOneAttack.honestProgress / 100), 8, 4);
      ctx.fill();
    }

    // Bottom Attacker Track Banner
    ctx.fillStyle = isReorg ? '#ffb703' : '#ff3366';
    ctx.fillText(isReorg ? '🏆 ATTACKER CHAIN (ADOPTED BY CONSENSUS)' : '☠️ ATTACKER SHADOW FORK (60% HASHRATE - MINING FASTER)', -240, 56);

    // Attacker Mining Progress Bar
    if (!isReorg && fiftyOneAttack.isRunning) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(140, 46, 120, 8, 4);
      ctx.fill();

      ctx.fillStyle = '#ff3366';
      ctx.beginPath();
      ctx.roundRect(140, 46, 120 * (fiftyOneAttack.attackerProgress / 100), 8, 4);
      ctx.fill();
    }
    ctx.restore();

    // 3. Common Genesis Block (Left Center)
    const gx = -380;
    const gy = -48;
    const gw = 120;
    const gh = 96;

    ctx.save();
    ctx.fillStyle = '#0a192f';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0, 240, 255, 0.4)';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.roundRect(gx, gy, gw, gh, 8);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('GENESIS #0', gx + 10, gy + 20);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText('COMMON ROOT', gx + 10, gy + 36);

    ctx.fillStyle = '#ffb703';
    ctx.fillText('Nonce: #1042', gx + 10, gy + 54);

    ctx.fillStyle = '#00ff88';
    ctx.fillText('✓ Both Chains Agree', gx + 10, gy + 74);
    ctx.restore();

    // 4. Connecting Forks / Links
    ctx.save();
    const gOutletX = gx + gw;
    const gOutletY = gy + gh / 2;

    // Fork Link 1: Genesis to Honest Block #1
    ctx.beginPath();
    ctx.moveTo(gOutletX, gOutletY);
    ctx.bezierCurveTo(gOutletX + 30, gOutletY, -240 - 30, -115, -240, -115);
    if (isReorg) {
      ctx.strokeStyle = '#ff3366';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 2.5;
    }
    ctx.stroke();

    // Fork Link 2: Genesis to Attacker Block #1
    ctx.beginPath();
    ctx.moveTo(gOutletX, gOutletY);
    ctx.bezierCurveTo(gOutletX + 30, gOutletY, -240 - 30, 115, -240, 115);
    if (isReorg) {
      ctx.strokeStyle = '#ffb703';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(255, 183, 3, 0.6)';
      ctx.shadowBlur = 10;
    } else {
      ctx.strokeStyle = '#ff3366';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 2;
    }
    ctx.stroke();
    ctx.restore();

    // 5. Render Honest Chain Blocks (Top Lane, y = -160)
    for (let i = 1; i < honestChain.length; i++) {
      const b = honestChain[i];
      const bx = -240 + (i - 1) * 155;
      const by = -160;
      const bw = 135;
      const bh = 90;

      // Link to next block if available
      if (i < honestChain.length - 1) {
        ctx.save();
        ctx.strokeStyle = isReorg ? '#ff3366' : '#00ff88';
        if (isReorg) ctx.setLineDash([4, 4]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx + bw, by + bh / 2);
        ctx.lineTo(bx + bw + 20, by + bh / 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.fillStyle = b.isOrphaned ? '#1a0b12' : '#0d1d1f';
      ctx.strokeStyle = b.isOrphaned ? '#ff3366' : '#00ff88';
      ctx.lineWidth = b.isOrphaned ? 1.5 : 2;
      if (b.isOrphaned) ctx.setLineDash([4, 4]);
      ctx.shadowColor = b.isOrphaned ? 'rgba(255, 51, 102, 0.3)' : 'rgba(0, 255, 136, 0.3)';
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 8);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = b.isOrphaned ? '#ff3366' : '#ffffff';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`BLOCK #${b.index}`, bx + 10, by + 18);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText(b.hash.substring(0, 14), bx + 10, by + 34);

      ctx.fillStyle = b.isOrphaned ? '#94a3b8' : '#ffb703';
      ctx.fillText(`Nonce: ${b.nonce}`, bx + 10, by + 50);

      // Status pill / Orphan warning
      if (b.isOrphaned) {
        ctx.fillStyle = 'rgba(255, 51, 102, 0.2)';
        ctx.strokeStyle = '#ff3366';
        ctx.beginPath();
        ctx.roundRect(bx + 8, by + 62, bw - 16, 18, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ff3366';
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ ORPHANED / REORG', bx + bw / 2, by + 74);
      } else {
        ctx.fillStyle = '#00ff88';
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillText('✓ Honest Canonical', bx + 10, by + 72);
      }
      ctx.restore();
    }

    // 6. Render Attacker Chain Blocks (Bottom Lane, y = 70)
    for (let i = 1; i < attackerChain.length; i++) {
      const b = attackerChain[i];
      const bx = -240 + (i - 1) * 155;
      const by = 70;
      const bw = 135;
      const bh = 90;

      // Link to next block if available
      if (i < attackerChain.length - 1) {
        ctx.save();
        ctx.strokeStyle = isReorg ? '#ffb703' : '#ff3366';
        if (!isReorg) ctx.setLineDash([4, 4]);
        ctx.lineWidth = isReorg ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(bx + bw, by + bh / 2);
        ctx.lineTo(bx + bw + 20, by + bh / 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.fillStyle = isReorg ? '#1a1608' : '#1d0b13';
      ctx.strokeStyle = isReorg ? '#ffb703' : '#ff3366';
      ctx.lineWidth = isReorg ? 2.5 : 1.5;
      ctx.shadowColor = isReorg ? 'rgba(255, 183, 3, 0.6)' : 'rgba(255, 51, 102, 0.4)';
      ctx.shadowBlur = isReorg ? 14 : 8;

      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 8);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = isReorg ? '#ffb703' : '#ffffff';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`SHADOW #${b.index}`, bx + 10, by + 18);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText(b.hash.substring(0, 14), bx + 10, by + 34);

      ctx.fillStyle = '#ffb703';
      ctx.fillText(`Nonce: ${b.nonce}`, bx + 10, by + 50);

      // Reorg verdict
      if (isReorg) {
        ctx.fillStyle = 'rgba(255, 183, 3, 0.2)';
        ctx.strokeStyle = '#ffb703';
        ctx.beginPath();
        ctx.roundRect(bx + 8, by + 62, bw - 16, 18, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffb703';
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('🏆 NEW CANONICAL ROOT', bx + bw / 2, by + 74);
      } else {
        ctx.fillStyle = '#ff3366';
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillText('☠️ Private Shadow Block', bx + 10, by + 72);
      }
      ctx.restore();
    }

    // 7. Chain Reorganization Warning Ribbon (Center)
    if (isReorg) {
      const bannerY = -24;
      const bannerH = 44;
      const bannerW = 680;
      const bannerX = -bannerW / 2;

      ctx.save();
      ctx.fillStyle = 'rgba(255, 51, 102, 0.95)';
      ctx.strokeStyle = '#ffb703';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(255, 51, 102, 0.8)';
      ctx.shadowBlur = 20;

      ctx.beginPath();
      ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 8);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`🚨 51% CHAIN REORGANIZATION! Attacker (${attackerChain.length} blocks) > Honest (${honestChain.length} blocks) 🚨`, 0, bannerY + 18);

      ctx.fillStyle = '#fef08a';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.fillText('Nakamoto Consensus adopted the longer chain! Honest branch orphaned & previous transactions reverted.', 0, bannerY + 34);
      ctx.restore();
    }
  }

  drawDoubleSpendScene(ctx) {
    const sim = doubleSpendSim;
    const step = sim.step; // 'ready' | 'mempool' | 'rejected'

    // 1. Scene Header
    ctx.save();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('DOUBLE-SPEND ATTACK SIMULATOR — NONCE REPLAY COLLISION DEFENSE', 0, -220);

    ctx.fillStyle = '#ffb703';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillText('INITIAL BALANCE: 10.00 QUEST • SENDER ADDRESS NONCE: #0', 0, -204);
    ctx.restore();

    // 2. Connecting Data Conduits
    ctx.save();
    // Conduit: Wallet (-140, 0) to Mempool (-90, 0)
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(-140, 0);
    ctx.lineTo(-90, 0);
    ctx.stroke();

    // Conduit: Mempool (90, -45) to Merchant A (140, -60)
    ctx.strokeStyle = (step === 'mempool' || step === 'rejected') ? '#00ff88' : 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash((step === 'mempool' || step === 'rejected') ? [] : [4, 4]);
    ctx.beginPath();
    ctx.moveTo(90, -45);
    ctx.lineTo(140, -60);
    ctx.stroke();

    // Conduit: Mempool (90, 45) to Merchant B (140, 60)
    if (step === 'rejected') {
      ctx.strokeStyle = '#ff3366';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([4, 4]);
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
    }
    ctx.beginPath();
    ctx.moveTo(90, 45);
    ctx.lineTo(140, 60);
    ctx.stroke();
    ctx.restore();

    // 3. Player Wallet Card (Left)
    const wx = -340;
    const wy = -100;
    const ww = 200;
    const wh = 200;

    ctx.save();
    ctx.fillStyle = '#0a1628';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0, 240, 255, 0.3)';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.roundRect(wx, wy, ww, wh, 10);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    // Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('💼 PLAYER WALLET', wx + 12, wy + 22);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText('CONFIRMED BALANCE', wx + 12, wy + 48);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    const displayBalance = step === 'ready' ? '10.00' : '0.00';
    ctx.fillText(displayBalance, wx + 12, wy + 74);
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText('QUEST', wx + 85, wy + 74);

    // Nonce info
    ctx.fillStyle = '#ffb703';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('Sequence Nonce: #0', wx + 12, wy + 102);

    // Address
    ctx.fillStyle = '#64748b';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText('ACCOUNT ADDRESS:', wx + 12, wy + 122);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(sim.address.substring(0, 12) + '...' + sim.address.substring(34), wx + 12, wy + 136);

    // State Badge
    const pillY = wy + 158;
    ctx.fillStyle = step === 'ready' ? 'rgba(0, 255, 136, 0.15)' : (step === 'mempool' ? 'rgba(255, 183, 3, 0.15)' : 'rgba(255, 51, 102, 0.2)');
    ctx.strokeStyle = step === 'ready' ? '#00ff88' : (step === 'mempool' ? '#ffb703' : '#ff3366');
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(wx + 10, pillY, ww - 20, 24, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = step === 'ready' ? '#00ff88' : (step === 'mempool' ? '#ffb703' : '#ff3366');
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    const badgeText = step === 'ready' ? '10 QUEST READY' : (step === 'mempool' ? 'TX1 EARMARKED IN MEMPOOL' : 'DOUBLE-SPEND CAUGHT');
    ctx.fillText(badgeText, wx + ww / 2, pillY + 16);
    ctx.restore();

    // 4. Central Network Mempool Buffer Card
    const mx = -90;
    const my = -100;
    const mw = 180;
    const mh = 200;

    ctx.save();
    ctx.fillStyle = '#0d1322';
    ctx.strokeStyle = step === 'rejected' ? '#ff3366' : '#9d4edd';
    ctx.lineWidth = 2;
    ctx.shadowColor = step === 'rejected' ? 'rgba(255, 51, 102, 0.5)' : 'rgba(157, 78, 221, 0.4)';
    ctx.shadowBlur = step === 'rejected' ? 16 : 10;

    ctx.beginPath();
    ctx.roundRect(mx, my, mw, mh, 10);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('📥 NETWORK MEMPOOL', mx + mw / 2, my + 22);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText('Pending Nonce Registry', mx + mw / 2, my + 38);

    // If Tx1 is present
    if (step === 'mempool' || step === 'rejected') {
      ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(mx + 10, my + 50, mw - 20, 36, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('TX1: 10 QUEST ➔ Merch A', mx + 16, my + 66);
      ctx.fillStyle = '#ffb703';
      ctx.fillText('Registered Nonce: #0', mx + 16, my + 78);
    }

    // If Tx2 is attempted / rejected
    if (step === 'rejected') {
      // Flashing collision banner inside mempool
      ctx.fillStyle = 'rgba(255, 51, 102, 0.25)';
      ctx.strokeStyle = '#ff3366';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(mx + 10, my + 94, mw - 20, 46, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ff3366';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ NONCE COLLISION! ⚡', mx + mw / 2, my + 110);
      ctx.fillStyle = '#ffffff';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillText('TX2 uses Duplicate Nonce #0', mx + mw / 2, my + 124);
      ctx.fillText('TX1 already holds Nonce #0', mx + mw / 2, my + 134);

      // Rejection verdict stamp
      ctx.fillStyle = '#ff3366';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillText('✕ NONCE ALREADY USED', mx + mw / 2, my + 168);
    } else if (step === 'mempool') {
      ctx.fillStyle = '#64748b';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Listening for blocks...', mx + mw / 2, my + 120);
      ctx.fillText('Nonce #0 locked', mx + mw / 2, my + 136);
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Mempool Empty', mx + mw / 2, my + 90);
      ctx.fillText('Awaiting Player Tx1', mx + mw / 2, my + 108);
    }
    ctx.restore();

    // 5. Merchant Cards (Right)
    const merchants = [
      {
        name: 'Merchant A (Bob)',
        tag: 'Armory & Node Shields',
        icon: '🛡️',
        y: -105,
        color: '#00ff88',
        isTargetA: true
      },
      {
        name: 'Merchant B (Alice)',
        tag: 'Potion & Fuel Lab',
        icon: '🧪',
        y: 15,
        color: '#ff3366',
        isTargetA: false
      }
    ];

    merchants.forEach((m) => {
      ctx.save();
      const rx = 140;
      const ry = m.y;
      const rw = 200;
      const rh = 80;

      ctx.fillStyle = '#0c1524';
      ctx.strokeStyle = m.isTargetA ? (step === 'mempool' || step === 'rejected' ? '#00ff88' : '#334155') : (step === 'rejected' ? '#ff3366' : '#334155');
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${m.icon} ${m.name}`, rx + 12, ry + 22);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px -apple-system, sans-serif';
      ctx.fillText(m.tag, rx + 12, ry + 38);

      if (m.isTargetA) {
        if (step === 'mempool' || step === 'rejected') {
          ctx.fillStyle = '#00ff88';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.fillText('✓ Tx1 in Mempool (+10 QUEST)', rx + 12, ry + 60);
        } else {
          ctx.fillStyle = '#64748b';
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillText('Awaiting Payment...', rx + 12, ry + 60);
        }
      } else {
        if (step === 'rejected') {
          ctx.fillStyle = '#ff3366';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.fillText('✕ Tx2 Blocked (0 QUEST)', rx + 12, ry + 60);
        } else {
          ctx.fillStyle = '#64748b';
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillText('Awaiting Payment...', rx + 12, ry + 60);
        }
      }
      ctx.restore();
    });

    // 6. Bottom Banner Ribbon if Rejected
    if (step === 'rejected') {
      const bannerY = 120;
      const bannerH = 40;
      const bannerW = 680;
      const bannerX = -bannerW / 2;

      ctx.save();
      ctx.fillStyle = 'rgba(255, 51, 102, 0.95)';
      ctx.strokeStyle = '#ffb703';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(255, 51, 102, 0.8)';
      ctx.shadowBlur = 18;

      ctx.beginPath();
      ctx.roundRect(bannerX, bannerY, bannerW, bannerH, 8);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🚨 DOUBLE-SPEND REJECTED BY NETWORK: NONCE ALREADY USED 🚨', 0, bannerY + 16);

      ctx.fillStyle = '#fef08a';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.fillText('Each transaction from an address must have a unique, sequential nonce. Replay & double-spends are mathematically blocked.', 0, bannerY + 30);
      ctx.restore();
    }
  }

  drawSmartContractScene(ctx) {
    const contract = smartContractEngine.activeContract;

    // 1. Scene Header
    ctx.save();
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SMART CONTRACT RUNTIME — DECENTRALIZED VIRTUAL MACHINE (EVM)', 0, -220);

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillText('AUTONOMOUS EXECUTION • IMMUTABLE STATE STORAGE • DETERMINISTIC BYTECODE', 0, -204);
    ctx.restore();

    // 2. Data Conduits connecting Wallet to Contract
    ctx.save();
    ctx.strokeStyle = 'rgba(157, 78, 221, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(-140, 0);
    ctx.bezierCurveTo(-40, -40, -10, 0, 60, 0);
    ctx.stroke();

    // Animated data pulse
    const t = (Date.now() * 0.001) % 1;
    const px = -140 + (60 - (-140)) * t;
    const py = Math.sin(t * Math.PI) * -20;
    ctx.fillStyle = '#9d4edd';
    ctx.shadowColor = '#9d4edd';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Active Call Packet Animation
    if (this.contractCallPacket) {
      this.contractCallPacket.progress += 0.025;
      const prog = Math.min(1, this.contractCallPacket.progress);
      const cx = this.contractCallPacket.startX + (this.contractCallPacket.targetX - this.contractCallPacket.startX) * prog;
      const cy = this.contractCallPacket.startY + (this.contractCallPacket.targetY - this.contractCallPacket.startY) * prog;

      ctx.save();
      ctx.fillStyle = '#1c132b';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.roundRect(cx - 50, cy - 16, 100, 32, 6);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`CALL: ${this.contractCallPacket.fnName}()`, cx, cy - 3);

      ctx.fillStyle = '#00ff88';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillText('[SIGNED 🖋️]', cx, cy + 8);

      if (Math.random() < 0.35) {
        this.particleSystem.emitBurst(cx, cy, '#00f0ff', 2);
      }
      ctx.restore();

      if (prog >= 1) {
        this.particleSystem.emitBurst(this.contractCallPacket.targetX, this.contractCallPacket.targetY, '#00ff88', 30);
        this.contractCallPacket = null;
      }
    }

    // 4. Caller Wallet Card (Left)
    const wx = -340;
    const wy = -110;
    const ww = 200;
    const wh = 220;

    ctx.save();
    ctx.fillStyle = '#0a1628';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0, 240, 255, 0.35)';
    ctx.shadowBlur = 12;

    ctx.beginPath();
    ctx.roundRect(wx, wy, ww, wh, 10);
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;
    // Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('💼 CALLER WALLET', wx + 12, wy + 24);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText('CONFIRMED BALANCE', wx + 12, wy + 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.fillText(playerWallet.balance.toFixed(2), wx + 12, wy + 76);
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText('QUEST', wx + 12 + ctx.measureText(`${playerWallet.balance.toFixed(2)} `).width, wy + 76);

    ctx.fillStyle = '#ffb703';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(`Sequence Nonce: #${playerWallet.nonce}`, wx + 12, wy + 104);

    ctx.fillStyle = '#64748b';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText('CALLER ADDRESS:', wx + 12, wy + 126);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(playerWallet.address.substring(0, 12) + '...' + playerWallet.address.substring(34), wx + 12, wy + 140);

    ctx.fillStyle = '#64748b';
    ctx.fillText('SECURITY STATUS:', wx + 12, wy + 162);
    ctx.fillStyle = '#00ff88';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText('✓ Private Key Ready (ECDSA)', wx + 12, wy + 176);

    // Output Port
    ctx.fillStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(wx + ww, wy + wh / 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 5. Smart Contract Node (Right)
    const cx = 60;
    const cy = -130;
    const cw = 290;
    const ch = 260;

    ctx.save();
    if (contract) {
      const themeColor = contract.type === 'escrow' ? '#ffb703' : (contract.type === 'voting' ? '#00f0ff' : '#9d4edd');
      const icon = contract.type === 'escrow' ? '⚖️' : (contract.type === 'voting' ? '🗳️' : '🪙');

      ctx.fillStyle = '#0c1524';
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 2;
      ctx.shadowColor = themeColor;
      ctx.shadowBlur = 14;

      ctx.beginPath();
      ctx.roundRect(cx, cy, cw, ch, 10);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      // Header
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${icon} ${contract.name}`, cx + 12, cy + 22);

      // Contract Address Pill
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(cx + 12, cy + 32, cw - 24, 20, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText(`Addr: ${contract.address.substring(0, 16)}...`, cx + 18, cy + 46);
      ctx.fillStyle = themeColor;
      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText('[CODE HASH]', cx + cw - 18, cy + 46);

      // Storage State Inspector Box
      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748b';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText('LIVE STORAGE STATE (ON-CHAIN):', cx + 12, cy + 68);

      const boxY = cy + 74;
      const boxH = 144;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(cx + 12, boxY, cw - 24, boxH, 6);
      ctx.fill();
      ctx.stroke();

      // Render state variables
      let lineY = boxY + 18;
      const stateEntries = Object.entries(contract.state).slice(0, 6);
      stateEntries.forEach(([k, v]) => {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`${k}:`, cx + 20, lineY);

        let valStr = String(v);
        if (typeof v === 'object' && v !== null) valStr = JSON.stringify(v);
        if (valStr.length > 20) valStr = valStr.substring(0, 18) + '...';

        ctx.fillStyle = (v === true || valStr.includes('PASSED') || valStr.includes('Completed')) ? '#00ff88' : (v === false ? '#ff3366' : '#fff');
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(valStr, cx + cw - 20, lineY);
        ctx.textAlign = 'left';
        lineY += 20;
      });

      // Footer
      ctx.fillStyle = themeColor;
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('✓ Self-Executing Code • Immutable EVM Logic', cx + cw / 2, cy + ch - 12);

      // Input Port
      ctx.fillStyle = themeColor;
      ctx.shadowColor = themeColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(cx, cy + ch / 2, 5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Empty state when no contract deployed
      ctx.fillStyle = '#0a111e';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);

      ctx.beginPath();
      ctx.roundRect(cx, cy, cw, ch, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚙️ NO CONTRACT DEPLOYED', cx + cw / 2, cy + ch / 2 - 14);

      ctx.font = '10px -apple-system, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Select Escrow, Voting, or Token in sidebar', cx + cw / 2, cy + ch / 2 + 8);
      ctx.fillText('and click Deploy Contract to instantiate!', cx + cw / 2, cy + ch / 2 + 24);
    }
    ctx.restore();
  }

  drawPoSValidatorScene(ctx) {
    ctx.save();
    const time = performance.now() / 1000;
    const validators = consensusPoS.validators;
    const numVals = validators.length;
    const radius = 250;
    const hubRadius = 70;

    // Center Hub (Beacon Engine)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 240, 255, 0.4)';
    ctx.shadowBlur = 20;

    // Hub gradient background
    const hubGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, hubRadius);
    hubGrad.addColorStop(0, '#101c38');
    hubGrad.addColorStop(1, '#070c18');
    ctx.fillStyle = hubGrad;
    ctx.beginPath();
    ctx.arc(0, 0, hubRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2/3 Supermajority Target Arc (66.7%)
    ctx.shadowBlur = 0;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.arc(0, 0, hubRadius + 6, 0, Math.PI * 2);
    ctx.stroke();

    // 66.7% Target Marker
    const targetAngle = -Math.PI / 2 + (Math.PI * 2 * (2 / 3));
    ctx.strokeStyle = 'rgba(255, 183, 3, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, hubRadius + 6, -Math.PI / 2, targetAngle);
    ctx.stroke();

    // Current Attestation Arc
    const totalActive = consensusPoS.getTotalActiveStake();
    const attestedStake = consensusPoS.attestingStake;
    const ratio = totalActive > 0 ? Math.min(1, attestedStake / totalActive) : 0;
    const attestationAngle = -Math.PI / 2 + (Math.PI * 2 * ratio);
    ctx.strokeStyle = consensusPoS.supermajorityReached ? '#00ff88' : '#00f0ff';
    ctx.lineWidth = 4;
    ctx.shadowColor = consensusPoS.supermajorityReached ? '#00ff88' : '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, hubRadius + 6, -Math.PI / 2, attestationAngle);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Hub inner texts
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BEACON HUB', 0, -32);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText(`SLOT #${consensusPoS.currentSlot}`, 0, -16);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText(`EPOCH #${consensusPoS.currentEpoch}`, 0, -2);

    ctx.fillStyle = '#ffb703';
    ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
    ctx.fillText(consensusPoS.lastRngSeed.substring(0, 10) + '...', 0, 12);

    // Finalization status pill in center
    const statusText = consensusPoS.isFinalized 
      ? 'FINALIZED 🔒' 
      : (consensusPoS.lastSlashing?.slot === consensusPoS.currentSlot ? 'SLASHED ⚔️' : 'ATTESTING ⏳');
    const statusColor = consensusPoS.isFinalized 
      ? '#00ff88' 
      : (consensusPoS.lastSlashing?.slot === consensusPoS.currentSlot ? '#ff3366' : '#ffb703');

    ctx.fillStyle = statusColor;
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillText(statusText, 0, 28);

    ctx.fillStyle = '#64748b';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillText(`${(ratio * 100).toFixed(0)}% / 67% Votes`, 0, 42);

    ctx.restore();

    // Calculate validator positions
    const valPositions = validators.map((val, idx) => {
      const angle = (idx / numVals) * (Math.PI * 2) - Math.PI / 2;
      return {
        val,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        angle
      };
    });

    // Draw Connecting Mesh Lines
    valPositions.forEach(p => {
      ctx.save();
      const isProposer = consensusPoS.activeProposer?.id === p.val.id;
      const isSlashed = p.val.status === 'slashed';
      ctx.strokeStyle = isSlashed 
        ? 'rgba(255, 51, 102, 0.4)' 
        : (isProposer ? 'rgba(255, 183, 3, 0.5)' : 'rgba(0, 240, 255, 0.12)');
      ctx.lineWidth = (isProposer || isSlashed) ? 2 : 1;
      if (isProposer) {
        ctx.shadowColor = '#ffb703';
        ctx.shadowBlur = 8;
      } else if (isSlashed) {
        ctx.shadowColor = '#ff3366';
        ctx.shadowBlur = 8;
      }
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.restore();
    });

    // Draw Validator Cards
    const cardW = 128;
    const cardH = 94;
    const maxStake = Math.max(64, ...validators.map(v => v.stake));

    valPositions.forEach(p => {
      const { val, x, y } = p;
      const isProposer = consensusPoS.activeProposer?.id === val.id;
      const isSlashed = val.status === 'slashed';
      const isUnbonding = val.status === 'unbonding';
      const isPlayer = val.isPlayer;

      const cx = x - cardW / 2;
      const cy = y - cardH / 2;

      ctx.save();

      let borderColor = 'rgba(0, 240, 255, 0.25)';
      let glowColor = 'transparent';
      let bgColor = 'rgba(10, 16, 30, 0.9)';

      if (isSlashed) {
        borderColor = '#ff3366';
        glowColor = 'rgba(255, 51, 102, 0.6)';
        bgColor = 'rgba(32, 8, 14, 0.95)';
      } else if (isProposer) {
        borderColor = '#ffb703';
        glowColor = 'rgba(255, 183, 3, 0.7)';
        bgColor = 'rgba(25, 20, 8, 0.95)';
      } else if (isUnbonding) {
        borderColor = '#ff9e00';
        glowColor = 'rgba(255, 158, 0, 0.4)';
        bgColor = 'rgba(25, 18, 5, 0.95)';
      } else if (isPlayer) {
        borderColor = '#00ff88';
        glowColor = 'rgba(0, 255, 136, 0.4)';
      } else if (val.delegations?.some(d => (d.delegatorAddress === playerWallet?.address || d.isPlayer) && d.amount > 0)) {
        borderColor = '#00f0ff';
        glowColor = 'rgba(0, 240, 255, 0.35)';
      }

      ctx.shadowColor = glowColor;
      ctx.shadowBlur = isProposer ? 16 : (isSlashed ? 14 : 6);

      ctx.fillStyle = bgColor;
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = isProposer ? 2 : (isSlashed ? 2 : 1.5);
      ctx.beginPath();
      ctx.roundRect(cx, cy, cardW, cardH, 8);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Proposer Crown Badge
      if (isProposer && !isSlashed) {
        ctx.fillStyle = '#ffb703';
        ctx.strokeStyle = '#ffb703';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(cx + (cardW - 68) / 2, cy - 8, 68, 14, 3);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('👑 PROPOSER', cx + cardW / 2, cy - 1);
      }

      // Avatar & Name Row
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(val.avatar, cx + 7, cy + 8);

      ctx.fillStyle = isSlashed ? '#ff3366' : (isPlayer ? '#00ff88' : '#fff');
      ctx.font = 'bold 9.5px -apple-system, sans-serif';
      let displayName = val.name;
      if (displayName.length > 13) displayName = displayName.substring(0, 12) + '…';
      ctx.fillText(displayName, cx + 24, cy + 9);

      if (isPlayer) {
        ctx.fillStyle = isSlashed ? '#ff3366' : '#00ff88';
        ctx.font = 'bold 7.5px "JetBrains Mono", monospace';
        ctx.fillText('(YOU)', cx + cardW - 28, cy + 9);
      }

      // Stake & Probability Row
      const prob = totalActive > 0 && val.status === 'active' ? ((val.stake / totalActive) * 100).toFixed(1) : '0.0';
      ctx.fillStyle = '#94a3b8';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillText('STAKE:', cx + 8, cy + 28);

      ctx.fillStyle = isSlashed ? '#ff3366' : '#ffb703';
      ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${val.stake.toFixed(1)} Q (${prob}%)`, cx + cardW - 8, cy + 28);
      ctx.textAlign = 'left';

      // Stake Visual Progress Bar
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.roundRect(cx + 8, cy + 40, cardW - 16, 4, 2);
      ctx.fill();

      const stakeFill = maxStake > 0 ? Math.max(2, (val.stake / maxStake) * (cardW - 16)) : 2;
      const barGrad = ctx.createLinearGradient(cx + 8, 0, cx + 8 + stakeFill, 0);
      barGrad.addColorStop(0, isSlashed ? '#ff3366' : '#00f0ff');
      barGrad.addColorStop(1, isSlashed ? '#990022' : '#ffb703');
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(cx + 8, cy + 40, stakeFill, 4, 2);
      ctx.fill();

      // Uptime & Status Pill
      ctx.fillStyle = '#64748b';
      ctx.font = '7.5px "JetBrains Mono", monospace';
      ctx.fillText(`UP: ${val.uptime.toFixed(1)}%`, cx + 8, cy + 50);

      // Status Pill
      let pillBg = 'rgba(0, 255, 136, 0.15)';
      let pillBorder = '#00ff88';
      let pillText = 'ACTIVE';
      let pillColor = '#00ff88';

      if (isSlashed) {
        pillBg = 'rgba(255, 51, 102, 0.25)';
        pillBorder = '#ff3366';
        pillText = 'SLASHED';
        pillColor = '#ff3366';
      } else if (isUnbonding) {
        pillBg = 'rgba(255, 158, 0, 0.2)';
        pillBorder = '#ff9e00';
        pillText = `UNBOND (${val.unbondingSlotsRemaining}d)`;
        pillColor = '#ff9e00';
      } else if (val.status === 'inactive') {
        pillBg = 'rgba(255, 255, 255, 0.08)';
        pillBorder = '#64748b';
        pillText = 'INACTIVE';
        pillColor = '#94a3b8';
      }

      const pillW = isUnbonding ? 58 : 46;
      ctx.fillStyle = pillBg;
      ctx.strokeStyle = pillBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(cx + cardW - pillW - 8, cy + 48, pillW, 12, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = pillColor;
      ctx.font = 'bold 7px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pillText, cx + cardW - pillW / 2 - 8, cy + 54);
      ctx.textAlign = 'left';

      // Attestation Vote Result Footer
      let voteText = 'Waiting Vote...';
      let voteColor = '#64748b';
      if (val.lastVote === 'pass') {
        voteText = '✓ Attested';
        voteColor = '#00ff88';
      } else if (val.lastVote === 'fail') {
        voteText = '✗ Rejected';
        voteColor = '#ff3366';
      }

      ctx.fillStyle = isSlashed ? '#ff3366' : voteColor;
      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.fillText(isSlashed ? '🔥 EJECTED' : voteText, cx + 8, cy + 68);

      // Accumulated Rewards
      ctx.fillStyle = isSlashed ? '#ff3366' : '#a5b4fc';
      ctx.font = '7.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`+${val.accumulatedRewards.toFixed(1)} Q`, cx + cardW - 8, cy + 68);
      ctx.textAlign = 'left';

      // Delegated Stake & Player Delegation Info
      if (val.delegatedStake > 0) {
        ctx.fillStyle = '#00f0ff';
        ctx.font = '7px "JetBrains Mono", monospace';
        ctx.fillText(`Del: +${val.delegatedStake.toFixed(1)} Q`, cx + 8, cy + 80);
      }
      const pDel = val.delegations?.find(d => (d.delegatorAddress === playerWallet?.address || d.isPlayer) && d.amount > 0);
      if (pDel) {
        ctx.fillStyle = '#00ff88';
        ctx.font = 'bold 7px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`🤝 YOU: ${pDel.amount.toFixed(1)} stQ`, cx + cardW - 8, cy + 80);
        ctx.textAlign = 'left';
      }

      // ==========================================
      // DRAMATIC SLASHING VISUALS & ANIMATIONS
      // ==========================================
      if (isSlashed) {
        // 1. Diagonal Glowing Crimson Laser Slash Cut
        ctx.save();
        ctx.strokeStyle = '#ff3366';
        ctx.shadowColor = '#ff0033';
        ctx.shadowBlur = 14;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy - 8);
        ctx.lineTo(cx + cardW + 8, cy + cardH + 8);
        ctx.stroke();
        ctx.restore();

        // 2. Animated Rising Flame Embers (Burning Stake)
        for (let i = 0; i < 6; i++) {
          const emberPhase = ((time * 2.8 + i * 0.35) % 1);
          const emberX = cx + 12 + ((i * 21) % (cardW - 24));
          const emberY = cy + cardH - (emberPhase * (cardH + 26));
          const emberAlpha = (1 - emberPhase) * 0.9;
          const emberRadius = 1.5 + (i % 3);
          ctx.save();
          ctx.fillStyle = i % 2 === 0 ? `rgba(255, 51, 102, ${emberAlpha})` : `rgba(255, 183, 3, ${emberAlpha})`;
          ctx.shadowColor = '#ff3366';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(emberX, emberY, emberRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // 3. Floating Slash Damage Banner when activeSlashingAnimation matches
        if (this.activeSlashingAnimation && this.activeSlashingAnimation.validatorId === val.id) {
          const elapsed = performance.now() - this.activeSlashingAnimation.startTime;
          if (elapsed < this.activeSlashingAnimation.durationMs) {
            const p = elapsed / this.activeSlashingAnimation.durationMs;
            const floatY = cy - 20 - (p * 45);
            const fadeAlpha = Math.max(0, 1 - p * 0.85);

            ctx.save();
            ctx.globalAlpha = fadeAlpha;
            ctx.shadowColor = '#ff0033';
            ctx.shadowBlur = 16;
            ctx.fillStyle = '#ff3366';
            ctx.font = 'bold 12px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`🔥 -${this.activeSlashingAnimation.stakeBurned.toFixed(1)} Q BURNED!`, cx + cardW / 2, floatY);

            ctx.fillStyle = '#ffb703';
            ctx.font = 'bold 9px "JetBrains Mono", monospace';
            ctx.fillText(`${this.activeSlashingAnimation.offenseIcon} ${this.activeSlashingAnimation.offenseLabel}`, cx + cardW / 2, floatY + 14);
            ctx.restore();
          }
        }
      }

      ctx.restore();
    });

    ctx.restore();
  }

  drawPosAttackScene(ctx) {
    ctx.save();
    const time = performance.now() / 1000;

    if (posAttackSim.activeScenario === 'nothing_at_stake') {
      this.drawNothingAtStakeScene(ctx, time);
    } else {
      this.drawLongRangeScene(ctx, time);
    }

    ctx.restore();
  }

  drawNothingAtStakeScene(ctx, time) {
    const sim = posAttackSim.nothingAtStake;
    const isSlashed = sim.validator.status === 'slashed';
    const votesA = sim.validator.votes.branchA;
    const votesB = sim.validator.votes.branchB;

    // Header Title
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🌱 POS ATTACK VECTOR: NOTHING-AT-STAKE', 0, -210);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.fillText('Zero Marginal Cost of Signing vs. Physical Thermodynamic Scarcity', 0, -192);

    // 1. Common Parent Block #3
    const commonX = -240;
    const commonY = 0;
    this.drawSceneBlockCard(ctx, commonX, commonY, 110, 65, 'Block #3', 'Parent Hash', '#00ff88', '✓ Canonical');

    // 2. Upper Fork Branch A (Cyan)
    const forkA1_X = -70;
    const forkA1_Y = -90;
    const forkA2_X = 90;
    const forkA2_Y = -90;
    this.drawConnectingLine(ctx, commonX + 55, commonY, forkA1_X - 55, forkA1_Y, '#00f0ff', 2);
    this.drawConnectingLine(ctx, forkA1_X + 55, forkA1_Y, forkA2_X - 55, forkA2_Y, '#00f0ff', 2);

    this.drawSceneBlockCard(ctx, forkA1_X, forkA1_Y, 110, 65, 'Block #4A', 'Alpha Proposer', '#00f0ff', 'Cyan Branch');
    this.drawSceneBlockCard(ctx, forkA2_X, forkA2_Y, 110, 65, 'Block #5A', 'Solar Proposer', '#00f0ff', 'Head A');

    // 3. Lower Fork Branch B (Amber)
    const forkB1_X = -70;
    const forkB1_Y = 90;
    const forkB2_X = 90;
    const forkB2_Y = 90;
    this.drawConnectingLine(ctx, commonX + 55, commonY, forkB1_X - 55, forkB1_Y, '#ffb703', 2);
    this.drawConnectingLine(ctx, forkB1_X + 55, forkB1_Y, forkB2_X - 55, forkB2_Y, '#ffb703', 2);

    this.drawSceneBlockCard(ctx, forkB1_X, forkB1_Y, 110, 65, 'Block #4B', 'Beta Proposer', '#ffb703', 'Amber Branch');
    this.drawSceneBlockCard(ctx, forkB2_X, forkB2_Y, 110, 65, 'Block #5B', 'Nexus Proposer', '#ffb703', 'Head B');

    // 4. Naive Validator Node Card (Right)
    const valX = 250;
    const valY = 0;
    const valW = 140;
    const valH = 110;

    ctx.save();
    ctx.shadowColor = isSlashed ? '#ff3366' : (votesA && votesB ? '#ffb703' : '#00f0ff');
    ctx.shadowBlur = isSlashed ? 16 : 10;
    ctx.fillStyle = isSlashed ? 'rgba(35, 10, 16, 0.95)' : 'rgba(10, 18, 32, 0.95)';
    ctx.strokeStyle = isSlashed ? '#ff3366' : (votesA && votesB ? '#ffb703' : 'rgba(0, 240, 255, 0.3)');
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(valX - valW / 2, valY - valH / 2, valW, valH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Header
    ctx.fillStyle = isSlashed ? '#ff3366' : '#fff';
    ctx.font = 'bold 11px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${sim.validator.avatar} ${sim.validator.name}`, valX, valY - 34);

    // Stake & Status
    ctx.fillStyle = isSlashed ? '#ff3366' : '#ffb703';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText(`${sim.validator.stake.toFixed(1)} QUEST`, valX, valY - 14);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '8.5px "JetBrains Mono", monospace';
    ctx.fillText(isSlashed ? 'STATUS: SLASHED 🔥' : 'MARGINAL COST: $0.00', valX, valY + 4);

    // Voting Indicator Badges
    const badgeAY = valY + 22;
    ctx.fillStyle = votesA ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = votesA ? '#00f0ff' : '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(valX - valW / 2 + 10, badgeAY, 56, 18, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = votesA ? '#00f0ff' : '#64748b';
    ctx.font = 'bold 8px "JetBrains Mono", monospace';
    ctx.fillText(votesA ? '✓ Voted 4A' : '○ Skip 4A', valX - valW / 2 + 38, badgeAY + 12);

    ctx.fillStyle = votesB ? 'rgba(255, 183, 3, 0.2)' : 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = votesB ? '#ffb703' : '#475569';
    ctx.beginPath();
    ctx.roundRect(valX + 4, badgeAY, 56, 18, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = votesB ? '#ffb703' : '#64748b';
    ctx.fillText(votesB ? '✓ Voted 4B' : '○ Skip 4B', valX + 32, badgeAY + 12);

    // Slashing laser & flames if slashed
    if (isSlashed) {
      ctx.strokeStyle = '#ff3366';
      ctx.shadowColor = '#ff0033';
      ctx.shadowBlur = 14;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(valX - valW / 2 - 6, valY - valH / 2 - 6);
      ctx.lineTo(valX + valW / 2 + 6, valY + valH / 2 + 6);
      ctx.stroke();

      for (let i = 0; i < 5; i++) {
        const emberPhase = ((time * 3 + i * 0.4) % 1);
        const emberX = valX - valW / 2 + 15 + ((i * 24) % (valW - 30));
        const emberY = valY + valH / 2 - (emberPhase * (valH + 20));
        ctx.fillStyle = i % 2 === 0 ? `rgba(255, 51, 102, ${1 - emberPhase})` : `rgba(255, 183, 3, ${1 - emberPhase})`;
        ctx.beginPath();
        ctx.arc(emberX, emberY, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#ff3366';
      ctx.font = 'bold 11px "JetBrains Mono", monospace';
      ctx.fillText('🔥 100% STAKE BURNED!', valX, valY - 60);
      ctx.fillStyle = '#ffb703';
      ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
      ctx.fillText('Equivocation Detected', valX, valY - 48);
    }
    ctx.restore();

    // 5. Dual Vote Beams
    if (votesA && !isSlashed) {
      this.drawVoteBeam(ctx, valX - valW / 2, valY - 15, forkA1_X + 55, forkA1_Y + 15, '#00f0ff', time);
    }
    if (votesB && !isSlashed) {
      this.drawVoteBeam(ctx, valX - valW / 2, valY + 15, forkB1_X + 55, forkB1_Y - 15, '#ffb703', time);
    }

    // 6. PoW vs PoS Comparative Panel (Bottom)
    this.drawComparativePanel(ctx, -260, 160, 520, 72, sim.isSlashingEnabled);
  }

  drawLongRangeScene(ctx, time) {
    const sim = posAttackSim.longRange;
    const isDefended = sim.step === 'defended';
    const isCompromised = sim.historicalValidators.keyCompromised;

    // Header Title
    ctx.fillStyle = '#ffb703';
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⏳ POS ATTACK VECTOR: LONG-RANGE ATTACK', 0, -210);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px -apple-system, sans-serif';
    ctx.fillText('Compromised Expired Validator Keys vs. Weak Subjectivity Checkpoints', 0, -192);

    // 1. Top Canonical Honest Chain
    const honestY = -75;
    const b0_X = -260;
    const b100_X = -100;
    const b200_X = 60;
    const b350_X = 220;

    this.drawConnectingLine(ctx, b0_X + 50, honestY, b100_X - 50, honestY, '#00ff88', 2);
    this.drawConnectingLine(ctx, b100_X + 50, honestY, b200_X - 50, honestY, '#00ff88', 2);
    this.drawConnectingLine(ctx, b200_X + 50, honestY, b350_X - 50, honestY, '#00ff88', 2);

    this.drawSceneBlockCard(ctx, b0_X, honestY, 100, 56, 'Block #0', 'Genesis', '#00ff88', 'Origin');
    this.drawSceneBlockCard(ctx, b100_X, honestY, 100, 56, 'Block #100', 'Past Checkpoint', '#00ff88', 'Alice/Bob (65%)');
    this.drawSceneBlockCard(ctx, b200_X, honestY, 100, 56, 'Block #200 🔒', 'Finalized Checkpoint', '#00f0ff', 'Unbonded (0%)');
    this.drawSceneBlockCard(ctx, b350_X, honestY, 100, 56, 'Block #350', 'Canonical Head', '#00ff88', 'Active Chain');

    // 2. Bottom Forged Attacker Chain
    const ghostY = 75;
    const forkGhost_X = 60;
    const headGhost_X = 220;

    if (isCompromised) {
      // Fork line branching from Block #100 down to Ghost Checkpoint
      this.drawConnectingLine(ctx, b100_X + 50, honestY, forkGhost_X - 50, ghostY, '#ff3366', 2, [4, 4]);
      this.drawConnectingLine(ctx, forkGhost_X + 50, ghostY, headGhost_X - 50, ghostY, '#ff3366', 2, [4, 4]);

      this.drawSceneBlockCard(ctx, forkGhost_X, ghostY, 100, 56, 'Block #200*', 'Forged History', '#ff3366', 'Old Keys Sign');
      this.drawSceneBlockCard(ctx, headGhost_X, ghostY, 100, 56, 'Block #355*', 'Ghost Head', '#ff3366', 'Longer (355>350)');
    } else {
      // Dormant placeholder
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(-100, ghostY - 28, 380, 56);
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('🔒 Attacker chain dormant. Click "Acquire Old Keys & Forge" to simulate.', 90, ghostY + 4);
      ctx.restore();
    }

    // 3. Weak Subjectivity Shield Barrier at X = 135
    const barrierX = 135;
    ctx.save();
    const isEnforced = sim.isWeakSubjectivityEnabled;
    ctx.strokeStyle = isEnforced ? '#00f0ff' : 'rgba(255, 51, 102, 0.4)';
    ctx.shadowColor = isEnforced ? '#00f0ff' : '#ff3366';
    ctx.shadowBlur = isEnforced ? 18 : 6;
    ctx.lineWidth = 3;
    ctx.setLineDash(isEnforced ? [] : [5, 5]);

    ctx.beginPath();
    ctx.moveTo(barrierX, -130);
    ctx.lineTo(barrierX, 130);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Shield Label
    ctx.fillStyle = isEnforced ? '#00f0ff' : '#ff3366';
    ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(isEnforced ? '🛡️ WEAK SUBJECTIVITY BARRIER' : '⚠️ NO CHECKPOINT BARRIER', barrierX, -138);
    ctx.fillText('Finality Horizon (150 Blocks)', barrierX, 145);

    if (isDefended && isCompromised) {
      // Rejection impact shockwave on attacker chain
      ctx.strokeStyle = '#ff3366';
      ctx.lineWidth = 2.5;
      const rippleRadius = (time * 40) % 25;
      ctx.beginPath();
      ctx.arc(barrierX, ghostY, rippleRadius + 5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ff3366';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillText('⛔ REJECTED: Fork prior to checkpoint #200!', 135, ghostY - 34);
    }
    ctx.restore();

    // 4. Educational Footer Summary Card
    this.drawLongRangeSummaryCard(ctx, -260, 165, 520, 65, sim.isWeakSubjectivityEnabled, isCompromised);
  }

  drawSceneBlockCard(ctx, x, y, w, h, title, subtitle, color, pillText) {
    ctx.save();
    ctx.fillStyle = 'rgba(10, 16, 30, 0.92)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 6);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(title, x, y - 10);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px -apple-system, sans-serif';
    ctx.fillText(subtitle, x, y + 4);

    ctx.fillStyle = color;
    ctx.font = 'bold 7.5px "JetBrains Mono", monospace';
    ctx.fillText(pillText, x, y + 18);
    ctx.restore();
  }

  drawConnectingLine(ctx, x1, y1, x2, y2, color, width, dash = []) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (dash.length > 0) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  drawVoteBeam(ctx, x1, y1, x2, y2, color, time) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = -(time * 20);
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  drawComparativePanel(ctx, x, y, w, h, isSlashingEnabled) {
    ctx.save();
    ctx.fillStyle = 'rgba(7, 12, 22, 0.95)';
    ctx.strokeStyle = isSlashingEnabled ? 'rgba(0, 255, 136, 0.4)' : 'rgba(255, 183, 3, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();

    // PoW vs PoS comparison text
    ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'var(--accent-amber)';
    ctx.fillText('⛏️ PROOF OF WORK (Thermodynamic Invariant):', x + 12, y + 18);
    ctx.font = '8.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('100 TH/s hashrate must split 50/50 across A & B. Cannot mine 100% on both forks.', x + 12, y + 32);

    ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
    ctx.fillStyle = isSlashingEnabled ? '#00ff88' : '#ff3366';
    ctx.fillText(isSlashingEnabled ? '🛡️ PROOF OF STAKE WITH SLASHING:' : '🌱 NAIVE PROOF OF STAKE (NOTHING-AT-STAKE):', x + 12, y + 50);
    ctx.font = '8.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(
      isSlashingEnabled
        ? 'Equivocation Slashing detects dual votes at slot #4 → 100% stake burned! Rational move: vote 1 fork.'
        : 'Marginal cost of signing is $0.00. Rational validator votes on both forks to guarantee reward!',
      x + 12,
      y + 63
    );
    ctx.restore();
  }

  drawLongRangeSummaryCard(ctx, x, y, w, h, isWeakSubjectivityEnabled, isCompromised) {
    ctx.save();
    ctx.fillStyle = 'rgba(7, 12, 22, 0.95)';
    ctx.strokeStyle = isWeakSubjectivityEnabled ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 51, 102, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = isWeakSubjectivityEnabled ? '#00f0ff' : '#ff3366';
    ctx.fillText(
      isWeakSubjectivityEnabled
        ? '🛡️ WEAK SUBJECTIVITY DEFENSE (Social Consensus & Checkpoints):'
        : '⚠️ NAIVE LONGEST-CHAIN RULE (Vulnerable to Long-Range Attacks):',
      x + 12,
      y + 20
    );

    ctx.font = '8.5px "JetBrains Mono", monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(
      isWeakSubjectivityEnabled
        ? 'Nodes maintain finality checkpoints. Any fork branching prior to Checkpoint #200 is rejected immediately.'
        : 'Without checkpoints, an attacker with old 0-stake keys can forge 500+ blocks in seconds and fool new nodes!',
      x + 12,
      y + 36
    );

    ctx.fillStyle = '#94a3b8';
    ctx.fillText(
      'Alice & Bob had 65% stake at Block #100, but unbonded at #200. Old keys carry zero present-day financial risk.',
      x + 12,
      y + 50
    );
    ctx.restore();
  }

  /**
   * Draw Side-by-Side Split-Screen Comparison Scene (PoW Left vs PoS Right)
   */
  drawSplitScreenComparison(ctx) {
    ctx.save();
    const time = performance.now() / 1000;
    const comp = consensusComparison;
    const pow = comp.powState;
    const pos = comp.posState;

    // Dimensions
    const paneW = 460;
    const paneH = 480;
    const topY = -240;

    // ==========================================
    // 1. LEFT PANE: PROOF OF WORK (BITCOIN)
    // ==========================================
    const leftX = -480;
    ctx.save();
    ctx.fillStyle = pow.attackActive ? 'rgba(35, 12, 10, 0.95)' : 'rgba(25, 20, 10, 0.95)';
    ctx.strokeStyle = pow.attackActive ? '#ff3366' : '#f59e0b';
    ctx.lineWidth = 2;
    ctx.shadowColor = pow.attackActive ? 'rgba(255, 51, 102, 0.4)' : 'rgba(245, 158, 11, 0.25)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(leftX, topY, paneW, paneH, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // PoW Header
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('⛏️ PROOF OF WORK CHAIN', leftX + 16, topY + 26);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText(`Hashrate: ${pow.hashrate} • Energy: ${pow.energyRateMW}`, leftX + 16, topY + 42);

    // PoW Blocks (Horizontal Chain)
    const blockW = 85;
    const blockH = 65;
    const startBx = leftX + 20;
    const startBy = topY + 65;

    const visiblePowBlocks = pow.confirmedChain.slice(0, 4).reverse();
    visiblePowBlocks.forEach((blk, i) => {
      const bx = startBx + i * (blockW + 20);
      const isOrphan = blk.reorganized;

      ctx.save();
      ctx.fillStyle = isOrphan ? 'rgba(255, 51, 102, 0.25)' : 'rgba(245, 158, 11, 0.15)';
      ctx.strokeStyle = isOrphan ? '#ff3366' : '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bx, startBy, blockW, blockH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isOrphan ? '#ff3366' : '#f59e0b';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillText(`Block #${blk.index || i}`, bx + 6, startBy + 15);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '7.5px "JetBrains Mono", monospace';
      ctx.fillText(`${blk.txCount || 1} Txs`, bx + 6, startBy + 30);
      ctx.fillText(blk.miner.length > 11 ? blk.miner.substring(0, 10) + '…' : blk.miner, bx + 6, startBy + 44);

      if (isOrphan) {
        ctx.fillStyle = '#ff3366';
        ctx.font = 'bold 8px "JetBrains Mono", monospace';
        ctx.fillText('ORPHANED', bx + 6, startBy + 58);
      }
      ctx.restore();

      // Chain arrow
      if (i < visiblePowBlocks.length - 1) {
        ctx.fillStyle = '#f59e0b';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText('➔', bx + blockW + 4, startBy + 36);
      }
    });

    // PoW Thermodynamic Energy Meter
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText('THERMODYNAMIC ENERGY CONSUMED:', leftX + 20, topY + 160);

    const maxJoules = 1000000;
    const energyPct = Math.min(100, Math.max(8, (pow.joulesBurned / maxJoules) * 100));
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(leftX + 20, topY + 172, paneW - 40, 10, 4);
    ctx.fill();

    const energyGrad = ctx.createLinearGradient(leftX + 20, 0, leftX + paneW - 20, 0);
    energyGrad.addColorStop(0, '#f59e0b');
    energyGrad.addColorStop(1, '#ef4444');
    ctx.fillStyle = energyGrad;
    ctx.beginPath();
    ctx.roundRect(leftX + 20, topY + 172, ((paneW - 40) * energyPct) / 100, 10, 4);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillText(`${pow.joulesBurned.toLocaleString()} Joules (${pow.wattHours} Wh) burned searching nonces`, leftX + 20, topY + 198);

    // PoW Mining Pool Concentration
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
    ctx.fillText('MINER HASHRATE CONCENTRATION:', leftX + 20, topY + 225);

    pow.miners.forEach((m, idx) => {
      const my = topY + 242 + idx * 24;
      ctx.fillStyle = m.color;
      ctx.fillRect(leftX + 20, my, 8, 8);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '8.5px "JetBrains Mono", monospace';
      ctx.fillText(m.name, leftX + 34, my + 8);

      ctx.textAlign = 'right';
      ctx.fillText(`${m.share}% Hashrate`, leftX + paneW - 20, my + 8);
      ctx.textAlign = 'left';
    });

    // PoW Attack Status Overlay Banner
    if (pow.attackActive) {
      ctx.fillStyle = 'rgba(255, 51, 102, 0.2)';
      ctx.strokeStyle = '#ff3366';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(leftX + 20, topY + paneH - 95, paneW - 40, 80, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ff3366';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillText('🚨 51% HASHRATE REORGANIZATION IN PROGRESS', leftX + 28, topY + paneH - 75);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillText('Attacker with 500 EH/s is mining an alternate branch secretly.', leftX + 28, topY + paneH - 58);
      ctx.fillText('Honest blocks orphaned; double-spends confirmed!', leftX + 28, topY + paneH - 44);
      ctx.fillText('Cost: $1.45M/hour electricity burned by attacker.', leftX + 28, topY + paneH - 30);
    }
    ctx.restore();

    // ==========================================
    // 2. CENTER NEON DIVIDER & "VS" BADGE
    // ==========================================
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, topY);
    ctx.lineTo(0, topY + paneH);
    ctx.stroke();

    // VS Circle Badge
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, topY + paneH / 2, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VS', 0, topY + paneH / 2);
    ctx.restore();

    // ==========================================
    // 3. RIGHT PANE: PROOF OF STAKE (ETHEREUM)
    // ==========================================
    const rightX = 20;
    ctx.save();
    ctx.fillStyle = pos.attackActive ? 'rgba(32, 10, 18, 0.95)' : 'rgba(10, 22, 38, 0.95)';
    ctx.strokeStyle = pos.attackActive ? '#ff3366' : '#00f0ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = pos.attackActive ? 'rgba(255, 51, 102, 0.4)' : 'rgba(0, 240, 255, 0.25)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(rightX, topY, paneW, paneH, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // PoS Header
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('🌱 PROOF OF STAKE CHAIN', rightX + 16, topY + 26);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText(`Active Stake: ${pos.totalStake} QUEST ($28.3B) • Slot #${pos.currentSlot}`, rightX + 16, topY + 42);

    // PoS Finalized Slots (Horizontal Chain)
    const startSx = rightX + 20;
    const startSy = topY + 65;

    const visiblePosSlots = pos.finalizedChain.slice(0, 4).reverse();
    visiblePosSlots.forEach((slot, i) => {
      const sx = startSx + i * (blockW + 20);

      ctx.save();
      ctx.fillStyle = 'rgba(0, 240, 255, 0.15)';
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(sx, startSy, blockW, blockH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#00f0ff';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillText(`Slot #${slot.slot || i + 1}`, sx + 6, startSy + 15);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '7.5px "JetBrains Mono", monospace';
      ctx.fillText(`${slot.txCount || 1} Txs`, sx + 6, startSy + 30);
      ctx.fillText(slot.proposer.length > 11 ? slot.proposer.substring(0, 10) + '…' : slot.proposer, sx + 6, startSy + 44);

      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 7.5px "JetBrains Mono", monospace';
      ctx.fillText('FINALIZED 🔒', sx + 6, startSy + 58);
      ctx.restore();

      // Chain arrow
      if (i < visiblePosSlots.length - 1) {
        ctx.fillStyle = '#00f0ff';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText('➔', sx + blockW + 4, startSy + 36);
      }
    });

    // PoS Energy Consumption Meter (99.98% drop)
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText('GREEN ELECTRICAL CONSUMPTION (99.98% DROP):', rightX + 20, topY + 160);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(rightX + 20, topY + 172, paneW - 40, 10, 4);
    ctx.fill();

    ctx.fillStyle = '#00ff88';
    ctx.beginPath();
    ctx.roundRect(rightX + 20, topY + 172, 6, 10, 4);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillText('2.6 kW global grid draw (~15W per node, 0.0026 MW)', rightX + 20, topY + 198);

    // PoS Validator Stake Distribution
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
    ctx.fillText('VALIDATOR STAKE DISTRIBUTION:', rightX + 20, topY + 225);

    pos.validators.slice(0, 5).forEach((v, idx) => {
      const vy = topY + 242 + idx * 24;
      ctx.fillStyle = v.color;
      ctx.fillRect(rightX + 20, vy, 8, 8);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '8.5px "JetBrains Mono", monospace';
      ctx.fillText(v.name, rightX + 34, vy + 8);

      ctx.textAlign = 'right';
      ctx.fillText(`${v.stake.toFixed(0)} QUEST (${v.share}%)`, rightX + paneW - 20, vy + 8);
      ctx.textAlign = 'left';
    });

    // PoS Slashing & Attack Defense Banner
    if (pos.attackActive) {
      ctx.fillStyle = 'rgba(0, 255, 136, 0.15)';
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(rightX + 20, topY + paneH - 95, paneW - 40, 80, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#00ff88';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillText('🛡️ 51% ATTACK NEUTRALIZED VIA CASPER FFG SLASHING', rightX + 28, topY + paneH - 75);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillText('Cartel signed conflicting checkpoints (Equivocation).', rightX + 28, topY + paneH - 58);
      ctx.fillText('100% of attacker stake ($15.0 Billion) burned instantly!', rightX + 28, topY + paneH - 44);
      ctx.fillText('Zero chain reorgs; honest network continued unbroken.', rightX + 28, topY + paneH - 30);
    }
    ctx.restore();

    ctx.restore();
  }

  /**
   * Draw PoS Consensus Attack Thresholds Scene (34%, 51%, 66%)
   */
  /**
   * Draw Live Finality Comparison Scene (PoW Probabilistic vs PoS Deterministic)
   */
  drawFinalityComparisonScene(ctx) {
    ctx.save();
    const sim = finalitySimulator;
    const pow = sim.powState;
    const pos = sim.posState;
    const posStatus = sim.getPosStatus();
    const time = performance.now() / 1000;

    const paneW = 460;
    const paneH = 480;
    const topY = -240;

    // ==========================================
    // 1. LEFT PANE: PROOF OF WORK PROBABILISTIC
    // ==========================================
    const leftX = -480;
    ctx.save();
    ctx.fillStyle = 'rgba(24, 18, 10, 0.95)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(245, 158, 11, 0.25)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(leftX, topY, paneW, paneH, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // PoW Header
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 12.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('⛏️ PROOF OF WORK — PROBABILISTIC FINALITY', leftX + 16, topY + 26);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText('Nakamoto Consensus • Deeper blocks are safer, never 0.00% risk', leftX + 16, topY + 42);

    // Target Block & Confirmations Chain
    const blockW = 78;
    const blockH = 56;
    const startBx = leftX + 16;
    const startBy = topY + 60;

    // Target Block #100
    ctx.fillStyle = 'rgba(245, 158, 11, 0.2)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(startBx, startBy, blockW, blockH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillText('Block #100', startBx + 6, startBy + 16);
    ctx.fillStyle = '#fff';
    ctx.font = '7.5px "JetBrains Mono", monospace';
    ctx.fillText('Target Tx', startBx + 6, startBy + 30);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText('100 BTC', startBx + 6, startBy + 44);

    // Render Trailing Confirmed Blocks
    const visibleConfs = Math.min(4, pow.confirmations);
    for (let c = 1; c <= visibleConfs; c++) {
      const bx = startBx + c * (blockW + 12);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx, startBy, blockW, blockH, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
      ctx.fillText(`Block #${100 + c}`, bx + 6, startBy + 16);
      ctx.fillStyle = '#10b981';
      ctx.font = '7.5px "JetBrains Mono", monospace';
      ctx.fillText(`Conf +${c}`, bx + 6, startBy + 30);
      ctx.fillStyle = '#64748b';
      ctx.fillText('Valid Nonce', bx + 6, startBy + 44);

      // Arrow
      ctx.fillStyle = '#f59e0b';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText('➔', bx - 9, startBy + 32);
    }

    if (pow.confirmations > 4) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillText(`+ ${pow.confirmations - 4} more...`, leftX + paneW - 85, startBy + 32);
    }

    // Confirmations Counter Badge
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(leftX + 16, topY + 130, paneW - 32, 34, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9.5px "JetBrains Mono", monospace';
    ctx.fillText('CURRENT CONFIRMATIONS:', leftX + 26, topY + 152);

    ctx.fillStyle = pow.confirmations >= 6 ? '#10b981' : (pow.confirmations >= 2 ? '#f59e0b' : '#ff3366');
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.fillText(`${pow.confirmations} BLOCKS (${pow.confirmations >= 6 ? 'SATOSHI STANDARD' : (pow.confirmations >= 2 ? 'STANDARD COMMERCE' : 'HIGH REORG RISK')})`, leftX + 185, topY + 152);

    // Exponential Reorg Probability Gauge
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText('EXPONENTIAL REORGANIZATION PROBABILITY: P ≈ (q/p)^k', leftX + 16, topY + 188);

    const prob = sim.getPowReorgProbability();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.beginPath();
    ctx.roundRect(leftX + 16, topY + 198, paneW - 32, 14, 4);
    ctx.fill();

    const probGrad = ctx.createLinearGradient(leftX + 16, 0, leftX + paneW - 16, 0);
    probGrad.addColorStop(0, '#10b981');
    probGrad.addColorStop(0.5, '#f59e0b');
    probGrad.addColorStop(1, '#ff3366');

    ctx.fillStyle = probGrad;
    ctx.beginPath();
    ctx.roundRect(leftX + 16, topY + 198, Math.max(6, (paneW - 32) * (prob / 100)), 14, 4);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText(`${prob}% Reorg Risk (Attacker q=30%, Honest p=70%)`, leftX + 24, topY + 230);

    // Animated Fork Section
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
    ctx.fillText('FORK SIMULATION & NAKAMOTO RESOLUTION:', leftX + 16, topY + 258);

    if (pow.forkState.active) {
      const isOrphaned = pow.forkState.status === 'orphaned';
      ctx.fillStyle = isOrphaned ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 51, 102, 0.2)';
      ctx.strokeStyle = isOrphaned ? '#10b981' : '#ff3366';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(leftX + 16, topY + 270, paneW - 32, 95, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isOrphaned ? '#10b981' : '#ff3366';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillText(isOrphaned ? '🛡️ ATTACKER FORK PRUNED & ORPHANED' : '🚨 HONEST CHAIN REORGANIZED', leftX + 26, topY + 292);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '8.5px "JetBrains Mono", monospace';
      ctx.fillText(pow.forkState.message, leftX + 26, topY + 312);
      ctx.fillText(isOrphaned ? 'Longest-Chain Rule: Nodes discarded the shorter 3-block attacker fork.' : 'Attacker secretly surpassed honest depth, reversing Block #100!', leftX + 26, topY + 332);
      ctx.fillText(isOrphaned ? 'Target transaction in Block #100 remains safe.' : 'Double-spend confirmed on the reorganized alternate fork!', leftX + 26, topY + 350);
    } else {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.roundRect(leftX + 16, topY + 270, paneW - 32, 95, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText('Click [Animate PoW Fork] to test Nakamoto longest-chain resolution.', leftX + 26, topY + 320);
    }

    // Bottom Takeaway
    ctx.fillStyle = 'rgba(245, 158, 11, 0.1)';
    ctx.beginPath();
    ctx.roundRect(leftX + 16, topY + paneH - 65, paneW - 32, 50, 4);
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
    ctx.fillText('POW AXIOM:', leftX + 24, topY + paneH - 48);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillText('Probabilistic Finality: Probability of reorg decays exponentially ((q/p)^k),', leftX + 24, topY + paneH - 34);
    ctx.fillText('but can never reach true zero. Deep reorganizations remain physically possible.', leftX + 24, topY + paneH - 22);

    ctx.restore();

    // ==========================================
    // 2. CENTER NEON DIVIDER & "VS" BADGE
    // ==========================================
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, topY);
    ctx.lineTo(0, topY + paneH);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, topY + paneH / 2, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VS', 0, topY + paneH / 2);
    ctx.restore();

    // ==========================================
    // 3. RIGHT PANE: PROOF OF STAKE DETERMINISTIC
    // ==========================================
    const rightX = 20;
    ctx.save();
    ctx.fillStyle = 'rgba(10, 22, 38, 0.95)';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(0, 240, 255, 0.25)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(rightX, topY, paneW, paneH, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // PoS Header
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 12.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('🌱 PROOF OF STAKE — DETERMINISTIC FINALITY', rightX + 16, topY + 26);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText('Casper FFG Checkpoints • Irreversible without slashing 1/3 validators', rightX + 16, topY + 42);

    // Checkpoint Progression Timeline (Epoch 0 -> 1 -> 2)
    const cpW = 125;
    const cpH = 56;
    const cpY = topY + 60;

    // Epoch 0 (Proposed)
    ctx.fillStyle = pos.epochsElapsed >= 0 ? 'rgba(0, 240, 255, 0.1)' : 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = pos.epochsElapsed >= 0 ? '#38bdf8' : '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(rightX + 16, cpY, cpW, cpH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
    ctx.fillText('Epoch 0: Slot 100', rightX + 24, cpY + 16);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '7.5px "JetBrains Mono", monospace';
    ctx.fillText('Target Tx Proposed', rightX + 24, cpY + 30);
    ctx.fillText('Unfinalized', rightX + 24, cpY + 44);

    // Arrow 1
    ctx.fillStyle = '#00f0ff';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('➔', rightX + 16 + cpW + 4, cpY + 32);

    // Epoch 1 (Justified)
    ctx.fillStyle = pos.epochsElapsed >= 1 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = pos.epochsElapsed >= 1 ? '#f59e0b' : '#475569';
    ctx.beginPath();
    ctx.roundRect(rightX + 16 + cpW + 20, cpY, cpW, cpH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = pos.epochsElapsed >= 1 ? '#f59e0b' : '#64748b';
    ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
    ctx.fillText('Epoch 1 Checkpoint', rightX + 24 + cpW + 20, cpY + 16);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '7.5px "JetBrains Mono", monospace';
    ctx.fillText('>66.7% Attestations', rightX + 24 + cpW + 20, cpY + 30);
    ctx.fillText('JUSTIFIED (~6.4m)', rightX + 24 + cpW + 20, cpY + 44);

    // Arrow 2
    ctx.fillStyle = '#00f0ff';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('➔', rightX + 16 + (cpW * 2) + 24, cpY + 32);

    // Epoch 2 (Finalized 🔒)
    ctx.fillStyle = pos.epochsElapsed >= 2 ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255,255,255,0.04)';
    ctx.strokeStyle = pos.epochsElapsed >= 2 ? '#00ff88' : '#475569';
    ctx.lineWidth = pos.epochsElapsed >= 2 ? 1.5 : 1;
    ctx.beginPath();
    ctx.roundRect(rightX + 16 + (cpW * 2) + 40, cpY, cpW, cpH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = pos.epochsElapsed >= 2 ? '#00ff88' : '#64748b';
    ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
    ctx.fillText('Epoch 2 Checkpoint', rightX + 24 + (cpW * 2) + 40, cpY + 16);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '7.5px "JetBrains Mono", monospace';
    ctx.fillText('Child Justified', rightX + 24 + (cpW * 2) + 40, cpY + 30);
    ctx.fillStyle = pos.epochsElapsed >= 2 ? '#00ff88' : '#64748b';
    ctx.fillText('FINALIZED 🔒 (12.8m)', rightX + 24 + (cpW * 2) + 40, cpY + 44);

    // Finality Status Badge
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(rightX + 16, topY + 130, paneW - 32, 34, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9.5px "JetBrains Mono", monospace';
    ctx.fillText('CHECKPOINT FINALITY STATUS:', rightX + 26, topY + 152);

    ctx.fillStyle = posStatus.badgeColor;
    ctx.font = 'bold 12.5px "JetBrains Mono", monospace';
    ctx.fillText(posStatus.stage === 'FINALIZED' ? 'FINALIZED 🔒 (IRREVERSIBLE)' : posStatus.label, rightX + 205, topY + 152);

    // Economic Slashing Shield Box (1/3 of validators)
    ctx.fillStyle = 'rgba(0, 255, 136, 0.08)';
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(rightX + 16, topY + 180, paneW - 32, 55, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText('🛡️ ECONOMIC FINALITY SHIELD: >= 1/3 SLASHING BOUND', rightX + 26, topY + 200);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '8.5px "JetBrains Mono", monospace';
    ctx.fillText('Reverting a finalized block requires validators to sign two conflicting checkpoints.', rightX + 26, topY + 215);
    ctx.fillText(`Minimum penalty: 1/3 of all validators (${pos.slashingRequirementUsd} Billion / 10.6M ETH) BURNED!`, rightX + 26, topY + 228);

    // Animated Fork Section
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
    ctx.fillText('FORK SIMULATION & SLASHING RESOLUTION:', rightX + 16, topY + 258);

    if (pos.forkState.active) {
      const isSlashed = pos.forkState.status === 'slashed';
      ctx.fillStyle = isSlashed ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 183, 3, 0.15)';
      ctx.strokeStyle = isSlashed ? '#00ff88' : '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(rightX + 16, topY + 270, paneW - 32, 95, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isSlashed ? '#00ff88' : '#f59e0b';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillText(isSlashed ? '🛡️ CONFLICTING FORK REJECTED: 1/3 STAKE SLASHED' : '⚠️ UNFINALIZED FORK CHOICE TRIGGERED', rightX + 26, topY + 292);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '8.5px "JetBrains Mono", monospace';
      ctx.fillText(pos.forkState.message, rightX + 26, topY + 312);
      ctx.fillText(isSlashed ? 'Casper FFG detected equivocation (conflicting source-target pair).' : 'Block is not finalized yet; LMD-GHOST picked heavier branch.', rightX + 26, topY + 332);
      ctx.fillText(isSlashed ? `$32.0 Billion of attacker wealth burned! Finalized history cannot be altered.` : 'Finality not reached. Attestations required.', rightX + 26, topY + 350);
    } else {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.roundRect(rightX + 16, topY + 270, paneW - 32, 95, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText('Click [Animate PoS Fork] to test deterministic slashing defense.', rightX + 26, topY + 320);
    }

    // Bottom Takeaway
    ctx.fillStyle = 'rgba(0, 240, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(rightX + 16, topY + paneH - 65, paneW - 32, 50, 4);
    ctx.fill();

    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
    ctx.fillText('POS AXIOM:', rightX + 24, topY + paneH - 48);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillText('Deterministic Finality: After 2 epochs (~12.8m), checkpoint is finalized.', rightX + 24, topY + paneH - 34);
    ctx.fillText('Reverting requires signing two conflicting forks -> mathematically 1/3 stake burned.', rightX + 24, topY + paneH - 22);

    ctx.restore();

    ctx.restore();
  }

  drawPosThresholdAttackScene(ctx) {
    ctx.save();
    const sim = posThresholdAttack;
    const pct = sim.attackerStakePercent;
    const info = sim.getThresholdInfo();
    const econ = sim.getFinancialLoss();
    const time = performance.now() / 1000;

    // 1. Header Banner
    ctx.fillStyle = '#00f0ff';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚡ PROOF OF STAKE ATTACK THRESHOLDS & GAME THEORY', 0, -220);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '9.5px "JetBrains Mono", monospace';
    ctx.fillText('Interactive Threshold Simulator: 34% (Finality Halt) • 51% (Reorg) • 66% (Arbitrary Finalization)', 0, -202);

    // 2. Main Threshold Gauge Bar
    const gaugeX = -280;
    const gaugeY = -175;
    const gaugeW = 560;
    const gaugeH = 26;

    // Background container
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(gaugeX - 4, gaugeY - 4, gaugeW + 8, gaugeH + 8, 8);
    ctx.fill();
    ctx.stroke();

    // Segment 1: 0% to 33% (Honest Secure - Green)
    const w1 = gaugeW * 0.33;
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.roundRect(gaugeX, gaugeY, w1, gaugeH, [4, 0, 0, 4]);
    ctx.fill();

    // Segment 2: 34% to 50% (34% Halt - Amber)
    const w2 = gaugeW * 0.17;
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(gaugeX + w1, gaugeY, w2, gaugeH);

    // Segment 3: 51% to 65% (51% Reorg - Orange/Red)
    const w3 = gaugeW * 0.15;
    ctx.fillStyle = '#ff8800';
    ctx.fillRect(gaugeX + w1 + w2, gaugeY, w3, gaugeH);

    // Segment 4: 66% to 100% (66% Arbitrary - Crimson)
    const w4 = gaugeW * 0.35;
    ctx.fillStyle = '#ff3366';
    ctx.beginPath();
    ctx.roundRect(gaugeX + w1 + w2 + w3, gaugeY, w4, gaugeH, [0, 4, 4, 0]);
    ctx.fill();

    // Threshold labels on gauge
    ctx.fillStyle = '#000';
    ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('0-33% SECURE', gaugeX + (w1 / 2), gaugeY + 16);
    ctx.fillText('34% HALT', gaugeX + w1 + (w2 / 2), gaugeY + 16);
    ctx.fillText('51% REORG', gaugeX + w1 + w2 + (w3 / 2), gaugeY + 16);
    ctx.fillText('66% ARBITRARY FINALITY', gaugeX + w1 + w2 + w3 + (w4 / 2), gaugeY + 16);

    // Marker needle for current Attacker Stake %
    const needleX = gaugeX + (gaugeW * (pct / 100));
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(needleX, gaugeY - 6);
    ctx.lineTo(needleX, gaugeY + gaugeH + 6);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Needle indicator pill
    ctx.fillStyle = info.badgeColor;
    ctx.beginPath();
    ctx.roundRect(needleX - 35, gaugeY - 26, 70, 16, 4);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillText(`${pct}% STAKE`, needleX, gaugeY - 14);

    // 3. Validator Nodes Ring (Circular Layout)
    const ringCenterX = 0;
    const ringCenterY = 30;
    const ringRadius = 100;
    const totalNodes = 24;
    const attackerNodesCount = Math.round((pct / 100) * totalNodes);

    // Outer guide circle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(ringCenterX, ringCenterY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let i = 0; i < totalNodes; i++) {
      const angle = (i / totalNodes) * (Math.PI * 2) - Math.PI / 2;
      const nx = ringCenterX + Math.cos(angle) * ringRadius;
      const ny = ringCenterY + Math.sin(angle) * ringRadius;
      const isAttackerNode = i < attackerNodesCount;

      ctx.save();
      if (isAttackerNode) {
        ctx.fillStyle = '#ff3366';
        ctx.strokeStyle = '#fff';
        ctx.shadowColor = '#ff3366';
        ctx.shadowBlur = sim.isAttacking ? 12 : 4;
      } else {
        ctx.fillStyle = '#00f0ff';
        ctx.strokeStyle = '#38bdf8';
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 4;
      }

      ctx.beginPath();
      ctx.arc(nx, ny, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Center Badge in Node Ring
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.strokeStyle = info.badgeColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = info.badgeColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(ringCenterX, ringCenterY, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = info.badgeColor;
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(info.id === 'none' ? 'HONEST' : (info.id === 'liveness_34' ? '34% HALT' : (info.id === 'reorg_51' ? '51% REORG' : '66% ARB')), ringCenterX, ringCenterY - 6);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillText(`${pct}% of Stake`, ringCenterX, ringCenterY + 8);
    ctx.fillText(`${attackerNodesCount}/${totalNodes} Nodes`, ringCenterX, ringCenterY + 20);

    // 4. Attack Execution Feedback Alert (if attack triggered)
    if (sim.lastAttackResult) {
      ctx.save();
      ctx.fillStyle = info.id === 'none' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 51, 102, 0.2)';
      ctx.strokeStyle = info.id === 'none' ? '#10b981' : '#ff3366';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-240, 145, 480, 52, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = info.id === 'none' ? '#10b981' : '#ff3366';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(sim.lastAttackResult.summary.split(':')[0], 0, 163);

      ctx.fillStyle = '#fff';
      ctx.font = '8.5px "JetBrains Mono", monospace';
      const detailText = sim.lastAttackResult.summary.split(':')[1] || '';
      ctx.fillText(detailText.trim(), 0, 182);
      ctx.restore();
    }

    // 5. Bottom Economic Loss Indicator Strip
    const bottomY = 212;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(-280, bottomY, 560, 24, 4);
    ctx.fill();
    ctx.stroke();

    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Capital Required: ${econ.capitalCostBillions}B (${econ.coinsRequiredStr})`, -270, bottomY + 16);

    ctx.textAlign = 'right';
    ctx.fillStyle = econ.lossPercentage > 0 ? '#ff3366' : '#10b981';
    ctx.fillText(`Financial Loss if Slashed: -$${econ.financialLossBillions}B (${econ.lossPercentage}% Burned)`, 270, bottomY + 16);

    ctx.restore();
  }

  // ── Fork Simulator Canvas Scene ─────────────────────────────────────────────
  drawForkSimulatorScene(ctx) {
    ctx.save();
    const W = this.width, H = this.height;
    const st = forkSimulator.getState();

    // ── Background ────────────────────────────────────────────────────────────
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#09080300');
    bgGrad.addColorStop(1, '#0f0b04');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(-W / 2, -H / 2, W, H);

    const isSoft = st.forkMode === 'soft';
    const isHard = st.forkMode === 'hard';
    const preFork = st.forkState === 'pre';
    const ACCENT_A = isSoft ? '#00ff88' : '#60a5fa';
    const ACCENT_B = '#f59e0b';
    const TRUNK_COL = '#64748b';

    // ── Header ─────────────────────────────────────────────────────────────────
    ctx.textAlign = 'center';
    const headerLabel = preFork
      ? '⛓️ FORK SIMULATOR — Awaiting fork trigger...'
      : (isSoft ? '✅ SOFT FORK — Backward Compatible (No Network Split)' : '💥 HARD FORK — Permanent Chain Split (ETH / ETC)');
    const headerColor = preFork ? '#94a3b8' : (isSoft ? '#00ff88' : '#ff3366');
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.fillStyle = headerColor;
    ctx.fillText(headerLabel, 0, -H / 2 + 24);
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#475569';
    ctx.fillText('Level 5 — Consensus Security Lab', 0, -H / 2 + 40);

    // ── Chain Rendering Helper ─────────────────────────────────────────────────
    const drawBlock = (x, y, label, col, subtext = '') => {
      const bw = 80, bh = 34;
      // box
      ctx.fillStyle = col + '18';
      ctx.strokeStyle = col + '88';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, 4);
      ctx.fill(); ctx.stroke();
      // label
      ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
      ctx.fillStyle = col;
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y + (subtext ? -5 : 3));
      if (subtext) {
        ctx.font = '7px "JetBrains Mono", monospace';
        ctx.fillStyle = col + 'aa';
        ctx.fillText(subtext.slice(0, 14), x, y + 9);
      }
    };

    const drawArrow = (x1, y, x2, col) => {
      ctx.strokeStyle = col + '66';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(x1 + 42, y);
      ctx.lineTo(x2 - 42, y);
      ctx.stroke();
      ctx.setLineDash([]);
      // arrowhead
      ctx.fillStyle = col + '88';
      ctx.beginPath();
      ctx.moveTo(x2 - 40, y - 4);
      ctx.lineTo(x2 - 34, y);
      ctx.lineTo(x2 - 40, y + 4);
      ctx.fill();
    };

    // ── Trunk blocks ──────────────────────────────────────────────────────────
    const trunkY = -40;
    const trunkStartX = -W / 2 + 70;
    const stepX = 100;
    st.trunk.forEach((b, i) => {
      const bx = trunkStartX + i * stepX;
      drawBlock(bx, trunkY, b.label, TRUNK_COL, 'v1 rule');
      if (i < st.trunk.length - 1) drawArrow(bx, trunkY, bx + stepX, TRUNK_COL);
    });

    // Fork point indicator
    const forkX = trunkStartX + st.trunk.length * stepX - 40;
    if (st.forkA.length > 0 || !preFork) {
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#f59e0b';
      ctx.textAlign = 'center';
      ctx.fillText('▼ FORK', forkX, trunkY + 30);

      // Vertical fork line
      ctx.strokeStyle = '#f59e0b55';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(forkX, trunkY + 20);
      ctx.lineTo(forkX, isHard ? trunkY + 60 : trunkY + 50);
      ctx.stroke();
      ctx.setLineDash([]);

      if (isHard) {
        // Branch lines for hard fork
        ctx.strokeStyle = '#f59e0b44';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        ctx.moveTo(forkX, trunkY + 60);
        ctx.lineTo(forkX + 40, trunkY + 80);  // up branch
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(forkX, trunkY + 60);
        ctx.lineTo(forkX + 40, trunkY + 120); // down branch
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // ── Fork A chain (upgraded / canonical) ──────────────────────────────────
    if (st.forkA.length > 0) {
      const chainAY = isHard ? trunkY + 80 : trunkY + 60;
      const chainAStartX = forkX + 50;
      st.forkA.forEach((b, i) => {
        const bx = chainAStartX + i * stepX;
        drawBlock(bx, chainAY, b.label, ACCENT_A, b.chain || 'v2');
        if (i < st.forkA.length - 1) drawArrow(bx, chainAY, bx + stepX, ACCENT_A);
      });

      // Chain label
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillStyle = ACCENT_A;
      ctx.textAlign = 'left';
      ctx.fillText(isSoft ? '✅ Unified chain — all nodes follow' : '🔵 ETH chain (upgraded)', chainAStartX - 35, chainAY - 26);
    }

    // ── Fork B chain (legacy — hard fork only) ────────────────────────────────
    if (isHard && st.forkB.length > 0) {
      const chainBY = trunkY + 120;
      const chainBStartX = forkX + 50;
      st.forkB.forEach((b, i) => {
        const bx = chainBStartX + i * stepX;
        drawBlock(bx, chainBY, b.label, ACCENT_B, b.chain || 'v1');
        if (i < st.forkB.length - 1) drawArrow(bx, chainBY, bx + stepX, ACCENT_B);
      });
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillStyle = ACCENT_B;
      ctx.textAlign = 'left';
      ctx.fillText('🟠 ETC chain (legacy — permanently split)', chainBStartX - 35, chainBY - 26);
    }

    // ── Node panels ────────────────────────────────────────────────────────────
    const panelTop = (isHard ? trunkY + 180 : trunkY + 120);
    const panelW = 180, panelH = 72;
    const panelAX = -panelW - 20;
    const panelBX = 20;

    const drawNodePanel = (px, py, nodes, col, title) => {
      ctx.fillStyle = col + '12';
      ctx.strokeStyle = col + '44';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(px, py, panelW, panelH, 6);
      ctx.fill(); ctx.stroke();
      ctx.font = 'bold 8px "JetBrains Mono", monospace';
      ctx.fillStyle = col;
      ctx.textAlign = 'left';
      ctx.fillText(title, px + 8, py + 14);
      nodes.forEach((n, i) => {
        const nx = px + 8 + (i % 5) * 34;
        const ny = py + 28 + Math.floor(i / 5) * 22;
        const nc = n.accepts === 'reject' ? '#ff3366' : (n.accepts === 'accept' ? '#00ff88' : col);
        ctx.fillStyle = nc + '20';
        ctx.strokeStyle = nc + '66';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(nx, ny, 28, 16, 3);
        ctx.fill(); ctx.stroke();
        ctx.font = '7px "JetBrains Mono", monospace';
        ctx.fillStyle = nc;
        ctx.textAlign = 'center';
        ctx.fillText(n.label.replace('Node ', ''), nx + 14, ny + 10);
        const mark = n.accepts === 'reject' ? '✗' : (n.accepts === 'accept' ? '✓' : '');
        if (mark) ctx.fillText(mark, nx + 14, ny + 10 + 8);
      });
    };

    drawNodePanel(panelAX, panelTop, st.upgradedNodes, ACCENT_A, 'Upgraded Nodes (v2)');
    drawNodePanel(panelBX, panelTop, st.legacyNodes, ACCENT_B, 'Legacy Nodes (v1)');

    // ── Verdict strip ─────────────────────────────────────────────────────────
    if (st.verdict) {
      const vy = panelTop + panelH + 18;
      const splitCol = st.forkState === 'split' ? '#ff3366' : '#00ff88';
      ctx.fillStyle = splitCol + '14';
      ctx.strokeStyle = splitCol + '44';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-W / 2 + 30, vy, W - 60, 28, 4);
      ctx.fill(); ctx.stroke();
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillStyle = splitCol;
      ctx.textAlign = 'center';
      ctx.fillText(st.verdict.slice(0, 110), 0, vy + 11);
      if (st.verdict.length > 110) {
        ctx.font = '8.5px "JetBrains Mono", monospace';
        ctx.fillText(st.verdict.slice(110, 200), 0, vy + 22);
      }
    }

    ctx.restore();
  }
}
