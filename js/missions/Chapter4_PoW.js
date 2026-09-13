import { defaultBlockchain } from '../blockchain/Blockchain.js';
import { minerEngine } from '../blockchain/ConsensusPoW.js';
import { fiftyOneAttack } from '../blockchain/FiftyOneAttack.js';
import { eventBus } from '../core/EventBus.js';
import { Toast } from '../ui/Toast.js';

export const Chapter4_PoW = {
  id: 4,
  title: "Proof of Work & The Mining Race",
  subtitle: "Computational Asymmetry, Difficulty Scaling & 51% Attacks",
  xpReward: 350,

  theory: {
    heroTitle: "Chapter 4: Proof of Work & 51% Attack Defense",
    sections: [
      {
        title: "The Computational Lottery",
        content: `In a trustless decentralized network, how do we decide who gets to add the next block without a central boss? Bitcoin solves this with <strong>Proof of Work</strong>. Miners compete in a mathematical race to find a special number called a <strong>Nonce</strong> (Number Used Once). When combined with the block header and hashed via SHA-256, the result must be smaller than a cryptographic target—meaning it must start with a specific number of leading zeros.`
      },
      {
        title: "The Asymmetry of Proof of Work",
        highlight: "Proof of Work forces miners to spend computational energy. It's hard to find the nonce but easy to verify it.\n\nFinding a valid nonce requires millions or trillions of trial-and-error guesses ($O(16^D)$). But once published, any node on Earth can verify the entire block instantly with a single SHA-256 calculation ($O(1)$)!"
      },
      {
        title: "The 51% Attack & Economic Defense",
        highlight: "51% attacks are possible but economically irrational. The attacker would need to spend more on mining than they could steal, and it would destroy the currency's value."
      },
      {
        title: "Difficulty & Exponential Scaling",
        content: `Because SHA-256 produces hexadecimal characters (0-9, a-f, base 16), every additional leading zero required multiplies the expected number of hash guesses by <strong>16×</strong>:\n\n• <strong>1 zero ('0')</strong>: 1 in 16 attempts (~16 hashes)\n• <strong>2 zeros ('00')</strong>: 1 in 256 attempts (~256 hashes)\n• <strong>3 zeros ('000')</strong>: 1 in 4,096 attempts (~4,096 hashes)\n• <strong>4 zeros ('0000')</strong>: 1 in 65,536 attempts (~65,536 hashes)`
      }
    ],
    concepts: [
      { name: "Difficulty Target", desc: "Required number of leading zero hex digits" },
      { name: "Hashrate", desc: "Mining speed measured in Hashes/sec (H/s)" },
      { name: "Nakamoto Consensus", desc: "The longest chain with most accumulated PoW is valid" },
      { name: "51% Reorganization", desc: "Majority hashrate can secretly outpace honest chain" }
    ]
  },

  objectives: [
    {
      id: "ch4_obj1",
      title: "1. Mine an Easy Block (Difficulty '00')",
      desc: "Select Easy difficulty ('00') in normal mode and successfully mine a block.",
      xp: 50,
      completed: false,
      check: (state) => {
        return state.minedDifficulties && state.minedDifficulties.includes(2);
      }
    },
    {
      id: "ch4_obj2",
      title: "2. The Exponential Leap (Difficulty '000'+)",
      desc: "Scale difficulty slider to Medium ('000') or Hard ('0000') and mine a block, observing the higher attempt count.",
      xp: 70,
      completed: false,
      check: (state) => {
        return state.minedDifficulties && state.minedDifficulties.some(d => d >= 3);
      }
    },
    {
      id: "ch4_obj3",
      title: "3. Verify Instant Proof-of-Work",
      desc: "Click 'Verify Mined Proof' in the lab console to test the 1-step validation property.",
      xp: 50,
      completed: false,
      check: (state) => {
        return state.hasVerifiedProof === true;
      }
    },
    {
      id: "ch4_obj4",
      title: "4. Simulate a 51% Attack",
      desc: "Switch to 'Simulate Attack' mode, launch the 60% attacker chain, and observe the chain reorganization.",
      xp: 130,
      completed: false,
      check: (state) => {
        return state.hasWitnessed51Attack === true;
      }
    }
  ],

  initLab(container, onStateChange) {
    const blockchain = defaultBlockchain;
    const attack = fiftyOneAttack;

    const missionState = {
      minedDifficulties: [],
      hasVerifiedProof: false,
      hasWitnessed51Attack: false,
      totalMined: 0
    };

    let currentDifficulty = minerEngine.difficulty || 3;
    let activeSubTab = 'normal'; // 'normal' | 'attack51'

    function renderLabUI() {
      const candidate = blockchain.candidateBlock || blockchain.getLatestBlock();
      const diffLabels = { 2: "Easy ('00')", 3: "Medium ('000')", 4: "Hard ('0000')" };
      const targetPrefix = '0'.repeat(currentDifficulty);
      const costMetrics = attack.getCostMetrics();

      container.innerHTML = `
        <!-- Sub-Mode Switch Buttons -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
          <button id="tab-btn-normal" class="hud-btn ${activeSubTab === 'normal' ? 'primary' : ''}" style="justify-content: center; font-size: 11px;">
            ⛏️ Mining Race Lab
          </button>
          <button id="tab-btn-51attack" class="hud-btn ${activeSubTab === 'attack51' ? 'primary' : ''}" style="justify-content: center; font-size: 11px; border-color: ${activeSubTab === 'attack51' ? 'var(--accent-red)' : 'var(--border-subtle)'};">
            ⚔️ Simulate 51% Attack
          </button>
        </div>

        ${activeSubTab === 'normal' ? `
          <!-- NORMAL MINING RACE LAB -->
          <!-- Difficulty Control -->
          <div class="lab-field-group">
            <div class="lab-field-label">
              <span>MINING DIFFICULTY TARGET</span>
              <strong id="diff-label-text" style="color: var(--accent-amber); font-family: var(--font-mono);">
                ${diffLabels[currentDifficulty] || `${currentDifficulty} Zeros`}
              </strong>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 4px;">
              <button class="hud-btn diff-btn ${currentDifficulty === 2 ? 'primary' : ''}" data-diff="2" style="flex: 1; justify-content: center;">
                Easy (00)
              </button>
              <button class="hud-btn diff-btn ${currentDifficulty === 3 ? 'primary' : ''}" data-diff="3" style="flex: 1; justify-content: center;">
                Medium (000)
              </button>
              <button class="hud-btn diff-btn ${currentDifficulty === 4 ? 'primary' : ''}" data-diff="4" style="flex: 1; justify-content: center;">
                Hard (0000)
              </button>
            </div>
            <input type="range" id="diff-slider" min="2" max="4" value="${currentDifficulty}" style="width: 100%; margin-top: 6px; accent-color: var(--accent-amber);" />
            <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">
              Target: Must start with <code>${targetPrefix}</code> (Avg attempts: ~${Math.pow(16, currentDifficulty).toLocaleString()})
            </span>
          </div>

          <!-- Mining Telemetry Dashboard -->
          <div class="theory-card" style="margin-top: 12px; background: rgba(0,0,0,0.4); border-color: rgba(255, 183, 3, 0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="font-size: 12px; color: var(--accent-amber);">⛏️ MINING TELEMETRY</strong>
              <span id="mining-status-badge" class="badge-label" style="background: rgba(255, 183, 3, 0.15); color: var(--accent-amber);">
                ${minerEngine.isMining ? 'HASHING ACTIVE' : 'IDLE'}
              </span>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
              <div class="concept-box">
                <strong style="color: #94a3b8;">HASHRATE</strong>
                <span id="telemetry-hashrate" style="font-size: 13px; font-weight: bold; color: var(--accent-cyan);">0 H/s</span>
              </div>
              <div class="concept-box">
                <strong style="color: #94a3b8;">TIME ELAPSED</strong>
                <span id="telemetry-time" style="font-size: 13px; font-weight: bold; color: #fff;">0.00s</span>
              </div>
              <div class="concept-box">
                <strong style="color: #94a3b8;">NONCES TESTED</strong>
                <span id="telemetry-attempts" style="font-size: 13px; font-weight: bold; color: var(--accent-amber);">0</span>
              </div>
              <div class="concept-box">
                <strong style="color: #94a3b8;">TARGET PREFIX</strong>
                <span id="telemetry-target" style="font-size: 13px; font-weight: bold; color: var(--accent-green);">${targetPrefix}</span>
              </div>
            </div>

            <div class="hash-output-box" style="margin-top: 10px;">
              <span style="font-size: 10px; color: #94a3b8;">LATEST HASH GUESS:</span>
              <div id="telemetry-curr-hash" class="hash-hex-display" style="font-size: 10px; padding: 6px;">
                ${candidate.hash}
              </div>
            </div>

            <div style="display: flex; gap: 8px; margin-top: 12px;">
              <button id="btn-start-mining" class="action-btn primary-action" style="flex: 2;">
                <span class="btn-text">${minerEngine.isMining ? '⏹ Stop Mining' : '⛏️ Start Mining Block'}</span>
                <span class="btn-subtext">Find nonce matching target difficulty</span>
              </button>
              <button id="btn-verify-proof" class="hud-btn" style="flex: 1; justify-content: center; font-size: 11px;">
                🔍 Verify Proof
              </button>
            </div>
          </div>

          <div id="mined-history-box" style="margin-top: 12px;"></div>
        ` : `
          <!-- 51% ATTACK SIMULATOR -->
          <div class="theory-card" style="border-color: var(--accent-red); background: rgba(255, 51, 102, 0.06);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="color: var(--accent-red); font-size: 12px;">☠️ 51% ATTACK DYNAMICS</strong>
              <span class="badge-label" style="background: rgba(255, 51, 102, 0.2); color: var(--accent-red);">
                ${attack.isRunning ? 'ATTACK IN PROGRESS' : (attack.reorgHappened ? 'REORGANIZED' : 'READY')}
              </span>
            </div>
            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 6px; line-height: 1.5;">
              A malicious pool controls <strong>60% of network hashrate</strong>. They secretly mine a competing shadow fork to double-spend coins and rewrite history!
            </div>
          </div>

          <!-- Attack Simulation Controls -->
          <div style="display: flex; gap: 8px; margin-top: 10px;">
            <button id="btn-toggle-51-sim" class="action-btn primary-action" style="flex: 2; background: ${attack.isRunning ? '#ffb703' : 'var(--accent-red)'};">
              <span class="btn-text">${attack.isRunning ? '⏸ Pause Attack' : (attack.reorgHappened ? '🔄 Reset & Rerun' : '🚀 Launch 51% Attack')}</span>
              <span class="btn-subtext">${attack.isRunning ? 'Halt live block generation' : 'Mine honest (40%) vs attacker (60%)'}</span>
            </button>
            <button id="btn-reset-51" class="hud-btn" style="flex: 1; justify-content: center; font-size: 11px;">
              🔄 Reset
            </button>
          </div>

          <!-- Difficulty & Attack Cost Scaling Slider -->
          <div class="lab-field-group" style="margin-top: 12px;">
            <div class="lab-field-label">
              <span>TARGET DIFFICULTY & ATTACK COST</span>
              <strong style="color: var(--accent-amber); font-family: var(--font-mono); font-size: 11px;">
                ${costMetrics.name}
              </strong>
            </div>
            <input type="range" id="diff-51-slider" min="2" max="5" value="${attack.difficulty}" style="width: 100%; margin-top: 4px; accent-color: var(--accent-amber);" />
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; font-family: var(--font-mono); margin-top: 2px;">
              <span>Easy ('00')</span>
              <span>Med ('000')</span>
              <span>Hard ('0000')</span>
              <span>Bitcoin Scale ('00000')</span>
            </div>
          </div>

          <!-- Live Chain Height Scoreboard -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px;">
            <div class="concept-box" style="border-left: 3px solid var(--accent-green);">
              <strong style="color: var(--accent-green); font-size: 10px;">HONEST CHAIN (40%)</strong>
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 2px;">
                <span id="honest-height-text" style="font-size: 16px; font-weight: bold; color: #fff;">${attack.honestChain.length} Blocks</span>
                <span style="font-size: 10px; color: #94a3b8;">${attack.honestProgress}%</span>
              </div>
            </div>
            <div class="concept-box" style="border-left: 3px solid var(--accent-red);">
              <strong style="color: var(--accent-red); font-size: 10px;">ATTACKER FORK (60%)</strong>
              <div style="display: flex; justify-content: space-between; align-items: baseline; margin-top: 2px;">
                <span id="attacker-height-text" style="font-size: 16px; font-weight: bold; color: #fff;">${attack.attackerChain.length} Blocks</span>
                <span style="font-size: 10px; color: var(--accent-red);">${attack.attackerProgress}%</span>
              </div>
            </div>
          </div>

          <!-- Economic Cost Matrix -->
          <div class="theory-card" style="margin-top: 10px; background: rgba(0,0,0,0.5); border-color: rgba(255, 255, 255, 0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <strong style="font-size: 11px; color: #fff;">📊 ATTACK COST MATRIX (GAME THEORY)</strong>
              <span class="badge-label" style="background: rgba(255, 51, 102, 0.15); color: var(--accent-red); font-size: 9px;">
                NET LOSS GUARANTEED
              </span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 6px; font-family: var(--font-mono); font-size: 11px; margin-top: 8px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Required Hardware:</span>
                <strong style="color: #fff;">${costMetrics.asicsRequired}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Power Consumption:</span>
                <strong style="color: var(--accent-amber);">${costMetrics.powerMW}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Hourly Attack Cost:</span>
                <strong style="color: var(--accent-red); font-size: 12px;">$${costMetrics.hourlyCost.toLocaleString()} / hr</strong>
              </div>
              <div style="border-top: 1px dashed rgba(255, 255, 255, 0.1); padding-top: 6px; display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Potential Stolen Coins:</span>
                <span style="color: var(--accent-cyan);">$${costMetrics.stolenValue.toLocaleString()}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Post-Attack Token Price:</span>
                <span style="color: var(--accent-red);">Crashes to ~$${costMetrics.postAttackVal} (-99%)</span>
              </div>
              <div style="border-top: 1px solid rgba(255, 51, 102, 0.3); padding-top: 6px; display: flex; justify-content: space-between;">
                <strong style="color: var(--accent-red);">Net Attacker Profit:</strong>
                <strong style="color: var(--accent-red);">-$${costMetrics.netLoss.toLocaleString()} (IRRATIONAL)</strong>
              </div>
            </div>
          </div>

          ${attack.reorgHappened ? `
            <div class="theory-card" style="margin-top: 10px; border-color: var(--accent-red); background: rgba(255, 51, 102, 0.1);">
              <strong style="color: var(--accent-red); font-size: 12px;">⚠️ 51% REORGANIZATION OCCURRED!</strong>
              <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">
                The attacker's longer chain was accepted by consensus. ${attack.honestChain.length - 1} honest blocks were orphaned!
              </div>
              <button id="btn-open-51-modal" class="hud-btn" style="width: 100%; margin-top: 8px; justify-content: center; font-size: 11px; background: var(--accent-red); color: #fff;">
                📖 View Economic Defense Analysis
              </button>
            </div>
          ` : `
            <button id="btn-open-51-modal" class="hud-btn" style="width: 100%; margin-top: 10px; justify-content: center; font-size: 11px;">
              📖 Why 51% Attacks Are Economically Irrational
            </button>
          `}
        `}
      `;

      // Wire Tab Buttons
      container.querySelector('#tab-btn-normal')?.addEventListener('click', () => {
        activeSubTab = 'normal';
        attack.isActive = false;
        attack.stopSimulation();
        renderLabUI();
      });

      container.querySelector('#tab-btn-51attack')?.addEventListener('click', () => {
        activeSubTab = 'attack51';
        attack.isActive = true;
        renderLabUI();
      });

      // --- Normal Mining Lab Handlers ---
      if (activeSubTab === 'normal') {
        container.querySelectorAll('.diff-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const diff = parseInt(btn.getAttribute('data-diff'), 10);
            currentDifficulty = diff;
            minerEngine.setDifficulty(diff);
            if (blockchain.candidateBlock) blockchain.candidateBlock.difficulty = diff;
            renderLabUI();
          });
        });

        container.querySelector('#diff-slider')?.addEventListener('input', (e) => {
          const diff = parseInt(e.target.value, 10);
          currentDifficulty = diff;
          minerEngine.setDifficulty(diff);
          if (blockchain.candidateBlock) blockchain.candidateBlock.difficulty = diff;
          renderLabUI();
        });

        container.querySelector('#btn-start-mining')?.addEventListener('click', () => {
          if (minerEngine.isMining) {
            minerEngine.stopMining();
            renderLabUI();
          } else {
            const targetBlock = blockchain.candidateBlock || blockchain.createCandidateBlock(null, currentDifficulty);
            minerEngine.startMining(targetBlock, currentDifficulty);
            renderLabUI();
          }
        });

        container.querySelector('#btn-verify-proof')?.addEventListener('click', () => {
          const latest = blockchain.getLatestBlock();
          const isValidPoW = latest.verifyProofOfWork(latest.difficulty);
          missionState.hasVerifiedProof = true;
          if (onStateChange) onStateChange(missionState);

          Toast.show(
            isValidPoW ? "Instant Verification Passed! ✅" : "Proof Invalid",
            `Verified in 1 SHA-256 check: Block #${latest.index} satisfies difficulty ${latest.difficulty}.`,
            isValidPoW ? "success" : "error",
            4500
          );
        });
      }

      // --- 51% Attack Handlers ---
      if (activeSubTab === 'attack51') {
        container.querySelector('#btn-toggle-51-sim')?.addEventListener('click', () => {
          if (attack.isRunning) {
            attack.stopSimulation();
          } else if (attack.reorgHappened) {
            attack.reset();
            attack.startSimulation();
          } else {
            attack.startSimulation();
          }
          renderLabUI();
        });

        container.querySelector('#btn-reset-51')?.addEventListener('click', () => {
          attack.reset();
          renderLabUI();
        });

        container.querySelector('#diff-51-slider')?.addEventListener('input', (e) => {
          const d = parseInt(e.target.value, 10);
          attack.setDifficulty(d);
          renderLabUI();
        });

        container.querySelector('#btn-open-51-modal')?.addEventListener('click', () => {
          eventBus.emit('SHOW_51_ATTACK_MODAL', {
            attackerHeight: attack.attackerChain.length,
            honestHeight: attack.honestChain.length,
            costMetrics: attack.getCostMetrics()
          });
        });
      }
    }

    // Telemetry and Progress Listeners
    eventBus.on('MINING_PROGRESS', (data) => {
      if (activeSubTab !== 'normal') return;
      const hr = container.querySelector('#telemetry-hashrate');
      const time = container.querySelector('#telemetry-time');
      const att = container.querySelector('#telemetry-attempts');
      const ch = container.querySelector('#telemetry-curr-hash');

      if (hr) hr.textContent = `${data.hashRate.toLocaleString()} H/s`;
      if (time) time.textContent = `${data.elapsedSec}s`;
      if (att) att.textContent = data.attempts.toLocaleString();
      if (ch) ch.textContent = data.currentHash;
    });

    eventBus.on('MINING_SUCCESS', ({ block, stats }) => {
      if (activeSubTab !== 'normal') return;
      missionState.minedDifficulties.push(stats.difficulty);
      missionState.totalMined++;
      if (onStateChange) onStateChange(missionState);
      renderLabUI();
    });

    // 51% Attack event listeners
    eventBus.on('ATTACK_51_PROGRESS', () => {
      if (activeSubTab === 'attack51') {
        const hh = container.querySelector('#honest-height-text');
        const ah = container.querySelector('#attacker-height-text');
        if (hh) hh.textContent = `${attack.honestChain.length} Blocks`;
        if (ah) ah.textContent = `${attack.attackerChain.length} Blocks`;
      }
    });

    eventBus.on('ATTACK_51_BLOCK_MINED', () => {
      if (activeSubTab === 'attack51') {
        renderLabUI();
      }
    });

    eventBus.on('ATTACK_51_REORG', () => {
      missionState.hasWitnessed51Attack = true;
      if (onStateChange) onStateChange(missionState);
      if (activeSubTab === 'attack51') {
        renderLabUI();
      }
    });

    // Handle global trigger to activate 51% attack mode
    eventBus.on('ACTIVATE_51_ATTACK_MODE', () => {
      activeSubTab = 'attack51';
      attack.isActive = true;
      renderLabUI();
    });

    renderLabUI();
  }
};
