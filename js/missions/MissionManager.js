import { gameState } from '../core/GameState.js';
import { eventBus } from '../core/EventBus.js';
import { Toast } from '../ui/Toast.js';
import { Chapter1_Hashing } from './Chapter1_Hashing.js';
import { Chapter2_Blocks } from './Chapter2_Blocks.js';
import { Chapter3_Network } from './Chapter3_Network.js';
import { Chapter4_PoW } from './Chapter4_PoW.js';
import { Chapter6_Keys } from './Chapter6_Keys.js';
import { Chapter7_Contracts } from './Chapter7_Contracts.js';

export class MissionManager {
  constructor() {
    this.chapters = {
      1: Chapter1_Hashing,
      2: Chapter2_Blocks,
      3: Chapter3_Network,
      4: Chapter4_PoW,
      6: Chapter6_Keys,
      7: Chapter7_Contracts
    };
    this.currentChapterId = 1;
    this.activeMission = this.chapters[1];
    this.latestState = {};
  }

  loadChapter(chapterId) {
    if (!this.chapters[chapterId]) return;
    this.currentChapterId = chapterId;
    this.activeMission = this.chapters[chapterId];
    this.renderObjectives();
  }

  updateState(state) {
    this.latestState = state;
    this.checkObjectives();
  }

  checkObjectives() {
    if (!this.activeMission || !this.activeMission.objectives) return;

    let newlyCompleted = 0;
    let allCompleted = true;

    for (const obj of this.activeMission.objectives) {
      if (!obj.completed && obj.check(this.latestState)) {
        obj.completed = true;
        newlyCompleted++;
        gameState.addXP(obj.xp);
        Toast.show("Objective Completed!", `${obj.title} (+${obj.xp} XP)`, 'success');
      }

      if (!obj.completed) {
        allCompleted = false;
      }
    }

    if (newlyCompleted > 0) {
      this.renderObjectives();
    }

    if (allCompleted) {
      this.handleChapterCompletion();
    }
  }

  handleChapterCompletion() {
    const nextChapterId = this.currentChapterId + 1;
    gameState.unlockChapter(nextChapterId);

    const nextBtn = document.getElementById('btn-next-chapter');
    if (nextBtn) {
      nextBtn.disabled = false;
      nextBtn.querySelector('.btn-subtext').textContent = `Chapter ${nextChapterId} is unlocked!`;
    }

    Toast.show("Chapter Mastered!", `You have conquered ${this.activeMission.title}!`, 'success', 6000);
    eventBus.emit('CHAPTER_COMPLETED', { chapterId: this.currentChapterId });
  }

  renderObjectives() {
    const container = document.getElementById('objectives-list');
    const badgeCount = document.getElementById('obj-pending-count');
    if (!container || !this.activeMission) return;

    let pending = 0;
    container.innerHTML = '';

    for (const obj of this.activeMission.objectives) {
      if (!obj.completed) pending++;

      const item = document.createElement('div');
      item.className = `objective-item ${obj.completed ? 'completed' : ''}`;
      item.innerHTML = `
        <div class="objective-check">${obj.completed ? '✓' : ''}</div>
        <div class="objective-info">
          <div class="objective-title">
            <span>${obj.title}</span>
            <span class="objective-xp">+${obj.xp} XP</span>
          </div>
          <div class="objective-desc">${obj.desc}</div>
        </div>
      `;
      container.appendChild(item);
    }

    if (badgeCount) {
      badgeCount.textContent = pending;
      badgeCount.style.display = pending === 0 ? 'none' : 'inline-block';
    }
  }
}
