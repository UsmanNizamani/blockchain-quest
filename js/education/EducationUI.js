import { gameState } from '../core/GameState.js';
import { eventBus } from '../core/EventBus.js';
import { Toast } from '../ui/Toast.js';
import { Crypto } from '../blockchain/Crypto.js';
import {
  LEVEL_METADATA,
  LEVEL_SUMMARIES,
  GLOSSARY_TERMS,
  EXPLAIN_MICRO_TOPICS,
  LEVEL_QUIZZES,
  REAL_WORLD_CASE_STUDIES
} from './EducationData.js';

export class EducationUI {
  constructor(levelManager, sidebarUI) {
    this.levelManager = levelManager;
    this.sidebarUI = sidebarUI;

    this.activeQuiz = null;
    this.currentQuizQuestionIdx = 0;
    this.quizScore = 0;

    this.bindGlobalExplainButtons();
    this.bindLevelSelectModal();
    this.bindCodexModal();
    this.bindLevelSummaryModal();
    this.bindQuizModal();
    this.bindCertificateModal();
  }

  // --- 1. EXPLAIN THIS MICRO-POPOVERS ---
  bindGlobalExplainButtons() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-explain, [data-explain]');
      if (btn) {
        const topicKey = btn.getAttribute('data-explain');
        if (topicKey && EXPLAIN_MICRO_TOPICS[topicKey]) {
          this.openExplainModal(EXPLAIN_MICRO_TOPICS[topicKey]);
        }
      }
    });

    const modal = document.getElementById('explain-modal');
    const closeBtn = document.getElementById('btn-close-explain-modal');
    closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }

  openExplainModal(topic) {
    const modal = document.getElementById('explain-modal');
    const titleEl = document.getElementById('explain-modal-title');
    const conceptEl = document.getElementById('explain-modal-concept');
    const equationEl = document.getElementById('explain-modal-equation');
    const summaryEl = document.getElementById('explain-modal-summary');
    const deepEl = document.getElementById('explain-modal-deepdive');
    const realEl = document.getElementById('explain-modal-realworld');

    if (titleEl) titleEl.textContent = topic.title;
    if (conceptEl) conceptEl.textContent = topic.concept;
    if (equationEl) {
      if (topic.equation) {
        equationEl.textContent = topic.equation;
        equationEl.parentElement.style.display = 'block';
      } else {
        equationEl.parentElement.style.display = 'none';
      }
    }
    if (summaryEl) summaryEl.textContent = topic.summary;
    if (deepEl) deepEl.textContent = topic.deepDive;
    if (realEl) realEl.textContent = topic.realWorld;

    modal?.classList.remove('hidden');
  }

  // --- 2. MAIN MENU / LEVEL SELECT MODAL ---
  bindLevelSelectModal() {
    const modal = document.getElementById('level-select-modal');
    const closeBtn = document.getElementById('btn-close-level-select');
    const openBtn = document.getElementById('btn-open-level-map');

    openBtn?.addEventListener('click', () => {
      this.renderLevelSelectGrid();
      modal?.classList.remove('hidden');
    });

    closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }

  renderLevelSelectGrid() {
    const grid = document.getElementById('level-select-grid');
    if (!grid) return;

    grid.innerHTML = [1, 2, 3, 4, 5, 6, 7].map(lvlId => {
      const meta = LEVEL_METADATA[lvlId];
      const isUnlocked = gameState.unlockedLevels.includes(lvlId);
      const isCompleted = gameState.completedLevels.includes(lvlId);
      const isActive = gameState.currentLevel === lvlId;

      let statusBadge = '';
      if (isCompleted) {
        statusBadge = `<span class="badge-label" style="background: rgba(0, 255, 136, 0.2); color: var(--accent-green);">⭐ MASTERED</span>`;
      } else if (isUnlocked) {
        statusBadge = `<span class="badge-label" style="background: rgba(0, 240, 255, 0.2); color: var(--accent-cyan);">⚡ AVAILABLE</span>`;
      } else {
        statusBadge = `<span class="badge-label" style="background: rgba(255, 255, 255, 0.1); color: var(--text-muted);">🔒 LOCKED</span>`;
      }

      return `
        <div class="level-card ${isUnlocked ? 'unlocked' : 'locked'} ${isActive ? 'active-level' : ''}" data-level-id="${lvlId}" style="background: ${isUnlocked ? 'linear-gradient(145deg, #121c30, #0c1322)' : 'rgba(11, 17, 30, 0.6)'}; border: 1px solid ${isActive ? 'var(--accent-cyan)' : (isCompleted ? 'var(--accent-green)' : 'var(--border-subtle)')}; padding: 14px; border-radius: 8px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px; cursor: ${isUnlocked ? 'pointer' : 'not-allowed'}; opacity: ${isUnlocked ? '1' : '0.6'};">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 20px;">${meta.icon}</span>
              ${statusBadge}
            </div>
            <h3 style="font-size: 13px; color: ${isUnlocked ? '#fff' : 'var(--text-muted)'}; margin-bottom: 2px;">${meta.title}</h3>
            <div style="font-size: 10px; color: var(--accent-amber); font-weight: bold; margin-bottom: 6px;">${meta.role}</div>
            <p style="font-size: 10.5px; color: var(--text-secondary); line-height: 1.4;">${meta.desc}</p>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px; margin-top: 4px;">
            <span style="font-size: 9.5px; color: var(--accent-cyan); font-weight: bold;">+${meta.kpReward} KP</span>
            <button class="hud-btn ${isActive ? 'primary' : ''}" style="font-size: 10px; padding: 4px 10px;" ${!isUnlocked ? 'disabled' : ''}>
              ${isActive ? 'Playing Now' : (isCompleted ? 'Replay Level' : 'Enter Level')}
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listener to unlocked level cards
    grid.querySelectorAll('.level-card.unlocked').forEach(card => {
      card.addEventListener('click', () => {
        const lvlId = parseInt(card.getAttribute('data-level-id'), 10);
        this.levelManager.loadLevel(lvlId);
        this.sidebarUI.loadChapter(lvlId);
        document.getElementById('level-select-modal')?.classList.add('hidden');
        Toast.show("Level Loaded", `Switched to ${LEVEL_METADATA[lvlId].title}`, "info");
      });
    });
  }

  // --- 3. CONCEPT CODEX DRAWER ---
  bindCodexModal() {
    const modal = document.getElementById('concept-codex-modal');
    const closeBtn = document.getElementById('btn-close-codex');
    const openBtn = document.getElementById('btn-open-codex');
    const searchInput = document.getElementById('codex-search-input');

    openBtn?.addEventListener('click', () => {
      this.renderCodexEntries();
      modal?.classList.remove('hidden');
    });

    closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });

    searchInput?.addEventListener('input', (e) => {
      this.renderCodexEntries(e.target.value);
    });

    // Category filter pills
    document.querySelectorAll('.codex-cat-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        document.querySelectorAll('.codex-cat-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const cat = pill.getAttribute('data-cat');
        this.renderCodexEntries(searchInput?.value || '', cat);
      });
    });
  }

  renderCodexEntries(searchTerm = '', categoryFilter = 'ALL') {
    const container = document.getElementById('codex-entries-container');
    const progressEl = document.getElementById('codex-progress-text');
    const badgeEl = document.getElementById('hud-codex-count');
    if (!container) return;

    const unlockedCount = gameState.unlockedCodexIds.length;
    const totalCount = GLOSSARY_TERMS.length;

    if (progressEl) progressEl.textContent = `${unlockedCount} / ${totalCount} Discovered (${Math.round((unlockedCount / totalCount) * 100)}%)`;
    if (badgeEl) badgeEl.textContent = `${unlockedCount}/${totalCount}`;

    const termLower = searchTerm.toLowerCase();

    const filtered = GLOSSARY_TERMS.filter(item => {
      const matchCat = categoryFilter === 'ALL' || item.category === categoryFilter;
      const matchSearch = item.term.toLowerCase().includes(termLower) ||
                          item.summary.toLowerCase().includes(termLower) ||
                          item.definition.toLowerCase().includes(termLower);
      return matchCat && matchSearch;
    });

    container.innerHTML = filtered.map(item => {
      const isUnlocked = gameState.isCodexUnlocked(item.id);

      if (!isUnlocked) {
        return `
          <div class="theory-card" style="background: rgba(11, 17, 30, 0.4); border: 1px dashed rgba(255, 255, 255, 0.1); opacity: 0.5; filter: grayscale(1);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="color: var(--text-muted); font-size: 11px;">🔒 ${item.term}</strong>
              <span class="badge-label" style="background: rgba(255,255,255,0.05); color: var(--text-muted); font-size: 8.5px;">LEVEL ${item.unlockLevel} SECRET</span>
            </div>
            <p style="font-size: 10.5px; color: var(--text-muted); margin-top: 6px; font-style: italic;">
              Complete <strong>Level ${item.unlockLevel}: ${LEVEL_METADATA[item.unlockLevel]?.role || ''}</strong> to unlock and read this cryptographic concept.
            </p>
          </div>
        `;
      }

      return `
        <div class="theory-card" style="background: linear-gradient(145deg, #111d33, #0b1322); border-color: var(--accent-cyan); margin-bottom: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 6px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <strong style="color: #fff; font-size: 12px;">📖 ${item.term}</strong>
              <span class="badge-label" style="background: rgba(0, 240, 255, 0.15); color: var(--accent-cyan); font-size: 8.5px;">${item.badge}</span>
            </div>
            <span class="badge-label" style="background: rgba(0, 255, 136, 0.15); color: var(--accent-green); font-size: 8.5px;">LVL ${item.unlockLevel} DISCOVERED</span>
          </div>

          <div style="font-size: 11px; color: var(--accent-cyan); margin-bottom: 6px; font-weight: 600;">
            ${item.summary}
          </div>

          <p style="font-size: 11px; color: var(--text-secondary); line-height: 1.45; margin-bottom: 8px;">
            ${item.definition}
          </p>

          <div style="background: rgba(0,0,0,0.4); padding: 8px; border-radius: 4px; font-size: 10px; display: flex; flex-direction: column; gap: 4px; border: 1px solid rgba(255,255,255,0.05);">
            <div><strong style="color: var(--accent-amber);">Real-World Anchor:</strong> <span style="color: #cbd5e1;">${item.realWorld}</span></div>
            <div><strong style="color: var(--accent-green);">Key Takeaway:</strong> <span style="color: #94a3b8;">${item.keyTakeaway}</span></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- 4. LEVEL SUMMARY MODAL ---
  bindLevelSummaryModal() {
    const modal = document.getElementById('level-summary-modal');
    const closeBtn = document.getElementById('btn-close-level-summary');
    const continueBtn = document.getElementById('btn-summary-continue');
    const quizBtn = document.getElementById('btn-summary-quiz');

    closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

    eventBus.on('SHOW_LEVEL_SUMMARY_MODAL', ({ levelId }) => {
      this.populateLevelSummary(levelId);
      modal?.classList.remove('hidden');
    });

    continueBtn?.addEventListener('click', () => {
      modal?.classList.add('hidden');
      const nextLevelId = gameState.currentLevel < 6 ? gameState.currentLevel + 1 : 6;
      if (gameState.isGameCompleted()) {
        this.openCertificateModal();
      } else {
        this.levelManager.loadLevel(nextLevelId);
        this.sidebarUI.loadChapter(nextLevelId);
      }
    });

    quizBtn?.addEventListener('click', () => {
      modal?.classList.add('hidden');
      this.startQuiz(gameState.currentLevel);
    });
  }

  populateLevelSummary(levelId) {
    const summary = LEVEL_SUMMARIES[levelId];
    if (!summary) return;

    const titleEl = document.getElementById('summary-title');
    const roleEl = document.getElementById('summary-role');
    const kpEl = document.getElementById('summary-kp');
    const descEl = document.getElementById('summary-desc');
    const conceptsListEl = document.getElementById('summary-concepts-list');
    const anchorEl = document.getElementById('summary-anchor');
    const nextTeaserEl = document.getElementById('summary-next-teaser');
    const continueBtn = document.getElementById('btn-summary-continue');

    if (titleEl) titleEl.textContent = summary.title;
    if (roleEl) roleEl.textContent = summary.role;
    if (kpEl) kpEl.textContent = `+${summary.kpEarned} KP`;
    if (descEl) descEl.textContent = summary.summary;
    if (anchorEl) anchorEl.textContent = summary.realWorldAnchor;
    if (nextTeaserEl) nextTeaserEl.textContent = summary.nextTeaser;

    if (continueBtn) {
      if (levelId === 6) {
        continueBtn.innerHTML = `<span>🎓 View Blockchain Complete Certificate!</span>`;
      } else {
        continueBtn.innerHTML = `<span>Continue to Level 0${levelId + 1} ➔</span>`;
      }
    }

    if (conceptsListEl) {
      conceptsListEl.innerHTML = summary.conceptsMastered.map(c => `
        <div style="background: rgba(0, 255, 136, 0.1); border: 1px solid rgba(0, 255, 136, 0.2); padding: 5px 8px; border-radius: 4px; font-size: 10px; color: #fff; display: flex; align-items: center; gap: 6px;">
          <span style="color: var(--accent-green);">✓</span> <span>${c}</span>
        </div>
      `).join('');
    }
  }

  // --- 5. 3-QUESTION LEVEL QUIZZES ---
  bindQuizModal() {
    const modal = document.getElementById('quiz-modal');
    const closeBtn = document.getElementById('btn-close-quiz');
    closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));

    const openQuizBtn = document.getElementById('btn-open-quiz');
    openQuizBtn?.addEventListener('click', () => {
      this.startQuiz(gameState.currentLevel);
    });
  }

  startQuiz(levelId) {
    const quiz = LEVEL_QUIZZES[levelId];
    if (!quiz) {
      Toast.show("Quiz Unavailable", "No quiz found for this level.", "info");
      return;
    }

    this.activeQuiz = quiz;
    this.currentQuizQuestionIdx = 0;
    this.quizScore = 0;

    const modal = document.getElementById('quiz-modal');
    const titleEl = document.getElementById('quiz-modal-title');
    const subtitleEl = document.getElementById('quiz-modal-subtitle');

    if (titleEl) titleEl.textContent = quiz.title;
    if (subtitleEl) subtitleEl.textContent = quiz.subtitle;

    this.renderQuizQuestion();
    modal?.classList.remove('hidden');
  }

  renderQuizQuestion() {
    const q = this.activeQuiz.questions[this.currentQuizQuestionIdx];
    const counterEl = document.getElementById('quiz-question-counter');
    const promptEl = document.getElementById('quiz-question-prompt');
    const optionsContainer = document.getElementById('quiz-options-container');
    const feedbackBox = document.getElementById('quiz-feedback-box');
    const nextBtn = document.getElementById('btn-quiz-next');

    if (counterEl) counterEl.textContent = `Question ${this.currentQuizQuestionIdx + 1} of ${this.activeQuiz.questions.length}`;
    if (promptEl) promptEl.textContent = q.question;
    if (feedbackBox) feedbackBox.style.display = 'none';
    if (nextBtn) nextBtn.style.display = 'none';

    if (optionsContainer) {
      optionsContainer.innerHTML = q.options.map((opt, idx) => `
        <button class="quiz-option-btn hud-btn" data-option-idx="${idx}" style="width: 100%; text-align: left; padding: 10px; font-size: 11px; margin-bottom: 6px; line-height: 1.4; justify-content: flex-start;">
          <span style="font-weight: bold; margin-right: 8px; color: var(--accent-cyan);">${String.fromCharCode(65 + idx)}.</span>
          <span>${opt}</span>
        </button>
      `).join('');

      optionsContainer.querySelectorAll('.quiz-option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const selectedIdx = parseInt(btn.getAttribute('data-option-idx'), 10);
          this.handleQuizAnswer(selectedIdx, q);
        });
      });
    }
  }

  handleQuizAnswer(selectedIdx, question) {
    const optionsContainer = document.getElementById('quiz-options-container');
    const feedbackBox = document.getElementById('quiz-feedback-box');
    const feedbackText = document.getElementById('quiz-feedback-text');
    const nextBtn = document.getElementById('btn-quiz-next');

    const isCorrect = selectedIdx === question.correctIndex;
    if (isCorrect) this.quizScore++;

    // Disable buttons and highlight
    optionsContainer?.querySelectorAll('.quiz-option-btn').forEach(b => {
      b.disabled = true;
      const idx = parseInt(b.getAttribute('data-option-idx'), 10);
      if (idx === question.correctIndex) {
        b.style.borderColor = 'var(--accent-green)';
        b.style.background = 'rgba(0, 255, 136, 0.2)';
      } else if (idx === selectedIdx && !isCorrect) {
        b.style.borderColor = 'var(--accent-red)';
        b.style.background = 'rgba(255, 51, 102, 0.2)';
      }
    });

    if (feedbackBox && feedbackText) {
      feedbackBox.style.display = 'block';
      feedbackBox.style.borderColor = isCorrect ? 'var(--accent-green)' : 'var(--accent-red)';
      feedbackText.innerHTML = `
        <strong style="color: ${isCorrect ? 'var(--accent-green)' : 'var(--accent-red)'}; font-size: 12px;">
          ${isCorrect ? '✓ Correct!' : '✕ Incorrect'}
        </strong><br>
        <span style="color: var(--text-secondary); font-size: 10.5px; line-height: 1.4;">${question.explanation}</span>
      `;
    }

    if (nextBtn) {
      nextBtn.style.display = 'block';
      nextBtn.textContent = (this.currentQuizQuestionIdx < this.activeQuiz.questions.length - 1) ? 'Next Question ➔' : 'Complete Quiz & Claim Score 🏆';
      nextBtn.onclick = () => {
        if (this.currentQuizQuestionIdx < this.activeQuiz.questions.length - 1) {
          this.currentQuizQuestionIdx++;
          this.renderQuizQuestion();
        } else {
          this.finishQuiz();
        }
      };
    }
  }

  finishQuiz() {
    const bonusKP = this.quizScore * 50;
    gameState.addKP(bonusKP);
    gameState.recordQuizResult(this.activeQuiz.levelId, this.quizScore, this.activeQuiz.questions.length);

    document.getElementById('quiz-modal')?.classList.add('hidden');

    Toast.show(
      "Quiz Completed! 🎯",
      `You scored ${this.quizScore}/${this.activeQuiz.questions.length}! Earned +${bonusKP} Knowledge Points!`,
      "success",
      5000
    );
  }

  // --- 6. BLOCKCHAIN COMPLETE CERTIFICATE ---
  bindCertificateModal() {
    const modal = document.getElementById('certificate-modal');
    const closeBtn = document.getElementById('btn-close-certificate');
    const openBtn = document.getElementById('btn-open-certificate');
    const printBtn = document.getElementById('btn-print-certificate');
    const copyHashBtn = document.getElementById('btn-copy-cert-hash');
    const nameInput = document.getElementById('cert-student-name-input');

    openBtn?.addEventListener('click', () => {
      this.openCertificateModal();
    });

    closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });

    nameInput?.addEventListener('input', (e) => {
      gameState.studentName = e.target.value || "Blockchain Explorer";
      gameState.save();
      this.updateCertificateDetails();
    });

    printBtn?.addEventListener('click', () => {
      window.print();
    });

    copyHashBtn?.addEventListener('click', () => {
      const hashEl = document.getElementById('cert-hash-val');
      if (hashEl) {
        navigator.clipboard.writeText(hashEl.textContent || '');
        Toast.show("Hash Copied!", "Certificate verification hash copied to clipboard.", "success");
      }
    });
  }

  openCertificateModal() {
    const modal = document.getElementById('certificate-modal');
    this.updateCertificateDetails();
    modal?.classList.remove('hidden');
  }

  updateCertificateDetails() {
    const nameEl = document.getElementById('cert-student-name-display');
    const nameInput = document.getElementById('cert-student-name-input');
    const dateEl = document.getElementById('cert-issue-date');
    const hashEl = document.getElementById('cert-hash-val');
    const kpEl = document.getElementById('cert-total-kp');
    const statusEl = document.getElementById('cert-status-badge');

    const name = gameState.studentName || "Blockchain Explorer";
    if (nameEl) nameEl.textContent = name;
    if (nameInput && nameInput.value !== name) nameInput.value = name;

    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    if (dateEl) dateEl.textContent = dateStr;
    if (kpEl) kpEl.textContent = `${gameState.knowledgePoints} KP`;

    // Compute deterministic verification hash
    const preimage = `${name}|6_LEVELS_COMPLETED|${gameState.knowledgePoints}|${dateStr}`;
    const certHash = '0x' + Crypto.hashSync(preimage);
    if (hashEl) hashEl.textContent = certHash;

    const allDone = gameState.isGameCompleted();
    if (statusEl) {
      if (allDone) {
        statusEl.textContent = "VERIFIED MASTER ARCHITECT";
        statusEl.style.color = "var(--accent-green)";
        statusEl.style.borderColor = "var(--accent-green)";
      } else {
        statusEl.textContent = `IN PROGRESS (${gameState.completedLevels.length}/6 LEVELS)`;
        statusEl.style.color = "var(--accent-amber)";
        statusEl.style.borderColor = "var(--accent-amber)";
      }
    }
  }
}
