import { gameState } from '../core/GameState.js';
import { eventBus } from '../core/EventBus.js';
import { Toast } from '../ui/Toast.js';
import { LEVEL_METADATA } from '../education/EducationData.js';
import { Level1_Guardian } from './Level1_Guardian.js';
import { Level2_Miner } from './Level2_Miner.js';
import { Level3_Wallet } from './Level3_Wallet.js';
import { Level4_Node } from './Level4_Node.js';
import { Level5_Defender } from './Level5_Defender.js';
import { Level6_DeFi } from './Level6_DeFi.js';
import { Level7_Merkle } from './Level7_Merkle.js';

export class LevelManager {
  constructor() {
    this.levels = {
      1: Level1_Guardian,
      2: Level2_Miner,
      3: Level3_Wallet,
      4: Level4_Node,
      5: Level5_Defender,
      6: Level6_DeFi,
      7: Level7_Merkle
    };

    this.currentLevelId = gameState.currentLevel || 1;
    this.activeLevel = this.levels[this.currentLevelId] || this.levels[1];
    this.latestState = {};

    this.syncCompletedObjectives();

    eventBus.on('STATE_RESET', () => {
      for (const lvlId in this.levels) {
        if (this.levels[lvlId]?.objectives) {
          for (const obj of this.levels[lvlId].objectives) {
            obj.completed = false;
          }
        }
      }
      this.renderObjectives();
    });

    eventBus.on('BLOCK_CLICKED', ({ index, block }) => {
      console.log(`[Block Click] Clicked Block #${index} | previousHash: ${block?.previousHash}`);
      this.updateState({
        ...this.latestState,
        inspectedBlockIndex: index,
        inspectedBlock: block,
        inspectedPreviousHash: block?.previousHash
      });
    });

    eventBus.on('BLOCK_INSPECTED', ({ index, block }) => {
      this.updateState({
        ...this.latestState,
        inspectedBlockIndex: index,
        inspectedBlock: block,
        inspectedPreviousHash: block?.previousHash
      });
    });
  }

  // Synchronize completed status from persisted GameState activeObjectives
  syncCompletedObjectives() {
    if (!this.activeLevel || !this.activeLevel.objectives) return;
    for (const obj of this.activeLevel.objectives) {
      if (gameState.activeObjectives && (gameState.activeObjectives[obj.id] || (obj.aliasId && gameState.activeObjectives[obj.aliasId]))) {
        obj.completed = true;
      }
    }
  }

  // Backward compatibility alias for legacy code
  get chapters() {
    return this.levels;
  }
  get currentChapterId() {
    return this.currentLevelId;
  }
  set currentChapterId(val) {
    this.currentLevelId = val;
  }
  get activeMission() {
    return this.activeLevel;
  }
  set activeMission(val) {
    this.activeLevel = val;
  }

  loadLevel(levelId) {
    if (!this.levels[levelId]) return;
    this.currentLevelId = levelId;
    this.activeLevel = this.levels[levelId];
    gameState.setLevel(levelId);
    this.syncCompletedObjectives();
    this.renderObjectives();
  }

  // Backward compatibility
  loadChapter(chapterId) {
    this.loadLevel(chapterId);
  }

  updateState(state) {
    this.latestState = state;
    this.checkObjectives();
  }

  checkObjectives() {
    if (!this.activeLevel || !this.activeLevel.objectives) return;

    let newlyCompleted = 0;
    let allCompleted = true;

    for (const obj of this.activeLevel.objectives) {
      if (!obj.completed) {
        const passed = Boolean(obj.check(this.latestState));
        console.log(`[Objective Check] Objective "${obj.id}" condition check: passed = ${passed}`);
        if (passed) {
          obj.completed = true;
          if (!gameState.activeObjectives) gameState.activeObjectives = {};
          gameState.activeObjectives[obj.id] = true;
          if (obj.aliasId) {
            gameState.activeObjectives[obj.aliasId] = true;
          }
          gameState.save();
          newlyCompleted++;
          const kp = obj.xp || 50;
          gameState.addKP(kp);

          if (obj.aliasId === "inspect-genesis" || obj.id === "lvl1_obj2" || obj.id === "ch2_inspect_genesis") {
            console.log(`objective complete: inspect-genesis, +${kp} KP`);
          }
          console.log(`[Objective Reward] objective complete: ${obj.id}, +${kp} KP`);
          Toast.show("Objective Mastered! 🎯", `${obj.title} (+${kp} KP)`, 'success');
        }
      }

      if (!obj.completed) {
        allCompleted = false;
      }
    }

    if (newlyCompleted > 0) {
      this.renderObjectives();
    }

    if (allCompleted && !gameState.completedLevels.includes(this.currentLevelId)) {
      this.handleLevelCompletion();
    }
  }

