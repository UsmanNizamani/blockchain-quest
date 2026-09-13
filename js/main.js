/**
 * Blockchain Quest - Main Application Bootstrap
 * Connects the 6-Level Progression, Canvas Renderer, Sidebar UI, and Educational Codex/Quizzes
 */
import { CanvasRenderer } from './engine/CanvasRenderer.js';
import { LevelManager } from './levels/LevelManager.js';
import { SidebarUI } from './ui/SidebarUI.js';
import { EducationUI } from './education/EducationUI.js';
import { Toast } from './ui/Toast.js';
import { gameState } from './core/GameState.js';
import { defaultBlockchain } from './blockchain/Blockchain.js';

document.addEventListener('DOMContentLoaded', () => {
  console.log('⚡ Initializing Blockchain Quest Engine...');

  const canvas = document.getElementById('game-canvas');
  if (!canvas) {
    console.error('Canvas element #game-canvas not found.');
    return;
  }

  // 1. Initialize Canvas Engine
  const renderer = new CanvasRenderer(canvas);
  renderer.start();

  // 2. Initialize Level Manager & UI Controllers
  const levelManager = new LevelManager();
  const sidebarUI = new SidebarUI(levelManager);
  const educationUI = new EducationUI(levelManager, sidebarUI);

  // Expose global quest runtime for browser console exploration and automated tests
  window.blockchainQuest = {
    gameState,
    levelManager,
    sidebarUI,
    educationUI,
    renderer,
    defaultBlockchain
  };

  // 3. Load Active Level from persistent state
  const currentLvl = gameState.currentLevel || 1;
  sidebarUI.loadChapter(currentLvl);

  // 4. Welcome Notification
  setTimeout(() => {
    Toast.show(
      "Welcome, Blockchain Explorer! 🌐",
      "Embark on a 6-level quest across Cryptography, Consensus, Wallets, P2P Gossip, Security, and DeFi!",
      "info",
      5000
    );
  }, 600);

  console.log('✅ Blockchain Quest initialized successfully. Active Level:', currentLvl);
});

