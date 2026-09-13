import { eventBus } from './EventBus.js';

const STORAGE_KEY = 'blockchain_quest_save_v2';

// Level 1 foundational concepts unlocked by default
const DEFAULT_CODEX_IDS = ['sha256', 'avalanche', 'block', 'hash_pointer', 'genesis_block'];

class GameState {
  constructor() {
    this.currentLevel = 1;
    this.unlockedLevels = [1];
    this.completedLevels = [];
    this.knowledgePoints = 100;
    this.unlockedCodexIds = [...DEFAULT_CODEX_IDS];
    this.studentName = "Blockchain Explorer";
    this.levelQuizResults = {};
    this.soundEnabled = true;
    this.simulationPaused = false;
    this.simulationSpeed = 1.0;
    this.activeObjectives = {};

    this.load();
  }

  // Backward compatibility alias for currentChapter
  get currentChapter() {
    return this.currentLevel;
  }
  set currentChapter(val) {
    this.currentLevel = val;
  }

  get playerXP() {
    return this.knowledgePoints;
  }
  set playerXP(val) {
    this.knowledgePoints = val;
  }

  save() {
    if (typeof localStorage === 'undefined') return;
    try {
      const data = {
        currentLevel: this.currentLevel,
        unlockedLevels: this.unlockedLevels,
        completedLevels: this.completedLevels,
        knowledgePoints: this.knowledgePoints,
        unlockedCodexIds: Array.from(new Set(this.unlockedCodexIds)),
        studentName: this.studentName,
        levelQuizResults: this.levelQuizResults,
        soundEnabled: this.soundEnabled,
        activeObjectives: this.activeObjectives
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save game state to localStorage:', e);
    }
  }

  load() {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.currentLevel = parsed.currentLevel || 1;
        this.unlockedLevels = parsed.unlockedLevels || [1];
        this.completedLevels = parsed.completedLevels || [];
        this.knowledgePoints = parsed.knowledgePoints ?? 100;
        this.unlockedCodexIds = parsed.unlockedCodexIds || [...DEFAULT_CODEX_IDS];
        this.studentName = parsed.studentName || "Blockchain Explorer";
        this.levelQuizResults = parsed.levelQuizResults || {};
        this.soundEnabled = parsed.soundEnabled ?? true;
        this.activeObjectives = parsed.activeObjectives || {};
      }
    } catch (e) {
      console.warn('Could not load game state from localStorage:', e);
    }
  }

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    this.currentLevel = 1;
    this.unlockedLevels = [1];
    this.completedLevels = [];
    this.knowledgePoints = 100;
    this.unlockedCodexIds = [...DEFAULT_CODEX_IDS];
    this.studentName = "Blockchain Explorer";
    this.levelQuizResults = {};
    this.activeObjectives = {};
    this.save();
    eventBus.emit('STATE_RESET');
  }

  addKP(amount) {
    this.knowledgePoints += amount;
    this.save();
    eventBus.emit('KP_UPDATED', { kp: this.knowledgePoints, delta: amount });
    eventBus.emit('XP_UPDATED', { xp: this.knowledgePoints, delta: amount });
  }

  // Alias for backward compatibility
  addXP(amount) {
    this.addKP(amount);
  }

  unlockLevel(levelId) {
    if (!this.unlockedLevels.includes(levelId)) {
      this.unlockedLevels.push(levelId);
      this.unlockedLevels.sort((a, b) => a - b);
      this.save();
      eventBus.emit('LEVEL_UNLOCKED', { levelId });
      eventBus.emit('CHAPTER_UNLOCKED', { chapterId: levelId });
    }
  }

  // Backward compatibility alias
  unlockChapter(chapterId) {
    this.unlockLevel(chapterId);
  }

  setLevel(levelId) {
    this.currentLevel = levelId;
    this.save();
    eventBus.emit('LEVEL_CHANGED', { levelId });
    eventBus.emit('CHAPTER_CHANGED', { chapterId: levelId });
  }

  // Backward compatibility alias
  setChapter(chapterId) {
    this.setLevel(chapterId);
  }

  completeLevel(levelId, kpAward = 250) {
    if (!this.completedLevels.includes(levelId)) {
      this.completedLevels.push(levelId);
      this.completedLevels.sort((a, b) => a - b);
      this.addKP(kpAward);
    }

    // Unlock next level if available (up to level 7)
    if (levelId < 7) {
      this.unlockLevel(levelId + 1);
    }

    this.save();
    eventBus.emit('LEVEL_COMPLETED', { levelId, kpAward });
    eventBus.emit('CHAPTER_COMPLETED', { chapterId: levelId });
  }

  unlockCodex(conceptIds = []) {
    let newlyUnlocked = 0;
    conceptIds.forEach(id => {
      if (!this.unlockedCodexIds.includes(id)) {
        this.unlockedCodexIds.push(id);
        newlyUnlocked++;
      }
    });

    if (newlyUnlocked > 0) {
      this.save();
      eventBus.emit('CODEX_UNLOCKED', {
        newlyUnlocked,
        totalUnlocked: this.unlockedCodexIds.length
      });
    }
    return newlyUnlocked;
  }

  isCodexUnlocked(id) {
    return this.unlockedCodexIds.includes(id);
  }

  recordQuizResult(levelId, score, total) {
    this.levelQuizResults[levelId] = {
      score,
      total,
      passed: score >= 2,
      timestamp: Date.now()
    };
    this.save();
    eventBus.emit('QUIZ_RECORDED', { levelId, score, total });
  }

  isGameCompleted() {
    return [1, 2, 3, 4, 5, 6].every(lvl => this.completedLevels.includes(lvl));
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.save();
    eventBus.emit('SOUND_TOGGLED', { enabled: this.soundEnabled });
    return this.soundEnabled;
  }

  toggleSimulation() {
    this.simulationPaused = !this.simulationPaused;
    eventBus.emit('SIMULATION_TOGGLED', { paused: this.simulationPaused });
    return this.simulationPaused;
  }
}

export { GameState };
export const gameState = new GameState();