  handleLevelCompletion() {
    const levelId = this.currentLevelId;
    const meta = LEVEL_METADATA[levelId] || {};
    const kpAward = meta.kpReward || 250;

    // Unlock corresponding Concept Codex topics
    if (meta.codexUnlockIds) {
      gameState.unlockCodex(meta.codexUnlockIds);
    }

    // Complete level and unlock next level in GameState
    gameState.completeLevel(levelId, kpAward);

    // Emit event for UI celebrations and summary modal
    eventBus.emit('SHOW_LEVEL_SUMMARY_MODAL', {
      levelId,
      meta,
      kpAward
    });

    Toast.show(
      "Level Mastered! 🏆",
      `You have completed ${this.activeLevel.title}! (+${kpAward} KP)`,
      'success',
      6000
    );
  }

  renderObjectives() {
    const container = document.getElementById('objectives-list');
    const badgeCount = document.getElementById('obj-pending-count');
    if (!container || !this.activeLevel) return;

    let pending = 0;
    container.innerHTML = '';

    for (const obj of this.activeLevel.objectives) {
      if (!obj.completed) pending++;

      const isPoSObjective = obj.id === 'lvl2_obj5';
      const actionButtonHtml = (isPoSObjective && !obj.completed) ? `
        <button class="obj-action-btn" data-action="goto-pos-lab">
          ▶ Switch to Proof of Stake
        </button>
      ` : '';

      const item = document.createElement('div');
      item.className = `objective-item ${obj.completed ? 'completed' : ''}`;
      item.innerHTML = `
        <div class="objective-check">${obj.completed ? '✓' : ''}</div>
        <div class="objective-info">
          <div class="objective-title">
            <span>${obj.title}</span>
            <span class="objective-xp">+${obj.xp} KP</span>
          </div>
          <div class="objective-desc">${obj.desc}</div>
          ${actionButtonHtml}
        </div>
      `;
      container.appendChild(item);
    }

    // Attach handler for goto-pos-lab button
    if (typeof container.querySelectorAll === 'function') {
      container.querySelectorAll('[data-action="goto-pos-lab"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();

          // 1. Activate the Lab Tool tab
          document.querySelector('[data-tab="tab-lab"]')?.click();

          // 2. Ensure Level 2 lab is initialized if needed
          const labContainer = document.getElementById('lab-widget-container');
          if (this.activeLevel?.initLab && labContainer && (!labContainer.children || labContainer.children.length === 0)) {
            this.activeLevel.initLab(labContainer, (state) => {
              this.updateState(state);
            });
          }

          // 3. Switch consensus mode to PoS using the setConsensusMode helper
          if (this.activeLevel?.setConsensusMode) {
            this.activeLevel.setConsensusMode('pos');
          } else {
            document.getElementById('btn-mode-pos')?.click();
          }

          // 4. Bring the PoS switcher into view
          const posBtn = document.getElementById('btn-mode-pos');
          posBtn?.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // 5. Pulse the PoS tab to draw attention
          posBtn?.classList.add('pulse-attention');
          setTimeout(() => posBtn?.classList.remove('pulse-attention'), 2000);
        });
      });
    }

    if (badgeCount) {
      badgeCount.textContent = pending;
      badgeCount.style.display = pending === 0 ? 'none' : 'inline-block';
    }
  }
}
