import { consensusPoS } from '../blockchain/ConsensusPoS.js';
import { consensusComparison } from '../blockchain/ConsensusComparison.js';
import { finalitySimulator } from '../blockchain/FinalitySimulator.js';
import { mergeSimulation } from '../blockchain/MergeSimulation.js';
import { playerWallet } from '../blockchain/Wallet.js';
import { defaultBlockchain } from '../blockchain/Blockchain.js';
import { minerEngine } from '../blockchain/ConsensusPoW.js';
import { difficultyAdjuster } from '../blockchain/DifficultyAdjuster.js';
import { eventBus } from '../core/EventBus.js';
import { Toast } from '../ui/Toast.js';

export const Level2_Miner = {
  id: 2,
  title: "Level 2: Miner",
  role: "Proof-of-Work Miner",
  kpReward: 250,
  subtitle: "Proof of Work, Nonce Computation, and Target Difficulty",
  codexUnlockIds: ["pow", "nonce", "difficulty"],

  theory: {
    heroTitle: "Level 2: Proof of Work & Thermodynamic Mining",
    sections: [
      {
        title: "The Computational Lottery",
        content: `In a trustless decentralized network, how do we decide who gets to add the next block without a central coordinator? Bitcoin solves this with <strong>Proof of Work</strong>. Miners compete in a mathematical race to find a special number called a <strong>Nonce</strong> (Number Used Once). When combined with the block header and hashed via SHA-256, the result must be smaller than a cryptographic target—meaning it must start with a specific number of leading zeros.`
      },
      {
        title: "The Asymmetry of Proof of Work",
        highlight: "Proof of Work forces miners to spend computational energy. It's hard to find the nonce but easy to verify it.\n\nFinding a valid nonce requires millions or trillions of trial-and-error guesses ($O(16^D)$). But once published, any node on Earth can verify the entire block instantly with a single SHA-256 calculation ($O(1)$)!"
      },
      {
        title: "Bitcoin's Self-Regulating Retarget Mechanism",
        content: `Every 2,016 blocks (~2 weeks), Bitcoin's protocol measures the actual time taken to mine those blocks compared to the 20,160-minute target (10 minutes per block):\n\n$$\\text{New Difficulty} = \\text{Old Difficulty} \\times \\left( \\frac{\\text{Actual Elapsed Time}}{\\text{Target Time (20,160 min)}} \\right)$$\n\nIf global hashrate rises (more miners join), blocks solve too quickly—the network automatically raises the difficulty. If miners shut off rigs, difficulty drops. In our simulator, this is tested in compressed time with a 5.0-second block target!`
      }
    ],
    concepts: [
      { name: "Difficulty Target", desc: "Required number of leading zero hex digits (1 to 5)" },
      { name: "Hashrate", desc: "Mining speed measured in Hashes/sec (H/s)" },
      { name: "Energy Consumption", desc: "Real Joules & Watt-hours burned searching for nonces" },
      { name: "Retarget Equilibrium", desc: "Automatic recalibration maintaining 10-minute block cadence" }
    ]
  },

  objectives: [
    {
      id: "lvl2_obj1",
      title: "1. Mine an Initial Block (Difficulty 1–2)",
      desc: "Select Easy difficulty ('0' or '00') and successfully discover a valid nonce to earn your first block reward.",
      xp: 75,
      completed: false,
      check: (state) => state.minedDifficulties && state.minedDifficulties.some(d => d >= 1)
    },
    {
      id: "lvl2_obj2",
      title: "2. The Exponential Leap (Difficulty 3+)",
      desc: "Scale difficulty slider to Hard ('000') or Expert ('0000') and observe how energy cost and attempts leap by 16×.",
      xp: 75,
      completed: false,
      check: (state) => state.minedDifficulties && state.minedDifficulties.some(d => d >= 3)
    },
    {
      id: "lvl2_obj3",
      title: "3. Verify Instant Proof-of-Work (O(1))",
      desc: "Click 'Verify Mined Proof' in the lab console to test the 1-step mathematical validation property.",
      xp: 50,
      completed: false,
      check: (state) => state.hasVerifiedProof === true
    },
    {
      id: "lvl2_obj4",
      title: "4. Trigger Automatic Difficulty Retargeting",
      desc: "Simulate a mining boom (3.0x or 5.0x) or crash to witness Bitcoin's self-regulating difficulty adjustment.",
      xp: 50,
      completed: false,
      check: (state) => state.hasTriggeredRetarget === true
    },
    {
      id: "lvl2_obj5",
      title: "5. Stake & Become a Validator (Proof of Stake)",
      desc: "Click ▶ Switch to Proof of Stake below, then stake coins and advance a slot until 2/3 of validators attest.",
      xp: 50,
      completed: false,
      check: (state) => state.hasStakedValidator === true && state.hasFinalizedPoSBlock === true
    }
  ],


  initLab(container, onStateChange) {
    const blockchain = defaultBlockchain;
    let currentDifficulty = minerEngine.difficulty || 2;
    let consensusMode = 'pow';
    let compareSubView = 'txs'; // 'txs' | 'finality'

    const missionState = {
      consensusMode: 'pow',
      minedDifficulties: [],
      hasVerifiedProof: false,
      hasTriggeredRetarget: false,
      hasStakedValidator: false,
      hasFinalizedPoSBlock: false,
      totalMined: 0
    };

    function notifyState() {
      missionState.consensusMode = consensusMode;
      onStateChange({ ...missionState });
    }

    function setConsensusMode(mode) {
      consensusMode = mode;
      missionState.consensusMode = mode;
      if (mode === 'pos') {
        consensusComparison.setActive(false);
        finalitySimulator.setActive(false);
        mergeSimulation.setActive(false);
        consensusPoS.setActive(true);
      } else if (mode === 'pow') {
        consensusComparison.setActive(false);
        finalitySimulator.setActive(false);
        mergeSimulation.setActive(false);
        consensusPoS.setActive(false);
      } else if (mode === 'compare') {
        consensusPoS.setActive(false);
        mergeSimulation.setActive(false);
        if (compareSubView === 'finality') {
          consensusComparison.setActive(false);
          finalitySimulator.setActive(true);
        } else {
          finalitySimulator.setActive(false);
          consensusComparison.setActive(true);
        }
      } else if (mode === 'merge') {
        consensusPoS.setActive(false);
        consensusComparison.setActive(false);
        finalitySimulator.setActive(false);
        mergeSimulation.setActive(true);
      }
      renderLabUI();
      notifyState();
    }

    this.setConsensusMode = setConsensusMode;

    const diffLabels = {
      1: "1 Zero ('0') — ~16 Hashes",
      2: "2 Zeros ('00') — ~256 Hashes",
      3: "3 Zeros ('000') — ~4,096 Hashes",
      4: "4 Zeros ('0000') — ~65,536 Hashes",
      5: "5 Zeros ('00000') — ~1,048,576 Hashes"
    };

    eventBus.on('POS_BLOCK_FINALIZED', (slotSummary) => {
      missionState.hasFinalizedPoSBlock = true;
      notifyState();
    });

    eventBus.on('MINING_SUCCESS', ({ block, stats, retarget }) => {
      if (!missionState.minedDifficulties.includes(stats.difficulty)) {
        missionState.minedDifficulties.push(stats.difficulty);
      }
      if (retarget && retarget.adjusted) {
        missionState.hasTriggeredRetarget = true;
      }
      missionState.totalMined++;
      notifyState();
      renderLabUI();
    });

    eventBus.on('DIFFICULTY_RETARGETED', ({ newDiff }) => {
      missionState.hasTriggeredRetarget = true;
      currentDifficulty = newDiff;
      notifyState();
      const slider = document.getElementById('input-diff-slider');
      if (slider) slider.value = newDiff;
      const labelText = document.getElementById('diff-label-text');
      if (labelText) labelText.textContent = diffLabels[newDiff];
      updateRetargetChart();
    });

    eventBus.on('POS_DELEGATION_CREATED', () => {
      if (consensusMode === 'pos') renderPoSLabUI();
    });
    eventBus.on('DELEGATOR_REWARD_EARNED', () => {
      if (consensusMode === 'pos') renderPoSLabUI();
    });
    eventBus.on('DELEGATION_SLASHED', () => {
      if (consensusMode === 'pos') renderPoSLabUI();
    });
    eventBus.on('POS_STAKES_UPDATED', () => {
      if (consensusMode === 'pos') renderPoSLabUI();
    });
    eventBus.on('POS_BATCH_SIMULATION_COMPLETED', () => {
      if (consensusMode === 'pos') renderPoSLabUI();
    });

    eventBus.on('COMPARE_TRANSACTIONS_BROADCAST', () => {
      if (consensusMode === 'compare') renderSplitScreenLabUI();
    });
    eventBus.on('COMPARE_STATE_UPDATED', () => {
      if (consensusMode === 'compare') renderSplitScreenLabUI();
    });
    eventBus.on('COMPARE_POW_ATTACK_TOGGLED', () => {
      if (consensusMode === 'compare') renderSplitScreenLabUI();
    });
    eventBus.on('COMPARE_POS_ATTACK_TOGGLED', () => {
      if (consensusMode === 'compare') renderSplitScreenLabUI();
    });
    eventBus.on('COMPARE_STATE_RESET', () => {
      if (consensusMode === 'compare') renderSplitScreenLabUI();
    });

    eventBus.on('FINALITY_POW_UPDATED', () => {
      if (consensusMode === 'compare' && compareSubView === 'finality') renderSplitScreenLabUI();
    });
    eventBus.on('FINALITY_POS_UPDATED', () => {
      if (consensusMode === 'compare' && compareSubView === 'finality') renderSplitScreenLabUI();
    });
    eventBus.on('FINALITY_POW_FORK_ANIMATED', () => {
      if (consensusMode === 'compare' && compareSubView === 'finality') renderSplitScreenLabUI();
    });
    eventBus.on('FINALITY_POS_FORK_ANIMATED', () => {
      if (consensusMode === 'compare' && compareSubView === 'finality') renderSplitScreenLabUI();
    });
    eventBus.on('FINALITY_RESET', () => {
      if (consensusMode === 'compare' && compareSubView === 'finality') renderSplitScreenLabUI();
    });

    eventBus.on('MERGE_BLOCK_ADVANCED', () => {
      if (consensusMode === 'merge') renderMergeLabUI();
    });
    eventBus.on('THE_MERGE_TRIGGERED', () => {
      if (consensusMode === 'merge') renderMergeLabUI();
    });
    eventBus.on('DIFFICULTY_BOMB_TICKED', () => {
      if (consensusMode === 'merge') renderMergeLabUI();
    });
    eventBus.on('MERGE_SIM_RESET', () => {
      if (consensusMode === 'merge') renderMergeLabUI();
    });
    eventBus.on('MERGE_AUTORUN_STARTED', () => {
      if (consensusMode === 'merge') renderMergeLabUI();
    });
    eventBus.on('MERGE_AUTORUN_STOPPED', () => {
      if (consensusMode === 'merge') renderMergeLabUI();
    });

    function renderLabUI() {
      if (consensusMode === 'compare') {
        renderSplitScreenLabUI();
        return;
      }
      if (consensusMode === 'pos') {
        renderPoSLabUI();
        return;
      }
      renderPoWLabUI();
    }

    function renderPoWLabUI() {
      consensusPoS.setActive(false);
      const candidate = blockchain.candidateBlock || blockchain.getLatestBlock();
      const netInfo = minerEngine.getNetworkHashrate(currentDifficulty);
      const targetPrefix = '0'.repeat(currentDifficulty);

      container.innerHTML = `
        <!-- CONSENSUS SELECTOR TABS -->
        <div style="display: flex; gap: 4px; margin-bottom: 12px; background: rgba(0,0,0,0.4); padding: 4px; border-radius: 6px; border: 1px solid var(--border-subtle);">
          <button id="btn-mode-pow" class="hud-btn primary" style="flex: 1; justify-content: center; font-size: 9.5px; padding: 6px 2px;">
            ⛏️ PoW
          </button>
          <button id="btn-mode-pos" class="hud-btn" style="flex: 1; justify-content: center; font-size: 9.5px; padding: 6px 2px;">
            🌱 PoS
          </button>
          <button id="btn-mode-compare" class="hud-btn" style="flex: 1; justify-content: center; font-size: 9.5px; padding: 6px 2px;">
            ⚖️ Compare
          </button>
          <button id="btn-mode-merge" class="hud-btn" style="flex: 1; justify-content: center; font-size: 9.5px; padding: 6px 2px; color: #ffd700;">
            🐼 The Merge
          </button>
        </div>

        <!-- PROOF OF WORK RIG STATUS -->
        <div class="theory-card" style="margin-bottom: 12px; background: linear-gradient(145deg, #1f1a0a, #110e05); border-color: var(--accent-amber);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 6px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <strong style="color: var(--accent-amber); font-size: 11px;">⛏️ PROOF OF WORK MINING RIG</strong>
              <button class="btn-explain" data-explain="ch4_mine_btn" title="Explain Mining">ℹ️ Explain</button>
            </div>
            <span id="rig-status-badge" class="badge-label" style="background: ${minerEngine.isMining ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 183, 3, 0.2)'}; color: ${minerEngine.isMining ? 'var(--accent-green)' : 'var(--accent-amber)'}; font-size: 9px;">
              ${minerEngine.isMining ? '⚡ HASHING ACTIVE' : 'RIG IDLE'}
            </span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 10.5px; margin-bottom: 8px;">
            <div style="background: rgba(0,0,0,0.3); padding: 5px 8px; border-radius: 4px;">
              <span style="color: #94a3b8;">Mining Speed:</span><br>
              <strong id="live-hashrate" style="color: var(--accent-cyan); font-family: var(--font-mono);">${minerEngine.hashRate > 0 ? `${minerEngine.hashRate.toLocaleString()} H/s` : 'IDLE'}</strong>
            </div>
            <div style="background: rgba(0,0,0,0.3); padding: 5px 8px; border-radius: 4px;">
              <span style="color: #94a3b8;">Elapsed Time:</span><br>
              <strong id="live-elapsed" style="color: #fff; font-family: var(--font-mono);">0.00s</strong>
            </div>
            <div style="background: rgba(0,0,0,0.3); padding: 5px 8px; border-radius: 4px;">
              <span style="color: #94a3b8;">Hash Attempts:</span><br>
              <strong id="live-attempts" style="color: var(--accent-amber); font-family: var(--font-mono);">0</strong>
            </div>
            <div style="background: rgba(0,0,0,0.3); padding: 5px 8px; border-radius: 4px;">
              <span style="color: #94a3b8;">Block Subsidy:</span><br>
              <strong style="color: var(--accent-green); font-family: var(--font-mono);">+50.0 QUEST</strong>
            </div>
          </div>

          <!-- BEST HASH PREVIEW -->
          <div style="background: rgba(0,0,0,0.4); border: 1px solid rgba(255, 255, 255, 0.08); padding: 6px 8px; border-radius: 4px; font-family: var(--font-mono); font-size: 10px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; color: #94a3b8; margin-bottom: 2px;">
              <span>CURRENT BEST HASH:</span>
              <span id="live-best-zeros" style="color: var(--accent-amber); font-weight: bold;">0 / ${currentDifficulty} zeros</span>
            </div>
            <div id="live-best-hash" style="color: var(--accent-cyan); word-break: break-all; font-size: 9.5px;">
              ${minerEngine.currentBestHash ? minerEngine.currentBestHash : 'None tested yet'}
            </div>
          </div>

          <!-- GLOBAL NETWORK HASHRATE BAR -->
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; margin-bottom: 3px;">
              <span>GLOBAL NETWORK HASHRATE:</span>
              <strong id="live-net-hash" style="color: var(--accent-cyan); font-family: var(--font-mono);">${netInfo.str}</strong>
            </div>
            <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; position: relative;">
              <div id="live-net-share-fill" style="width: 2%; height: 100%; background: linear-gradient(90deg, var(--accent-cyan), var(--accent-green)); border-radius: 3px; transition: width 0.3s ease;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 9px; color: var(--text-muted); margin-top: 2px;">
              <span>Your Rig Share: <strong id="live-net-share" style="color: #fff;">0.01%</strong></span>
              <span>Target: <strong style="color: var(--accent-amber);">${targetPrefix}</strong></span>
            </div>
          </div>

          <!-- ENERGY CONSUMPTION METER -->
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; margin-bottom: 3px;">
              <span>THERMODYNAMIC ENERGY METER:</span>
              <strong id="live-energy-text" style="color: var(--accent-green); font-family: var(--font-mono);">0.00 J (0.0000 Wh)</strong>
            </div>
            <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
              <div id="live-energy-fill" style="width: 2%; height: 100%; background: var(--accent-green); border-radius: 3px; transition: width 0.3s ease, background-color 0.3s ease;"></div>
            </div>
          </div>
        </div>

        <!-- BITCOIN DIFFICULTY RETARGETING SIMULATOR -->
        <div class="theory-card" style="margin-bottom: 12px; background: linear-gradient(145deg, #0e1726, #070b14); border-color: var(--accent-cyan);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 6px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <strong style="color: var(--accent-cyan); font-size: 11px;">📊 AUTO DIFFICULTY RETARGETING SIMULATOR</strong>
              <button class="btn-explain" data-explain="ch4_retarget" title="Explain Difficulty Adjustment">ℹ️ Explain</button>
            </div>
            <button id="btn-toggle-autoretarget" class="badge-label" style="background: ${difficultyAdjuster.autoAdjustEnabled ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 255, 255, 0.1)'}; color: ${difficultyAdjuster.autoAdjustEnabled ? 'var(--accent-green)' : '#94a3b8'}; border: 1px solid ${difficultyAdjuster.autoAdjustEnabled ? 'var(--accent-green)' : 'rgba(255,255,255,0.2)'}; cursor: pointer; font-size: 9px; padding: 2px 6px;">
              ${difficultyAdjuster.autoAdjustEnabled ? '● AUTO RETARGET: ON' : '○ AUTO RETARGET: OFF'}
            </button>
          </div>

          <!-- RETARGET STATS ROW -->
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; font-size: 10px; margin-bottom: 8px;">
            <div style="background: rgba(0,0,0,0.3); padding: 5px 6px; border-radius: 4px;">
              <span style="color: #94a3b8;">Target Cadence:</span><br>
              <strong style="color: var(--accent-cyan); font-family: var(--font-mono);">5.00s / block</strong>
            </div>
            <div style="background: rgba(0,0,0,0.3); padding: 5px 6px; border-radius: 4px;">
              <span style="color: #94a3b8;">10-Block Avg:</span><br>
              <strong id="live-retarget-avg" style="color: #fff; font-family: var(--font-mono);">${difficultyAdjuster.getAverageBlockTime(10)}s</strong>
            </div>
            <div style="background: rgba(0,0,0,0.3); padding: 5px 6px; border-radius: 4px;">
              <span style="color: #94a3b8;">Next Retarget:</span><br>
              <strong id="live-blocks-to-retarget" style="color: var(--accent-amber); font-family: var(--font-mono);">${difficultyAdjuster.blocksSinceRetarget} / ${difficultyAdjuster.retargetWindow} blks</strong>
            </div>
          </div>

          <!-- HASHRATE MODIFIER CONTROLS -->
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 9.5px; color: #94a3b8; margin-bottom: 4px;">
              <span>SIMULATE HASHRATE SHIFTS:</span>
              <span id="active-hashrate-label" style="color: var(--accent-cyan); font-weight: bold;">${difficultyAdjuster.getHashrateLabel()}</span>
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px;">
              <button id="btn-hashrate-02" class="hud-btn hashrate-btn ${difficultyAdjuster.hashrateMultiplier === 0.2 ? 'primary' : ''}" style="font-size: 9px; padding: 4px 2px; justify-content: center;" title="Miners shut down rigs: hashrate drops 80%">
                0.2x Crash 📉
              </button>
              <button id="btn-hashrate-10" class="hud-btn hashrate-btn ${difficultyAdjuster.hashrateMultiplier === 1.0 ? 'primary' : ''}" style="font-size: 9px; padding: 4px 2px; justify-content: center;" title="Baseline network hashrate">
                1.0x Normal ⚖️
              </button>
              <button id="btn-hashrate-30" class="hud-btn hashrate-btn ${difficultyAdjuster.hashrateMultiplier === 3.0 ? 'primary' : ''}" style="font-size: 9px; padding: 4px 2px; justify-content: center;" title="Mining pools join: 3x hashing power">
                3.0x Pool ⚡
              </button>
              <button id="btn-hashrate-50" class="hud-btn hashrate-btn ${difficultyAdjuster.hashrateMultiplier === 5.0 ? 'primary' : ''}" style="font-size: 9px; padding: 4px 2px; justify-content: center;" title="Next-gen ASIC rigs deploy: 5x hashing power">
                5.0x ASIC 🚀
              </button>
            </div>
          </div>

          <!-- LIVE SVG LINE CHART -->
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 9.5px; color: #94a3b8; margin-bottom: 2px;">
              <span>SOLVE TIME & DIFFICULTY OVER TIME:</span>
              <button id="btn-open-retarget-modal" class="hud-btn" style="font-size: 8.5px; padding: 1px 5px; color: var(--accent-amber);" title="View Retarget Rules">⚖️ Rules</button>
            </div>
            <div id="retarget-chart-container">
              ${difficultyAdjuster.renderSVGChart(380, 130)}
            </div>
          </div>
        </div>

        <!-- DIFFICULTY SLIDER 1 TO 5 -->
        <div class="lab-field-group">
          <div class="lab-field-label">
            <span>DIFFICULTY TARGET SLIDER (1–5 ZEROS)</span>
            <div style="display: flex; align-items: center; gap: 6px;">
              <strong id="diff-label-text" style="color: var(--accent-amber); font-family: var(--font-mono);">${diffLabels[currentDifficulty]}</strong>
              <button class="btn-explain" data-explain="ch4_difficulty_slider" title="Explain Difficulty">ℹ️ Explain</button>
            </div>
          </div>
          <input type="range" id="input-diff-slider" min="1" max="5" step="1" value="${currentDifficulty}" style="width: 100%; accent-color: var(--accent-amber); cursor: pointer;" />
          <div style="display: flex; justify-content: space-between; font-size: 9.5px; color: var(--text-muted); margin-top: 2px; font-family: var(--font-mono);">
            <span>1 ('0')</span>
            <span>2 ('00')</span>
            <span>3 ('000')</span>
            <span>4 ('0000')</span>
            <span>5 ('00000')</span>
          </div>
        </div>

        <!-- CANDIDATE BLOCK DETAILS (ALL 6 FIELDS) -->
        <div class="lab-field-group" style="margin-top: 14px;">
          <div class="lab-field-label">
            <span>CANDIDATE BLOCK DATA STRUCTURE</span>
            <span class="badge-label" style="background: rgba(0, 240, 255, 0.15); color: var(--accent-cyan);">6 INVARIANTS</span>
          </div>
          <div style="background: rgba(0,0,0,0.5); padding: 10px; border-radius: 6px; font-family: var(--font-mono); font-size: 10px; border: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 5px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">1. Index:</span>
              <strong style="color: #fff;">Block #${candidate ? candidate.index : 1}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">2. Data:</span>
              <span style="color: var(--accent-green); max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${candidate ? candidate.getSummary() : 'Coinbase Subsidy'}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">3. PrevHash:</span>
              <span style="color: #94a3b8;">${candidate && candidate.previousHash ? candidate.previousHash.substring(0, 16) + '...' : '0000...0000'}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">4. Nonce (Variable):</span>
              <strong id="telemetry-nonce" style="color: var(--accent-cyan);">${candidate ? candidate.nonce.toLocaleString() : 0}</strong>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">5. Difficulty:</span>
              <strong style="color: var(--accent-amber);">${currentDifficulty} leading zeros ('${targetPrefix}')</strong>
            </div>
            <div style="border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 4px; margin-top: 2px;">
              <span style="color: #64748b;">6. Current SHA-256 Digest:</span>
              <div id="telemetry-hash" style="color: #a5b4fc; word-break: break-all; margin-top: 2px; font-size: 9.5px;">${candidate ? candidate.hash : '—'}</div>
            </div>
          </div>
        </div>

        <!-- ACTION BUTTONS -->
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 14px;">
          <button id="btn-toggle-mine" class="action-btn primary-action" style="background: var(--accent-amber); color: #000; font-weight: bold;">
            <span class="btn-text">${minerEngine.isMining ? '⏹ Stop Mining Rig' : '⛏️ Mine Candidate Block'}</span>
            <span class="btn-subtext" style="color: rgba(0,0,0,0.7);">${minerEngine.isMining ? 'Halt active hash exploration' : 'Burn Web Crypto cycles searching for winning nonce'}</span>
          </button>

          <button id="btn-verify-proof" class="action-btn" style="background: rgba(0, 240, 255, 0.1); border: 1px solid var(--accent-cyan); color: var(--accent-cyan);">
            <span class="btn-text">🔍 Verify Proof-of-Work (Instant O(1))</span>
            <span class="btn-subtext">Prove it is hard to find but trivial for peers to verify</span>
          </button>
        </div>
      `;

      attachLabListeners();
    }

    function attachLabListeners() {
      // Consensus mode switch to PoS
      document.getElementById('btn-mode-pos')?.addEventListener('click', () => {
        setConsensusMode('pos');
        Toast.show("Consensus Switched 🌱", "Proof of Stake (PoS) Validator Console activated.", "success", 3000);
      });

      // Consensus mode switch to Split-Screen Compare
      document.getElementById('btn-mode-compare')?.addEventListener('click', () => {
        setConsensusMode('compare');
        Toast.show("Split-Screen Simulator ⚖️", "Comparing PoW vs PoS across identical transaction streams.", "info", 3000);
      });

      // Consensus mode switch to The Merge
      document.getElementById('btn-mode-merge')?.addEventListener('click', () => {
        setConsensusMode('merge');
        Toast.show("The Merge (2022) 🐼", "Simulate Ethereum's historic swap from PoW to PoS at Block 15,537,394.", "success", 4000);
      });

      // Difficulty slider
      const slider = document.getElementById('input-diff-slider');
      slider?.addEventListener('input', (e) => {
        currentDifficulty = parseInt(e.target.value, 10);
        minerEngine.setDifficulty(currentDifficulty);
        const labelText = document.getElementById('diff-label-text');
        if (labelText) labelText.textContent = diffLabels[currentDifficulty];

        const netInfo = minerEngine.getNetworkHashrate(currentDifficulty);
        const netHashEl = document.getElementById('live-net-hash');
        if (netHashEl) netHashEl.textContent = netInfo.str;
      });

      // Mine toggle button
      document.getElementById('btn-toggle-mine')?.addEventListener('click', async () => {
        if (minerEngine.isMining) {
          minerEngine.stopMining();
          renderLabUI();
        } else {
          minerEngine.setDifficulty(currentDifficulty);
          renderLabUI();
          try {
            await blockchain.mineNextBlock();
          } catch (err) {
            console.warn(err);
          }
        }
      });

      // Verify proof button
      document.getElementById('btn-verify-proof')?.addEventListener('click', () => {
        const latest = blockchain.getLatestBlock();
        const valid = latest.isValid();
        missionState.hasVerifiedProof = true;
        notifyState();

        if (valid) {
          Toast.show(
            "Proof Verified Instantly! ⚡",
            `Block #${latest.index} satisfies target '${'0'.repeat(latest.difficulty || 2)}'. Validated in <0.01ms with 1 SHA-256 calculation!`,
            "success",
            5000
          );
        } else {
          Toast.show("Verification Warning", "Candidate block has not met target difficulty yet.", "warning");
        }
      });

      // Auto-retarget toggle button
      document.getElementById('btn-toggle-autoretarget')?.addEventListener('click', () => {
        difficultyAdjuster.setAutoAdjust(!difficultyAdjuster.autoAdjustEnabled);
        renderLabUI();
        Toast.show(
          difficultyAdjuster.autoAdjustEnabled ? "Auto-Retargeting Active ✅" : "Auto-Retargeting Paused ⏸",
          difficultyAdjuster.autoAdjustEnabled 
            ? "Protocol will automatically adjust difficulty every 5 blocks to maintain 5.0s target."
            : "Difficulty is now locked to manual slider controls.",
          "info",
          3500
        );
      });

      // Hashrate modifier buttons
      const bindHashrate = (id, mult) => {
        document.getElementById(id)?.addEventListener('click', () => {
          difficultyAdjuster.setHashrateMultiplier(mult);
          document.querySelectorAll('.hashrate-btn').forEach(b => b.classList.remove('primary'));
          document.getElementById(id)?.classList.add('primary');
          const labelEl = document.getElementById('active-hashrate-label');
          if (labelEl) labelEl.textContent = difficultyAdjuster.getHashrateLabel(mult);
          Toast.show(
            "Hashrate Shift Simulated! ⚡",
            `${difficultyAdjuster.getHashrateLabel(mult)}: Nonce testing speed multiplied by ${mult}x.`,
            "info",
            3000
          );
        });
      };
      bindHashrate('btn-hashrate-02', 0.2);
      bindHashrate('btn-hashrate-10', 1.0);
      bindHashrate('btn-hashrate-30', 3.0);
      bindHashrate('btn-hashrate-50', 5.0);

      // Open Retarget rules modal
      document.getElementById('btn-open-retarget-modal')?.addEventListener('click', () => {
        eventBus.emit('SHOW_RETARGET_MODAL');
      });
    }

    function updateRetargetChart() {
      const chartBox = document.getElementById('retarget-chart-container');
      if (chartBox) {
        chartBox.innerHTML = difficultyAdjuster.renderSVGChart(380, 130);
      }
      const avgEl = document.getElementById('live-retarget-avg');
      if (avgEl) {
        avgEl.textContent = `${difficultyAdjuster.getAverageBlockTime(10)}s`;
      }
      const blksEl = document.getElementById('live-blocks-to-retarget');
      if (blksEl) {
        blksEl.textContent = `${difficultyAdjuster.blocksSinceRetarget} / ${difficultyAdjuster.retargetWindow} blks`;
      }
    }

    eventBus.on('BLOCK_TIME_RECORDED', () => {
      updateRetargetChart();
    });

    eventBus.on('HASHRATE_MODIFIER_CHANGED', ({ multiplier }) => {
      const multId = multiplier <= 0.3 ? 'btn-hashrate-02' : (multiplier <= 1.2 ? 'btn-hashrate-10' : (multiplier <= 3.5 ? 'btn-hashrate-30' : 'btn-hashrate-50'));
      document.querySelectorAll('.hashrate-btn').forEach(b => b.classList.remove('primary'));
      document.getElementById(multId)?.classList.add('primary');
      const labelEl = document.getElementById('active-hashrate-label');
      if (labelEl) labelEl.textContent = difficultyAdjuster.getHashrateLabel(multiplier);
    });

    // High-frequency telemetry listener (updating DOM nodes directly without innerHTML thrash)
    eventBus.on('MINING_PROGRESS', ({
      attempts,
      elapsedSec,
      hashRate,
      currentNonce,
      currentHash,
      currentBestHash,
      bestLeadingZeros,
      joulesBurned,
      wattHours,
      networkSharePercent
    }) => {
      const nonceEl = document.getElementById('telemetry-nonce');
      const hashEl = document.getElementById('telemetry-hash');
      const rateEl = document.getElementById('live-hashrate');
      const elapsedEl = document.getElementById('live-elapsed');
      const attemptsEl = document.getElementById('live-attempts');
      const bestHashEl = document.getElementById('live-best-hash');
      const bestZerosEl = document.getElementById('live-best-zeros');
      const energyTextEl = document.getElementById('live-energy-text');
      const energyFillEl = document.getElementById('live-energy-fill');
      const shareTextEl = document.getElementById('live-net-share');
      const shareFillEl = document.getElementById('live-net-share-fill');

      if (nonceEl) nonceEl.textContent = currentNonce.toLocaleString();
      if (hashEl) hashEl.textContent = currentHash;
      if (rateEl) rateEl.textContent = `${hashRate.toLocaleString()} H/s`;
      if (elapsedEl) elapsedEl.textContent = `${elapsedSec}s`;
      if (attemptsEl) attemptsEl.textContent = attempts.toLocaleString();

      if (bestHashEl) bestHashEl.textContent = currentBestHash;
      if (bestZerosEl) bestZerosEl.textContent = `${bestLeadingZeros} / ${currentDifficulty} zeros`;

      if (energyTextEl) {
        energyTextEl.textContent = `${joulesBurned.toLocaleString()} J (${wattHours.toFixed(4)} Wh)`;
      }
      if (energyFillEl) {
        // Energy fill scales: 1,000 Joules is 100% of standard gauge
        const energyPct = Math.min(100, (joulesBurned / 500) * 100);
        energyFillEl.style.width = `${Math.max(2, energyPct)}%`;
        if (joulesBurned > 250) {
          energyFillEl.style.backgroundColor = 'var(--accent-red)';
          if (energyTextEl) energyTextEl.style.color = 'var(--accent-red)';
        } else if (joulesBurned > 50) {
          energyFillEl.style.backgroundColor = 'var(--accent-amber)';
          if (energyTextEl) energyTextEl.style.color = 'var(--accent-amber)';
        } else {
          energyFillEl.style.backgroundColor = 'var(--accent-green)';
          if (energyTextEl) energyTextEl.style.color = 'var(--accent-green)';
        }
      }

      if (shareTextEl) shareTextEl.textContent = `${networkSharePercent}%`;
      if (shareFillEl) shareFillEl.style.width = `${Math.max(2, Math.min(100, networkSharePercent))}%`;
    });

    
    function renderPoSLabUI() {
      consensusPoS.setActive(true);
      const pVal = consensusPoS.getPlayerValidator();
      const isPlayerActive = pVal && pVal.status === 'active' && pVal.stake > 0;
      const isPlayerUnbonding = pVal && pVal.status === 'unbonding';
      const totalStake = consensusPoS.getTotalActiveStake();

      container.innerHTML = `
        <!-- CONSENSUS SELECTOR TABS -->
        <div style="display: flex; gap: 4px; margin-bottom: 12px; background: rgba(0,0,0,0.4); padding: 4px; border-radius: 6px; border: 1px solid var(--border-subtle);">
          <button id="btn-mode-pow" class="hud-btn" style="flex: 1; justify-content: center; font-size: 9.5px; padding: 6px 2px;">
            ⛏️ PoW
          </button>
          <button id="btn-mode-pos" class="hud-btn primary" style="flex: 1; justify-content: center; font-size: 9.5px; padding: 6px 2px;">
            🌱 PoS
          </button>
          <button id="btn-mode-compare" class="hud-btn" style="flex: 1; justify-content: center; font-size: 9.5px; padding: 6px 2px;">
            ⚖️ Compare
          </button>
          <button id="btn-mode-merge" class="hud-btn" style="flex: 1; justify-content: center; font-size: 9.5px; padding: 6px 2px; color: #ffd700;">
            🐼 The Merge
          </button>
        </div>

        <!-- 1. PLAYER STAKING PANEL -->
        <div class="theory-card" style="margin-bottom: 12px; background: linear-gradient(145deg, #0e201b, #05100c); border-color: var(--accent-green);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 6px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <strong style="color: var(--accent-green); font-size: 11px;">🥩 VALIDATOR STAKING PANEL</strong>
              <button class="btn-explain" data-explain="pos_staking" title="Explain PoS Staking">ℹ️ Explain</button>
            </div>
            <span class="badge-label" style="background: ${isPlayerActive ? 'rgba(0, 255, 136, 0.2)' : (isPlayerUnbonding ? 'rgba(255, 158, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)')}; color: ${isPlayerActive ? 'var(--accent-green)' : (isPlayerUnbonding ? '#ff9e00' : '#94a3b8')}; font-size: 9px;">
              ${isPlayerActive ? '● ACTIVE VALIDATOR' : (isPlayerUnbonding ? '⏳ UNBONDING (3 DAYS)' : '○ NOT STAKED')}
            </span>
          </div>

          <div style="display: flex; justify-content: space-between; font-size: 10.5px; margin-bottom: 8px; background: rgba(0,0,0,0.3); padding: 6px 8px; border-radius: 4px;">
            <span style="color: #94a3b8;">Available Wallet Funds:</span>
            <strong style="color: var(--accent-green); font-family: var(--font-mono);">${playerWallet.balance.toFixed(2)} QUEST</strong>
          </div>

          ${isPlayerUnbonding ? `
            <div style="background: rgba(255, 158, 0, 0.15); border: 1px solid #ff9e00; padding: 8px 10px; border-radius: 4px; font-size: 10.5px; color: #ff9e00; margin-bottom: 8px; line-height: 1.4;">
              <strong>⏳ Unbonding In Progress:</strong><br>
              Protocol security lock: <strong>${pVal.unbondingSlotsRemaining} game-days (slots)</strong> remaining before withdrawal unlocks. Capital cannot earn rewards or vote while unbonding.
            </div>
          ` : ''}

          <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px;">
            <div style="display: flex; gap: 6px; align-items: center;">
              <input type="number" id="input-stake-amount" class="tx-input" min="1" max="${Math.floor(playerWallet.balance)}" value="${Math.min(32, Math.floor(playerWallet.balance)) || 10}" style="flex: 1; padding: 6px 8px; font-size: 11px; font-family: var(--font-mono);" placeholder="Amount to stake..." />
              <div style="display: flex; gap: 4px;">
                <button class="hud-btn btn-stake-preset" data-val="16" style="font-size: 8.5px; padding: 3px 6px;">16</button>
                <button class="hud-btn btn-stake-preset" data-val="32" style="font-size: 8.5px; padding: 3px 6px;">32</button>
                <button class="hud-btn btn-stake-preset" data-val="max" style="font-size: 8.5px; padding: 3px 6px;">MAX</button>
              </div>
            </div>

            <div style="display: flex; gap: 6px;">
              <button id="btn-become-validator" class="action-btn primary-action" style="flex: 1; background: var(--accent-green); color: #000; font-weight: bold; justify-content: center; font-size: 11px; padding: 7px;">
                <span>${isPlayerActive ? '➕ Add to Stake' : '👑 Become Validator'}</span>
              </button>

              ${isPlayerActive ? `
                <button id="btn-request-unbond" class="action-btn" style="background: rgba(255, 158, 0, 0.15); border: 1px solid #ff9e00; color: #ff9e00; font-size: 10px; padding: 7px;" title="3 Game-Days Unbonding Period">
                  <span>🔓 Request Unstake</span>
                </button>
              ` : ''}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 9.5px;">
            <div style="background: rgba(0,0,0,0.3); padding: 4px 6px; border-radius: 4px;">
              <span style="color: #64748b;">Your Current Stake:</span><br>
              <strong style="color: var(--accent-cyan); font-family: var(--font-mono);">${pVal ? pVal.stake.toFixed(1) : '0.0'} QUEST</strong>
            </div>
            <div style="background: rgba(0,0,0,0.3); padding: 4px 6px; border-radius: 4px;">
              <span style="color: #64748b;">Earnings Accumulated:</span><br>
              <strong style="color: var(--accent-green); font-family: var(--font-mono);">+${pVal ? pVal.accumulatedRewards.toFixed(2) : '0.00'} QUEST</strong>
            </div>
          </div>
        </div>

        <!-- 1B. DELEGATED & LIQUID STAKING (LST) PANEL -->
        <div class="theory-card" style="margin-bottom: 12px; background: linear-gradient(145deg, #0d1e2e, #06101a); border-color: var(--accent-cyan);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0, 240, 255, 0.2); padding-bottom: 6px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <strong style="color: var(--accent-cyan); font-size: 11px;">🤝 DELEGATED STAKING & LIQUID TOKENS (LST)</strong>
              <button class="btn-explain" data-explain="pos_delegation" id="btn-explain-delegation" title="Explain Delegated Staking">ℹ️ Explain</button>
            </div>
            <span class="badge-label" style="background: rgba(0, 240, 255, 0.15); color: var(--accent-cyan); font-size: 8.5px;">
              LST PROTOCOL
            </span>
          </div>

          <div style="font-size: 10px; color: #cbd5e1; line-height: 1.4; margin-bottom: 8px;">
            Don't have 32 QUEST to run your own validator? <strong>Delegate</strong> any amount to active validators. You receive <strong>1:1 stQUEST</strong> (Liquid Staking Token), earn staking yield minus a 10% validator commission, and can trade your stQUEST instantly in DeFi!
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 10px; margin-bottom: 8px;">
            <div style="background: rgba(0,0,0,0.35); padding: 6px 8px; border-radius: 4px;">
              <span style="color: #94a3b8;">Your Liquid LST:</span><br>
              <strong style="color: var(--accent-cyan); font-family: var(--font-mono); font-size: 12px;">${(playerWallet.stQuestBalance || 0).toFixed(2)} stQUEST</strong>
            </div>
            <div style="background: rgba(0,0,0,0.35); padding: 6px 8px; border-radius: 4px;">
              <span style="color: #94a3b8;">Validator Commission:</span><br>
              <strong style="color: var(--accent-amber); font-family: var(--font-mono); font-size: 12px;">10% Fee (90% to You)</strong>
            </div>
          </div>

          <div style="display: flex; gap: 6px;">
            <button id="btn-open-delegation-explainer" class="hud-btn" style="flex: 1; justify-content: center; font-size: 10px; padding: 6px;">
              📖 How Delegated Staking Works
            </button>
            <button id="btn-goto-defi-amm" class="action-btn" style="flex: 1; justify-content: center; background: rgba(255, 0, 122, 0.2); border: 1px solid #ff007a; color: #ff007a; font-size: 10px; padding: 6px; font-weight: bold;" title="Trade stQUEST on Level 6 Uniswap AMM">
              🦄 Trade stQUEST in DeFi ➔
            </button>
          </div>
        </div>

        <!-- 2. BEACON ENGINE & RANDAO SLOT CONTROLS -->
        <div class="theory-card" style="margin-bottom: 12px; background: linear-gradient(145deg, #0e1726, #070b14); border-color: var(--accent-cyan);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 6px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <strong style="color: var(--accent-cyan); font-size: 11px;">⚙️ BEACON SLOT & PROPOSER ENGINE</strong>
            </div>
            <span class="badge-label" style="background: rgba(0, 240, 255, 0.15); color: var(--accent-cyan); font-size: 9px;">
              SLOT #${consensusPoS.currentSlot} • EPOCH #${consensusPoS.currentEpoch}
            </span>
          </div>

          <!-- RANDAO Entropy Mix & Proposer Info -->
          <div style="background: rgba(0,0,0,0.4); padding: 6px 8px; border-radius: 4px; font-family: var(--font-mono); font-size: 10px; margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
              <span style="color: #94a3b8;">RANDAO ENTROPY MIX:</span>
              <strong style="color: var(--accent-amber); font-size: 9.5px;">${consensusPoS.lastRngSeed}</strong>
            </div>
            <div style="font-size: 8.5px; color: #64748b; margin-bottom: 4px; background: rgba(0,0,0,0.3); padding: 3px 5px; border-radius: 3px; display: flex; justify-content: space-between;">
              <span>Mix<sub>s-1</sub>: <span style="color: #94a3b8;">${consensusPoS.lastRandaoStep?.prevMix || '0x000...'}</span></span>
              <span style="color: var(--accent-cyan); font-weight: bold;">⊕ XOR</span>
              <span>Reveal: <span style="color: #94a3b8;">${consensusPoS.lastRandaoStep?.reveal || '0x000...'}</span></span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #94a3b8;">ELECTED PROPOSER:</span>
              <strong style="color: ${consensusPoS.activeProposer?.isPlayer ? '#00ff88' : 'var(--accent-cyan)'};">
                ${consensusPoS.activeProposer ? `${consensusPoS.activeProposer.avatar} ${consensusPoS.activeProposer.name}` : 'Awaiting Next Slot...'}
              </strong>
            </div>
          </div>

          <!-- 2/3 Supermajority Attestation Gauge -->
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 9.5px; color: #94a3b8; margin-bottom: 3px;">
              <span>2/3 SUPERMAJORITY ATTESTATION:</span>
              <strong style="color: ${consensusPoS.supermajorityReached ? 'var(--accent-green)' : 'var(--accent-amber)'}; font-family: var(--font-mono);">
                ${consensusPoS.attestingStake.toFixed(1)} / ${totalStake.toFixed(1)} QUEST (${totalStake > 0 ? ((consensusPoS.attestingStake / totalStake) * 100).toFixed(0) : 0}%)
              </strong>
            </div>
            <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; position: relative;">
              <div style="position: absolute; left: 66.7%; width: 2px; height: 100%; background: #ff3366; z-index: 2;" title="66.7% Threshold"></div>
              <div style="width: ${totalStake > 0 ? Math.min(100, (consensusPoS.attestingStake / totalStake) * 100) : 0}%; height: 100%; background: ${consensusPoS.supermajorityReached ? 'var(--accent-green)' : 'var(--accent-cyan)'}; border-radius: 3px; transition: width 0.3s ease;"></div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 8.5px; color: var(--text-muted); margin-top: 2px;">
              <span>0%</span>
              <span style="color: #ff3366;">▲ 66.7% Supermajority Target</span>
              <span>100%</span>
            </div>
          </div>

          <!-- Slot Controls -->
          <div style="display: flex; gap: 6px; margin-bottom: 6px;">
            <button id="btn-advance-slot" class="action-btn primary-action" style="flex: 1; justify-content: center; background: var(--accent-cyan); color: #000; font-weight: bold; padding: 7px; font-size: 11px;">
              <span>⏩ Advance Slot</span>
            </button>
            <button id="btn-toggle-auto-slot" class="hud-btn ${consensusPoS.isAutoSlot ? 'primary' : ''}" style="font-size: 10px; padding: 7px 10px;">
              <span>${consensusPoS.isAutoSlot ? '⏸ Auto: ON' : '▶ Auto: OFF'}</span>
            </button>
          </div>

          <!-- Slashing Attack Simulations (3 Scenarios) -->
          <div style="margin-top: 8px; border-top: 1px solid rgba(255, 51, 102, 0.2); padding-top: 6px;">
            <div style="font-size: 9px; color: #ff3366; font-weight: bold; margin-bottom: 4px; display: flex; justify-content: space-between;">
              <span>🚨 SIMULATE PROTOCOL INFRACTIONS:</span>
              <span>CAUSE & EFFECT</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <button id="btn-slash-equivocation" class="action-btn" style="width: 100%; justify-content: space-between; background: rgba(255, 51, 102, 0.15); border: 1px solid var(--accent-red); color: var(--accent-red); font-size: 10px; padding: 5px 8px;" title="Double-Signing: 100% Stake Burn + Immediate Ejection">
                <span>⚔️ Equivocation (Double-Sign)</span>
                <span class="badge-label" style="background: rgba(255, 51, 102, 0.25); color: #fff; font-size: 8px;">100% BURN</span>
              </button>
              <button id="btn-slash-invalid" class="action-btn" style="width: 100%; justify-content: space-between; background: rgba(255, 183, 3, 0.12); border: 1px solid var(--accent-amber); color: var(--accent-amber); font-size: 10px; padding: 5px 8px;" title="Invalid Block: 25% Stake Burn + Ejection">
                <span>🚫 Invalid Block Proposal</span>
                <span class="badge-label" style="background: rgba(255, 183, 3, 0.25); color: #fff; font-size: 8px;">25% BURN</span>
              </button>
              <button id="btn-slash-liveness" class="action-btn" style="width: 100%; justify-content: space-between; background: rgba(148, 163, 184, 0.12); border: 1px solid #64748b; color: #94a3b8; font-size: 10px; padding: 5px 8px;" title="Liveness Failure: 10% Stake Burn + Inactive Ejection">
                <span>💤 Liveness Failure (Offline Leak)</span>
                <span class="badge-label" style="background: rgba(255, 255, 255, 0.1); color: #fff; font-size: 8px;">10% BURN</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 2B. RANDAO SELECTION PROBABILITY & 100-SLOT MONTE CARLO LAB -->
        <div class="theory-card" style="margin-bottom: 12px; background: linear-gradient(145deg, #16192b, #0a0c16); border-color: #8b5cf6;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(139, 92, 246, 0.25); padding-bottom: 6px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <strong style="color: #a78bfa; font-size: 11px;">🎲 PROPOSER SELECTION INTERNALS & STATS</strong>
              <button class="btn-explain" data-explain="pos_randao" id="btn-explain-randao" title="Explain RANDAO Selection">ℹ️ Explain</button>
            </div>
            <span class="badge-label" style="background: rgba(139, 92, 246, 0.2); color: #c4b5fd; font-size: 8.5px;">
              MONTE CARLO LAB
            </span>
          </div>

          <div style="font-size: 10px; color: #cbd5e1; line-height: 1.4; margin-bottom: 8px;">
            Each slot, a proposer is selected with probability: <code style="color: var(--accent-cyan);">P(val) = Stake / TotalActiveStake</code>.
            Adjust validator stakes with <strong style="color: var(--accent-green);">[-]</strong> and <strong style="color: var(--accent-green);">[+]</strong> to watch theoretical probabilities shift live, then simulate 100 slots to test the Law of Large Numbers!
          </div>

          <!-- Interactive Stake Adjuster & Live Probabilities Grid -->
          <div style="font-family: var(--font-mono); font-size: 9.5px; background: rgba(0,0,0,0.4); padding: 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06); margin-bottom: 10px;">
            <div style="font-weight: bold; color: #94a3b8; margin-bottom: 6px; display: flex; justify-content: space-between;">
              <span>VALIDATOR STAKE TUNER</span>
              <span>SELECTION PROBABILITY (P)</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px; max-height: 140px; overflow-y: auto;">
              ${consensusPoS.validators.filter(v => v.status === 'active' && v.stake > 0).map(val => {
                const prob = totalStake > 0 ? ((val.stake / totalStake) * 100).toFixed(1) : '0.0';
                return `
                  <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 3px 6px; border-radius: 3px;">
                    <div style="display: flex; align-items: center; gap: 4px;">
                      <span>${val.avatar}</span>
                      <span style="color: ${val.isPlayer ? 'var(--accent-green)' : '#fff'};">${val.name}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <div style="display: flex; gap: 2px;">
                        <button class="hud-btn btn-stake-tune" data-val-id="${val.id}" data-delta="-5" style="padding: 1px 5px; font-size: 8px;" title="Decrease Stake by 5">-5</button>
                        <button class="hud-btn btn-stake-tune" data-val-id="${val.id}" data-delta="5" style="padding: 1px 5px; font-size: 8px;" title="Increase Stake by 5">+5</button>
                      </div>
                      <span style="color: #ffb703; font-weight: bold; width: 48px; text-align: right;">${val.stake.toFixed(0)} Q</span>
                      <strong style="color: var(--accent-cyan); width: 44px; text-align: right;">${prob}%</strong>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Run 100-Slot Simulation Button -->
          <button id="btn-run-batch-sim" class="action-btn primary-action" style="width: 100%; justify-content: center; background: linear-gradient(90deg, #8b5cf6, #6366f1); color: #fff; font-weight: bold; padding: 7px; font-size: 11px; margin-bottom: 8px;">
            <span>⚡ Run 100 Simulated Slots (Actual vs. Expected)</span>
          </button>

          <!-- Simulation & Luck Meter Results (rendered if simulation ran) -->
          ${consensusPoS.lastBatchSimulation ? `
            <div style="background: rgba(0,0,0,0.5); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 4px; padding: 8px; font-family: var(--font-mono); font-size: 9.5px;">
              <!-- Network Variance Status -->
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 4px; margin-bottom: 6px;">
                <span style="color: #c4b5fd; font-weight: bold;">📊 100-SLOT BATCH RESULTS</span>
                <span style="color: ${consensusPoS.lastBatchSimulation.networkVarianceStatus === 'NORMAL' ? 'var(--accent-green)' : 'var(--accent-amber)'}; font-size: 8.5px;">
                  ${consensusPoS.lastBatchSimulation.networkVarianceLabel}
                </span>
              </div>

              <!-- Table Headers -->
              <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1.5fr; gap: 4px; color: #94a3b8; font-size: 8.5px; margin-bottom: 4px; border-bottom: 1px dashed rgba(255,255,255,0.06); padding-bottom: 2px;">
                <span>VALIDATOR</span>
                <span style="text-align: right;">EXPECTED</span>
                <span style="text-align: right;">ACTUAL</span>
                <span style="text-align: right;">LUCK METER</span>
              </div>

              <!-- Table Rows -->
              <div style="display: flex; flex-direction: column; gap: 3px; max-height: 160px; overflow-y: auto;">
                ${consensusPoS.lastBatchSimulation.validators.map(v => {
                  let luckColor = 'var(--accent-green)';
                  if (v.luckPercent > 120) luckColor = 'var(--accent-amber)';
                  else if (v.luckPercent < 80) luckColor = 'var(--accent-cyan)';

                  return `
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr 1.5fr; gap: 4px; align-items: center; background: rgba(255,255,255,0.02); padding: 2px 4px; border-radius: 2px;">
                      <span style="color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${v.avatar} ${v.name}</span>
                      <span style="text-align: right; color: #94a3b8;">${v.expected.toFixed(1)}</span>
                      <strong style="text-align: right; color: #fff;">${v.actual}</strong>
                      <div style="text-align: right;">
                        <span class="badge-label" style="background: rgba(255,255,255,0.08); color: ${luckColor}; font-size: 8px; padding: 1px 4px;">
                          ${v.luckPercent}% (${v.zScore > 0 ? '+' : ''}${v.zScore}σ)
                        </span>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : `
            <div style="text-align: center; padding: 8px; color: #64748b; font-size: 9.5px; font-style: italic;">
              Click 'Run 100 Simulated Slots' to evaluate actual proposer frequencies against mathematical expectations.
            </div>
          `}

          <button id="btn-open-randao-modal" class="hud-btn" style="width: 100%; justify-content: center; margin-top: 8px; font-size: 10px; color: #c4b5fd;">
            📖 Explain RANDAO & Verifiable Randomness
          </button>
        </div>

        <!-- 3. VALIDATOR LEADERBOARD (5-8 VALIDATORS) -->
        <div class="lab-field-group">
          <div class="lab-field-label">
            <span>ACTIVE VALIDATORS & SELECTION PROBABILITY</span>
            <span class="badge-label" style="background: rgba(255, 183, 3, 0.15); color: var(--accent-amber);">${consensusPoS.getActiveValidators().length} VALIDATORS</span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 5px; max-height: 240px; overflow-y: auto;">
            ${consensusPoS.validators.map(val => {
              const prob = totalStake > 0 && val.status === 'active' ? ((val.stake / totalStake) * 100).toFixed(1) : '0.0';
              const isProposer = consensusPoS.activeProposer?.id === val.id;
              const isSlashed = val.status === 'slashed';
              const isUnbonding = val.status === 'unbonding';
              const playerDel = val.delegations?.find(d => (d.delegatorAddress === playerWallet.address || d.isPlayer) && d.amount > 0);

              let borderColor = 'rgba(255,255,255,0.06)';
              if (isProposer) borderColor = 'var(--accent-amber)';
              else if (isSlashed) borderColor = 'var(--accent-red)';
              else if (val.isPlayer) borderColor = 'var(--accent-green)';
              else if (playerDel) borderColor = '#00f0ff';

              return `
                <div style="background: rgba(0,0,0,0.4); border: 1px solid ${borderColor}; border-radius: 4px; padding: 6px 8px; font-size: 10px; font-family: var(--font-mono);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                    <div style="display: flex; align-items: center; gap: 5px;">
                      <span>${val.avatar}</span>
                      <strong style="color: ${val.isPlayer ? 'var(--accent-green)' : '#fff'};">${val.name} ${val.isPlayer ? '(YOU)' : ''}</strong>
                      ${isProposer ? '<span style="color: var(--accent-amber); font-size: 8.5px; font-weight: bold;">👑 PROPOSER</span>' : ''}
                      ${!val.isPlayer ? `<span style="color: #94a3b8; font-size: 8px;">(10% Fee)</span>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 4px;">
                      ${(!val.isPlayer && val.status === 'active') ? `
                        <button class="hud-btn btn-delegate-to-val" data-val-id="${val.id}" data-val-name="${val.name}" style="font-size: 8px; padding: 2px 6px; background: rgba(0, 240, 255, 0.15); border-color: var(--accent-cyan); color: var(--accent-cyan); font-weight: bold; cursor: pointer;" title="Delegate coins to this validator">
                          🤝 Delegate
                        </button>
                      ` : ''}
                      <span class="badge-label" style="background: ${isSlashed ? 'rgba(255,51,102,0.2)' : (isUnbonding ? 'rgba(255,158,0,0.2)' : 'rgba(0,255,136,0.15)')}; color: ${isSlashed ? 'var(--accent-red)' : (isUnbonding ? '#ff9e00' : 'var(--accent-green)')}; font-size: 8px;">
                        ${val.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div style="display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; margin-bottom: 2px;">
                    <span>Stake: <strong style="color: ${isSlashed ? '#ff3366' : '#ffb703'};">${val.stake.toFixed(1)} QUEST</strong> ${val.delegatedStake > 0 ? `<span style="color: var(--accent-cyan); font-size: 8px;">(+${val.delegatedStake.toFixed(1)} Del)</span>` : ''}</span>
                    <span>Prob: <strong style="color: var(--accent-cyan);">${prob}%</strong></span>
                    <span>Uptime: ${val.uptime}%</span>
                  </div>

                  ${playerDel ? `
                    <div style="background: rgba(0, 240, 255, 0.1); border: 1px solid rgba(0, 240, 255, 0.25); border-radius: 3px; padding: 3px 6px; font-size: 8.5px; color: #cbd5e1; margin-bottom: 4px; display: flex; justify-content: space-between;">
                      <span style="color: var(--accent-cyan);">🤝 You Delegated: <strong>${playerDel.amount.toFixed(1)} Q</strong> (Minted: ${playerDel.lstMinted.toFixed(1)} stQ)</span>
                      <span style="color: var(--accent-green);">Yield: +${(playerDel.earnedRewards || 0).toFixed(2)} Q</span>
                    </div>
                  ` : ''}

                  <div style="height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; overflow: hidden;">
                    <div style="width: ${totalStake > 0 ? (val.stake / totalStake) * 100 : 0}%; height: 100%; background: ${isSlashed ? 'var(--accent-red)' : (val.isPlayer ? 'var(--accent-green)' : 'var(--accent-cyan)')}; border-radius: 2px;"></div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 4. CRIME & PUNISHMENT AUDIT LEDGER -->
        <div class="theory-card" style="margin-top: 10px; background: linear-gradient(145deg, #18080c, #0d0406); border-color: var(--accent-red);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 51, 102, 0.2); padding-bottom: 6px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <strong style="color: #ff3366; font-size: 11px;">📜 CRIME & PUNISHMENT AUDIT LEDGER</strong>
            </div>
            <span class="badge-label" style="background: rgba(255, 51, 102, 0.2); color: var(--accent-red); font-size: 9px;">
              ${consensusPoS.slashingLedger.length} INFRACTIONS
            </span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow-y: auto;">
            ${consensusPoS.slashingLedger.length === 0 ? `
              <div style="text-align: center; padding: 12px; color: #64748b; font-size: 10px; font-style: italic;">
                🛡️ No slashing infractions recorded. Honest validators secure the network.
              </div>
            ` : consensusPoS.slashingLedger.map(entry => `
              <div style="background: rgba(0,0,0,0.45); border: 1px solid rgba(255, 51, 102, 0.25); border-radius: 4px; padding: 6px 8px; font-size: 9.5px; font-family: var(--font-mono);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                  <span style="color: #ff3366; font-weight: bold;">${entry.offenseIcon} ${entry.offenseLabel}</span>
                  <span style="color: #64748b; font-size: 8.5px;">SLOT #${entry.slot}</span>
                </div>
                <div style="display: flex; justify-content: space-between; color: #cbd5e1; margin-bottom: 2px;">
                  <span>Offender: <strong style="color: #fff;">${entry.validator.avatar} ${entry.validator.name}</strong></span>
                  <span style="color: var(--accent-red); font-weight: bold;">-${entry.stakeBurned.toFixed(1)} Q (-${entry.penaltyPercent}%)</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 8.5px; color: #94a3b8; border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 3px; margin-top: 3px;">
                  <span>Stake: ${entry.stakeBefore.toFixed(1)} Q → <strong style="color: #ffb703;">${entry.stakeAfter.toFixed(1)} Q</strong></span>
                  <span>${entry.whistleblower ? `Whistleblower: <strong style="color: var(--accent-green);">${entry.whistleblower.avatar} ${entry.whistleblower.name} (+${entry.whistleblower.reward.toFixed(1)} Q)</strong>` : 'Automated Detection'}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 4. EDUCATIONAL MODAL BUTTON -->
        <button id="btn-view-pos-rules" class="hud-btn" style="width: 100%; justify-content: center; margin-top: 10px; font-size: 10.5px; padding: 6px; color: var(--accent-amber);" title="View Slashing Rules">
          ⚖️ View Proof of Stake Slashing Rules
        </button>

        <button id="btn-goto-pos-attacks" class="action-btn" style="width: 100%; justify-content: center; margin-top: 6px; font-size: 10px; padding: 6px; background: rgba(0, 240, 255, 0.12); border: 1px solid var(--accent-cyan); color: var(--accent-cyan);" title="Simulate Nothing-at-Stake and Long-Range Attacks in Defender Lab">
          ⚔️ Launch PoS Attack Vectors Lab (Nothing-at-Stake & Long-Range) ➔
        </button>
      `;

      attachPoSLabListeners();
    }

    function renderSplitScreenLabUI() {
      consensusPoS.setActive(false);

      if (compareSubView === 'finality') {
        consensusComparison.setActive(false);
        finalitySimulator.setActive(true);
      } else {
        finalitySimulator.setActive(false);
        consensusComparison.setActive(true);
      }

      const comp = consensusComparison;
      const pow = comp.powState;
      const pos = comp.posState;
      const metrics = comp.getMetricsComparison();

      const finSim = finalitySimulator;
      const powFin = finSim.powState;
      const posFin = finSim.posState;
      const posFinStatus = finSim.getPosStatus();

      container.innerHTML = `
        <!-- CONSENSUS SELECTOR TABS -->
        <div style="display: flex; gap: 4px; margin-bottom: 8px; background: rgba(0,0,0,0.4); padding: 4px; border-radius: 6px; border: 1px solid var(--border-subtle);">
          <button id="btn-mode-pow" class="hud-btn" style="flex: 1; justify-content: center; font-size: 9.5px; padding: 6px 2px;">
            ⛏️ PoW
          </button>
          <button id="btn-mode-pos" class="hud-btn" style="flex: 1; justify-content: center; font-size: 9.5px; padding: 6px 2px;">
            🌱 PoS
          </button>
          <button id="btn-mode-compare" class="hud-btn primary" style="flex: 1; justify-content: center; font-size: 9.5px; padding: 6px 2px;">
            ⚖️ Compare
          </button>
          <button id="btn-mode-merge" class="hud-btn" style="flex: 1; justify-content: center; font-size: 9.5px; padding: 6px 2px; color: #ffd700;">
            🐼 The Merge
          </button>
        </div>

        <!-- SPLIT-SCREEN SUB-VIEW SELECTOR -->
        <div style="display: flex; gap: 6px; margin-bottom: 12px; background: rgba(0,0,0,0.3); padding: 4px; border-radius: 6px; border: 1px solid var(--border-subtle);">
          <button id="btn-compare-view-txs" class="hud-btn ${compareSubView === 'txs' ? 'primary' : ''}" style="flex: 1; justify-content: center; font-size: 9.5px; padding: 5px 4px;">
            ⚡ Shared Tx Load & Metrics
          </button>
          <button id="btn-compare-view-finality" class="hud-btn ${compareSubView === 'finality' ? 'primary' : ''}" style="flex: 1; justify-content: center; font-size: 9.5px; padding: 5px 4px; border-color: ${compareSubView === 'finality' ? 'var(--accent-cyan)' : 'transparent'};">
            🔒 PoW vs PoS Finality & Forks
          </button>
        </div>

        ${compareSubView === 'finality' ? renderFinalityVisualizerSection(finSim, powFin, posFin, posFinStatus) : renderSharedTxsSection(comp, pow, pos, metrics)}
      `;

      attachSplitScreenListeners();
    }

    function renderFinalityVisualizerSection(finSim, powFin, posFin, posFinStatus) {
      const powProb = finSim.getPowReorgProbability();

      return `
        <!-- FINALITY HEADER & MODAL TRIGGER -->
        <div class="theory-card" style="margin-bottom: 12px; background: linear-gradient(145deg, #101c2e, #090e1a); border-color: var(--accent-cyan);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 6px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <strong style="color: var(--accent-cyan); font-size: 11px;">🔒 POW VS POS FINALITY & FORK SIMULATOR</strong>
              <button class="btn-explain" data-explain="consensus_finality" title="Explain Finality">ℹ️ Explain</button>
            </div>
            <button id="btn-open-finality-modal" class="hud-btn" style="font-size: 9.5px; padding: 3px 8px; background: rgba(0, 240, 255, 0.15); border-color: var(--accent-cyan); color: var(--accent-cyan);">
              🎓 Finality Invariant Modal
            </button>
          </div>
          <p style="font-size: 10px; color: #cbd5e1; margin-bottom: 8px; line-height: 1.4;">
            Experience the foundational trade-off: <strong>PoW Probabilistic Finality</strong> (Nakamoto longest-chain, risk decays exponentially with confirmations) vs <strong>PoS Deterministic Finality</strong> (Casper FFG 2-epoch checkpointing, irreversible without slashing 1/3 of all validators).
          </p>
        </div>

        <!-- SIDE-BY-SIDE FINALITY CONTROL PANELS -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
          <!-- LEFT: PoW Controls -->
          <div style="background: linear-gradient(145deg, #1f1a0a, #110e05); border: 1px solid #f59e0b; border-radius: 6px; padding: 8px 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid rgba(255, 183, 3, 0.2); padding-bottom: 4px;">
              <strong style="color: #f59e0b; font-size: 10px;">⛏️ POW PROBABILISTIC</strong>
              <span style="font-size: 8px; color: ${powFin.confirmations >= 6 ? '#10b981' : '#f59e0b'}; font-weight: bold;">
                ${powFin.confirmations} CONFS
              </span>
            </div>

            <!-- Confirmations Stepper -->
            <div style="background: rgba(0,0,0,0.3); padding: 6px 8px; border-radius: 4px; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; font-size: 9.5px; margin-bottom: 4px;">
                <span style="color: #94a3b8;">Confirmations:</span>
                <strong style="font-family: var(--font-mono); color: #fff;">${powFin.confirmations} Blocks</strong>
              </div>
              <div style="display: flex; gap: 4px;">
                <button id="btn-pow-conf-minus" class="hud-btn" style="flex: 1; justify-content: center; font-size: 9px; padding: 3px;">-1 Conf</button>
                <button id="btn-pow-conf-plus" class="hud-btn" style="flex: 1; justify-content: center; font-size: 9px; padding: 3px;">+1 Conf</button>
                <button id="btn-pow-conf-6" class="hud-btn primary" style="flex: 2; justify-content: center; font-size: 9px; padding: 3px;">6 Confs (BTC)</button>
              </div>
            </div>

            <!-- Reorg Risk Meter -->
            <div style="display: flex; flex-direction: column; gap: 3px; font-size: 9.5px; color: #cbd5e1; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Reorg Probability:</span>
                <strong style="font-family: var(--font-mono); color: ${powProb <= 1 ? '#10b981' : (powProb <= 20 ? '#f59e0b' : '#ff3366')};">
                  ${powProb}%
                </strong>
              </div>
              <div style="font-size: 8px; color: #94a3b8;">Formula: P ≈ (q/p)^k = (0.30/0.70)^${powFin.confirmations}</div>
            </div>

            <button id="btn-animate-pow-fork" class="hud-btn" style="width: 100%; justify-content: center; font-size: 9.5px; padding: 5px 6px; background: rgba(245, 158, 11, 0.2); border-color: #f59e0b; color: #fff;">
              ⚡ Animate PoW Fork & Longest-Chain
            </button>
          </div>

          <!-- RIGHT: PoS Controls -->
          <div style="background: linear-gradient(145deg, #091728, #050d18); border: 1px solid #00f0ff; border-radius: 6px; padding: 8px 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid rgba(0, 240, 255, 0.2); padding-bottom: 4px;">
              <strong style="color: #00f0ff; font-size: 10px;">🌱 POS DETERMINISTIC</strong>
              <span style="font-size: 8px; color: ${posFinStatus.badgeColor}; font-weight: bold;">
                ${posFinStatus.stage}
              </span>
            </div>

            <!-- Epochs Stepper -->
            <div style="background: rgba(0,0,0,0.3); padding: 6px 8px; border-radius: 4px; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; font-size: 9.5px; margin-bottom: 4px;">
                <span style="color: #94a3b8;">Epochs Elapsed:</span>
                <strong style="font-family: var(--font-mono); color: #fff;">${posFin.epochsElapsed} Epochs (${posFinStatus.timeElapsed})</strong>
              </div>
              <div style="display: flex; gap: 4px;">
                <button id="btn-pos-epoch-advance" class="hud-btn" style="flex: 1; justify-content: center; font-size: 9px; padding: 3px;">+1 Epoch</button>
                <button id="btn-pos-epoch-finalized" class="hud-btn primary" style="flex: 2; justify-content: center; font-size: 9px; padding: 3px;">Set Finalized (2 Epochs)</button>
              </div>
            </div>

            <!-- Slashing Invariant Readout -->
            <div style="display: flex; flex-direction: column; gap: 3px; font-size: 9.5px; color: #cbd5e1; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Reversion Cost:</span>
                <strong style="font-family: var(--font-mono); color: #00ff88;">>= 1/3 Stake ($32.0B)</strong>
              </div>
              <div style="font-size: 8px; color: #94a3b8;">Casper FFG: Irreversible without mass slashing</div>
            </div>

            <button id="btn-animate-pos-fork" class="hud-btn" style="width: 100%; justify-content: center; font-size: 9.5px; padding: 5px 6px; background: rgba(0, 240, 255, 0.2); border-color: #00f0ff; color: #fff;">
              ⚡ Animate PoS Fork & 1/3 Slashing
            </button>
          </div>
        </div>

        <!-- RESET FINALITY BUTTON -->
        <button id="btn-reset-finality-sim" class="hud-btn" style="width: 100%; justify-content: center; font-size: 9.5px; padding: 4px; margin-bottom: 12px; background: rgba(255, 255, 255, 0.04); border-color: rgba(255,255,255,0.15);">
          🔄 Reset Finality Chains to Default (2 Confs vs 2 Epochs Finalized)
        </button>

        <!-- Core Educational Axiom Quote Banner -->
        <div style="background: rgba(0, 240, 255, 0.08); border-left: 3px solid var(--accent-cyan); padding: 8px 12px; font-size: 10px; color: #cbd5e1; line-height: 1.45;">
          <strong style="color: #fff;">Finality Axiom:</strong> "PoW has probabilistic finality — the deeper a block, the safer. PoS has deterministic finality — after finalization, reversion is economically impossible."
        </div>
      `;
    }

    function renderSharedTxsSection(comp, pow, pos, metrics) {
      return `
        <!-- 1. SPLIT-SCREEN HEADER & THEORY TRIGGER -->
        <div class="theory-card" style="margin-bottom: 12px; background: linear-gradient(145deg, #101c2e, #090e1a); border-color: var(--accent-cyan);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 6px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <strong style="color: var(--accent-cyan); font-size: 11px;">⚖️ SPLIT-SCREEN CONSENSUS COMPARATOR</strong>
              <button class="btn-explain" data-explain="consensus_compare" title="Explain Comparison">ℹ️ Explain</button>
            </div>
            <button id="btn-open-compare-modal" class="hud-btn" style="font-size: 9.5px; padding: 3px 8px; background: rgba(0, 240, 255, 0.15); border-color: var(--accent-cyan); color: var(--accent-cyan);">
              🎓 Security Paradigms & Trade-offs
            </button>
          </div>
          <p style="font-size: 10px; color: #cbd5e1; margin-bottom: 8px; line-height: 1.4;">
            Broadcast an identical simulated transaction stream to both chains. Compare live metrics and trigger 51% attacks to observe how thermodynamic energy differs from locked capital security!
          </p>

          <!-- SHARED TRANSACTION GENERATOR CONTROLS -->
          <div style="background: rgba(0,0,0,0.3); padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06); margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 10px; color: #94a3b8; font-weight: bold;">SHARED TRANSACTION INGESTION:</span>
              <span class="badge-label" style="background: rgba(0, 240, 255, 0.15); color: var(--accent-cyan); font-size: 9px;">
                Pending in Mempools: <strong id="compare-pending-count">${comp.sharedPendingCount}</strong>
              </span>
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button id="btn-compare-send-5" class="hud-btn primary" style="flex: 1; min-width: 100px; justify-content: center; font-size: 10px; padding: 5px 8px;">
                ⚡ Send 5 Shared Txs
              </button>
              <button id="btn-compare-send-15" class="hud-btn" style="flex: 1; min-width: 100px; justify-content: center; font-size: 10px; padding: 5px 8px;">
                🚀 Send 15 Shared Txs
              </button>
              <button id="btn-compare-step" class="hud-btn" style="flex: 1; min-width: 90px; justify-content: center; font-size: 10px; padding: 5px 8px; background: rgba(0, 255, 136, 0.15); border-color: #00ff88; color: #00ff88;">
                ▶️ Step Chains
              </button>
              <button id="btn-compare-reset" class="hud-btn" style="flex: 1; min-width: 70px; justify-content: center; font-size: 10px; padding: 5px 6px;">
                🔄 Reset
              </button>
            </div>
          </div>
        </div>

        <!-- 2. SIDE-BY-SIDE CHAIN STATUS CARDS -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
          <!-- LEFT: PoW Status -->
          <div style="background: ${pow.attackActive ? 'linear-gradient(145deg, #2b1111, #160808)' : 'linear-gradient(145deg, #1f1a0a, #110e05)'}; border: 1px solid ${pow.attackActive ? '#ff3366' : '#f59e0b'}; border-radius: 6px; padding: 8px 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid rgba(255, 183, 3, 0.2); padding-bottom: 4px;">
              <strong style="color: #f59e0b; font-size: 10px;">⛏️ PROOF OF WORK</strong>
              <span style="font-size: 8px; color: ${pow.attackActive ? '#ff3366' : '#94a3b8'}; font-weight: bold;">
                ${pow.attackActive ? '🚨 51% REORG' : 'NORMAL'}
              </span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 3px; font-size: 9.5px; color: #cbd5e1; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Hashrate:</span>
                <strong style="font-family: var(--font-mono); color: #f59e0b;">${pow.hashrate}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Power Grid:</span>
                <strong style="font-family: var(--font-mono); color: #ef4444;">${pow.energyRateMW}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Confirmed:</span>
                <strong style="font-family: var(--font-mono);">${pow.confirmedChain.length} blks (${pow.orphanedBlocks} orph)</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Joules Burned:</span>
                <strong style="font-family: var(--font-mono); color: #fbbf24;">${pow.joulesBurned.toLocaleString()} J</strong>
              </div>
            </div>
            <button id="btn-toggle-pow-attack" class="hud-btn" style="width: 100%; justify-content: center; font-size: 9.5px; padding: 5px 6px; background: ${pow.attackActive ? '#ef4444' : 'rgba(239, 68, 68, 0.2)'}; border-color: #ef4444; color: #fff;">
              ${pow.attackActive ? '🛑 Halt 51% Hashrate Attack' : '🚨 Launch 51% Hashrate Reorg'}
            </button>
          </div>

          <!-- RIGHT: PoS Status -->
          <div style="background: ${pos.attackActive ? 'linear-gradient(145deg, #10261c, #06140e)' : 'linear-gradient(145deg, #091728, #050d18)'}; border: 1px solid ${pos.attackActive ? '#00ff88' : '#00f0ff'}; border-radius: 6px; padding: 8px 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid rgba(0, 240, 255, 0.2); padding-bottom: 4px;">
              <strong style="color: #00f0ff; font-size: 10px;">🌱 PROOF OF STAKE</strong>
              <span style="font-size: 8px; color: ${pos.attackActive ? '#00ff88' : '#94a3b8'}; font-weight: bold;">
                ${pos.attackActive ? '🛡️ ATTACK SLASHED' : 'NORMAL'}
              </span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 3px; font-size: 9.5px; color: #cbd5e1; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Total Stake:</span>
                <strong style="font-family: var(--font-mono); color: #00f0ff;">${pos.totalStake} QUEST</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Power Grid:</span>
                <strong style="font-family: var(--font-mono); color: #00ff88;">${pos.energyRateMW}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Finalized:</span>
                <strong style="font-family: var(--font-mono);">${pos.finalizedChain.length} slots</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Slashing Log:</span>
                <strong style="font-family: var(--font-mono); color: #ff3366;">${pos.slashingLog.length} events</strong>
              </div>
            </div>
            <button id="btn-toggle-pos-attack" class="hud-btn" style="width: 100%; justify-content: center; font-size: 9.5px; padding: 5px 6px; background: ${pos.attackActive ? '#00ff88' : 'rgba(0, 240, 255, 0.2)'}; border-color: #00f0ff; color: #fff;">
              ${pos.attackActive ? '🛡️ Reset Attacker Slashed' : '⚡ Launch 51% Double-Sign Attack'}
            </button>
          </div>
        </div>

        <!-- 3. LIVE 6-METRIC COMPARATIVE TABLE -->
        <div class="theory-card" style="margin-bottom: 12px; background: rgba(0,0,0,0.4); border-color: rgba(255,255,255,0.15); padding: 8px 10px;">
          <div style="font-size: 10px; color: #94a3b8; font-weight: bold; margin-bottom: 6px;">
            📊 LIVE COMPARATIVE ARCHITECTURE MATRIX:
          </div>
          <div style="overflow-x: auto;">
            <table style="width: 100%; font-size: 9.5px; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="background: rgba(255,255,255,0.06); color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.12);">
                  <th style="padding: 5px 6px;">Metric / Dimension</th>
                  <th style="padding: 5px 6px; color: #f59e0b;">⛏️ PoW (Bitcoin)</th>
                  <th style="padding: 5px 6px; color: #00f0ff;">🌱 PoS (Ethereum)</th>
                  <th style="padding: 5px 6px;">Outcome</th>
                </tr>
              </thead>
              <tbody>
                ${metrics.map(m => `
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 5px 6px; font-weight: bold; color: #f8fafc; white-space: nowrap;">${m.title}</td>
                    <td style="padding: 5px 6px; font-family: var(--font-mono); color: #fbbf24; font-size: 9px;">${m.pow}</td>
                    <td style="padding: 5px 6px; font-family: var(--font-mono); color: #38bdf8; font-size: 9px;">${m.pos}</td>
                    <td style="padding: 5px 6px; color: #a7f3d0; font-size: 8.5px;">${m.winner}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Educational Core Axiom Banner -->
          <div style="margin-top: 10px; background: rgba(0, 240, 255, 0.08); border-left: 3px solid var(--accent-cyan); padding: 7px 10px; font-size: 10px; color: #cbd5e1;">
            <strong style="color: #fff;">Consensus Axiom:</strong> "PoW security = physical resources. PoS security = locked capital. Each has trade-offs."
          </div>
        </div>
      `;
    }

    function renderSharedTxsSection(comp, pow, pos, metrics) {
      return `
        <!-- 1. SPLIT-SCREEN HEADER & THEORY TRIGGER -->
        <div class="theory-card" style="margin-bottom: 12px; background: linear-gradient(145deg, #101c2e, #090e1a); border-color: var(--accent-cyan);">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 255, 255, 0.1); padding-bottom: 6px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <strong style="color: var(--accent-cyan); font-size: 11px;">⚖️ SPLIT-SCREEN CONSENSUS COMPARATOR</strong>
              <button class="btn-explain" data-explain="consensus_compare" title="Explain Comparison">ℹ️ Explain</button>
            </div>
            <button id="btn-open-compare-modal" class="hud-btn" style="font-size: 9.5px; padding: 3px 8px; background: rgba(0, 240, 255, 0.15); border-color: var(--accent-cyan); color: var(--accent-cyan);">
              🎓 Security Paradigms & Trade-offs
            </button>
          </div>
          <p style="font-size: 10px; color: #cbd5e1; margin-bottom: 8px; line-height: 1.4;">
            Broadcast an identical simulated transaction stream to both chains. Compare live metrics and trigger 51% attacks to observe how thermodynamic energy differs from locked capital security!
          </p>

          <!-- SHARED TRANSACTION GENERATOR CONTROLS -->
          <div style="background: rgba(0,0,0,0.3); padding: 8px 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06); margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 10px; color: #94a3b8; font-weight: bold;">SHARED TRANSACTION INGESTION:</span>
              <span class="badge-label" style="background: rgba(0, 240, 255, 0.15); color: var(--accent-cyan); font-size: 9px;">
                Pending in Mempools: <strong id="compare-pending-count">${comp.sharedPendingCount}</strong>
              </span>
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button id="btn-compare-send-5" class="hud-btn primary" style="flex: 1; min-width: 100px; justify-content: center; font-size: 10px; padding: 5px 8px;">
                ⚡ Send 5 Shared Txs
              </button>
              <button id="btn-compare-send-15" class="hud-btn" style="flex: 1; min-width: 100px; justify-content: center; font-size: 10px; padding: 5px 8px;">
                🚀 Send 15 Shared Txs
              </button>
              <button id="btn-compare-step" class="hud-btn" style="flex: 1; min-width: 90px; justify-content: center; font-size: 10px; padding: 5px 8px; background: rgba(0, 255, 136, 0.15); border-color: #00ff88; color: #00ff88;">
                ▶️ Step Chains
              </button>
              <button id="btn-compare-reset" class="hud-btn" style="flex: 1; min-width: 70px; justify-content: center; font-size: 10px; padding: 5px 6px;">
                🔄 Reset
              </button>
            </div>
          </div>
        </div>

        <!-- 2. SIDE-BY-SIDE CHAIN STATUS CARDS -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
          <!-- LEFT: PoW Status -->
          <div style="background: ${pow.attackActive ? 'linear-gradient(145deg, #2b1111, #160808)' : 'linear-gradient(145deg, #1f1a0a, #110e05)'}; border: 1px solid ${pow.attackActive ? '#ff3366' : '#f59e0b'}; border-radius: 6px; padding: 8px 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid rgba(255, 183, 3, 0.2); padding-bottom: 4px;">
              <strong style="color: #f59e0b; font-size: 10px;">⛏️ PROOF OF WORK</strong>
              <span style="font-size: 8px; color: ${pow.attackActive ? '#ff3366' : '#94a3b8'}; font-weight: bold;">
                ${pow.attackActive ? '🚨 51% REORG' : 'NORMAL'}
              </span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 3px; font-size: 9.5px; color: #cbd5e1; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Hashrate:</span>
                <strong style="font-family: var(--font-mono); color: #f59e0b;">${pow.hashrate}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Power Grid:</span>
                <strong style="font-family: var(--font-mono); color: #ef4444;">${pow.energyRateMW}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Confirmed:</span>
                <strong style="font-family: var(--font-mono);">${pow.confirmedChain.length} blks (${pow.orphanedBlocks} orph)</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Joules Burned:</span>
                <strong style="font-family: var(--font-mono); color: #fbbf24;">${pow.joulesBurned.toLocaleString()} J</strong>
              </div>
            </div>
            <button id="btn-toggle-pow-attack" class="hud-btn" style="width: 100%; justify-content: center; font-size: 9.5px; padding: 5px 6px; background: ${pow.attackActive ? '#ef4444' : 'rgba(239, 68, 68, 0.2)'}; border-color: #ef4444; color: #fff;">
              ${pow.attackActive ? '🛑 Halt 51% Hashrate Attack' : '🚨 Launch 51% Hashrate Reorg'}
            </button>
          </div>

          <!-- RIGHT: PoS Status -->
          <div style="background: ${pos.attackActive ? 'linear-gradient(145deg, #10261c, #06140e)' : 'linear-gradient(145deg, #091728, #050d18)'}; border: 1px solid ${pos.attackActive ? '#00ff88' : '#00f0ff'}; border-radius: 6px; padding: 8px 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid rgba(0, 240, 255, 0.2); padding-bottom: 4px;">
              <strong style="color: #00f0ff; font-size: 10px;">🌱 PROOF OF STAKE</strong>
              <span style="font-size: 8px; color: ${pos.attackActive ? '#00ff88' : '#94a3b8'}; font-weight: bold;">
                ${pos.attackActive ? '🛡️ ATTACK SLASHED' : 'NORMAL'}
              </span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 3px; font-size: 9.5px; color: #cbd5e1; margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Total Stake:</span>
                <strong style="font-family: var(--font-mono); color: #00f0ff;">${pos.totalStake} QUEST</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Power Grid:</span>
                <strong style="font-family: var(--font-mono); color: #00ff88;">${pos.energyRateMW}</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Finalized:</span>
                <strong style="font-family: var(--font-mono);">${pos.finalizedChain.length} slots</strong>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="color: #94a3b8;">Slashing Log:</span>
                <strong style="font-family: var(--font-mono); color: #ff3366;">${pos.slashingLog.length} events</strong>
              </div>
            </div>
            <button id="btn-toggle-pos-attack" class="hud-btn" style="width: 100%; justify-content: center; font-size: 9.5px; padding: 5px 6px; background: ${pos.attackActive ? '#00ff88' : 'rgba(0, 240, 255, 0.2)'}; border-color: #00f0ff; color: #fff;">
              ${pos.attackActive ? '🛡️ Reset Attacker Slashed' : '⚡ Launch 51% Double-Sign Attack'}
            </button>
          </div>
        </div>

        <!-- 3. LIVE 6-METRIC COMPARATIVE TABLE -->
        <div class="theory-card" style="margin-bottom: 12px; background: rgba(0,0,0,0.4); border-color: rgba(255,255,255,0.15); padding: 8px 10px;">
          <div style="font-size: 10px; color: #94a3b8; font-weight: bold; margin-bottom: 6px;">
            📊 LIVE COMPARATIVE ARCHITECTURE MATRIX:
          </div>
          <div style="overflow-x: auto;">
            <table style="width: 100%; font-size: 9.5px; border-collapse: collapse; text-align: left;">
              <thead>
                <tr style="background: rgba(255,255,255,0.06); color: #94a3b8; border-bottom: 1px solid rgba(255,255,255,0.12);">
                  <th style="padding: 5px 6px;">Metric / Dimension</th>
                  <th style="padding: 5px 6px; color: #f59e0b;">⛏️ PoW (Bitcoin)</th>
                  <th style="padding: 5px 6px; color: #00f0ff;">🌱 PoS (Ethereum)</th>
                  <th style="padding: 5px 6px;">Outcome</th>
                </tr>
              </thead>
              <tbody>
                ${metrics.map(m => `
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                    <td style="padding: 5px 6px; font-weight: bold; color: #f8fafc; white-space: nowrap;">${m.title}</td>
                    <td style="padding: 5px 6px; font-family: var(--font-mono); color: #fbbf24; font-size: 9px;">${m.pow}</td>
                    <td style="padding: 5px 6px; font-family: var(--font-mono); color: #38bdf8; font-size: 9px;">${m.pos}</td>
                    <td style="padding: 5px 6px; color: #a7f3d0; font-size: 8.5px;">${m.winner}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Educational Core Axiom Banner -->
          <div style="margin-top: 10px; background: rgba(0, 240, 255, 0.08); border-left: 3px solid var(--accent-cyan); padding: 7px 10px; font-size: 10px; color: #cbd5e1;">
            <strong style="color: #fff;">Consensus Axiom:</strong> "PoW security = physical resources. PoS security = locked capital. Each has trade-offs."
          </div>
        </div>
      `;

      attachSplitScreenListeners();
    }

    function attachSplitScreenListeners() {
      // Mode switch to PoW
      document.getElementById('btn-mode-pow')?.addEventListener('click', () => {
        setConsensusMode('pow');
        Toast.show("Consensus Switched ⛏️", "Proof of Work (PoW) Mining Rig activated.", "info", 3000);
      });

      // Mode switch to PoS
      document.getElementById('btn-mode-pos')?.addEventListener('click', () => {
        setConsensusMode('pos');
        Toast.show("Consensus Switched 🌱", "Proof of Stake (PoS) Validator Console activated.", "success", 3000);
      });

      // Mode switch to The Merge
      document.getElementById('btn-mode-merge')?.addEventListener('click', () => {
        setConsensusMode('merge');
        Toast.show("The Merge (2022) 🐼", "Simulate Ethereum's historic swap from PoW to PoS at Block 15,537,394.", "success", 4000);
      });

      // Sub-view toggle
      document.getElementById('btn-compare-view-txs')?.addEventListener('click', () => {
        compareSubView = 'txs';
        finalitySimulator.setActive(false);
        consensusComparison.setActive(true);
        renderSplitScreenLabUI();
      });

      document.getElementById('btn-compare-view-finality')?.addEventListener('click', () => {
        compareSubView = 'finality';
        consensusComparison.setActive(false);
        finalitySimulator.setActive(true);
        renderSplitScreenLabUI();
      });

      // Finality controls
      document.getElementById('btn-pow-conf-minus')?.addEventListener('click', () => {
        finalitySimulator.setConfirmations(finalitySimulator.powState.confirmations - 1);
        renderSplitScreenLabUI();
      });
      document.getElementById('btn-pow-conf-plus')?.addEventListener('click', () => {
        finalitySimulator.setConfirmations(finalitySimulator.powState.confirmations + 1);
        renderSplitScreenLabUI();
      });
      document.getElementById('btn-pow-conf-6')?.addEventListener('click', () => {
        finalitySimulator.setConfirmations(6);
        renderSplitScreenLabUI();
      });
      document.getElementById('btn-animate-pow-fork')?.addEventListener('click', () => {
        const res = finalitySimulator.animatePoWFork();
        Toast.show("PoW Fork Resolution", res.pow.forkState.message, res.pow.forkState.status === 'orphaned' ? 'success' : 'danger', 4000);
        renderSplitScreenLabUI();
      });

      document.getElementById('btn-pos-epoch-advance')?.addEventListener('click', () => {
        finalitySimulator.advancePoSEpoch();
        renderSplitScreenLabUI();
      });
      document.getElementById('btn-pos-epoch-finalized')?.addEventListener('click', () => {
        finalitySimulator.setEpochsElapsed(2);
        renderSplitScreenLabUI();
      });
      document.getElementById('btn-animate-pos-fork')?.addEventListener('click', () => {
        const res = finalitySimulator.animatePoSFork();
        Toast.show("PoS Finality Defense", res.pos.forkState.message, res.pos.forkState.status === 'slashed' ? 'success' : 'warning', 5000);
        renderSplitScreenLabUI();
      });
      document.getElementById('btn-reset-finality-sim')?.addEventListener('click', () => {
        finalitySimulator.reset();
        Toast.show("Finality Reset 🔄", "PoW & PoS restored to standard finality defaults.", "info", 2500);
        renderSplitScreenLabUI();
      });
      document.getElementById('btn-open-finality-modal')?.addEventListener('click', () => {
        eventBus.emit('SHOW_FINALITY_MODAL');
      });

      // Open educational modal
      document.getElementById('btn-open-compare-modal')?.addEventListener('click', () => {
        eventBus.emit('SHOW_COMPARE_MODAL');
      });

      // Send 5 shared txs
      document.getElementById('btn-compare-send-5')?.addEventListener('click', () => {
        consensusComparison.broadcastSharedTransactions(5);
        Toast.show("Shared Txs Broadcast 📡", "5 identical transactions submitted to both PoW & PoS mempools!", "info", 2500);
        renderSplitScreenLabUI();
      });

      // Send 15 shared txs
      document.getElementById('btn-compare-send-15')?.addEventListener('click', () => {
        consensusComparison.broadcastSharedTransactions(15);
        Toast.show("Shared Txs Broadcast 📡", "15 identical transactions submitted to both PoW & PoS mempools!", "info", 2500);
        renderSplitScreenLabUI();
      });

      // Step simulation
      document.getElementById('btn-compare-step')?.addEventListener('click', () => {
        consensusComparison.stepSimulation();
        renderSplitScreenLabUI();
      });

      // Reset simulation
      document.getElementById('btn-compare-reset')?.addEventListener('click', () => {
        consensusComparison.reset();
        Toast.show("Simulation Reset 🔄", "Both PoW and PoS chains reinitialized to genesis.", "info", 2500);
        renderSplitScreenLabUI();
      });

      // Toggle PoW Attack
      document.getElementById('btn-toggle-pow-attack')?.addEventListener('click', () => {
        const res = consensusComparison.togglePoWAttack();
        if (res.pow.attackActive) {
          Toast.show("PoW 51% Attack Active 🚨", "Attacker mobilized 500 EH/s! Honest blocks are being orphaned.", "warning", 4000);
        } else {
          Toast.show("PoW Attack Halted ⛏️", "Hashrate normalized to honest miners.", "info", 2500);
        }
        renderSplitScreenLabUI();
      });

      // Toggle PoS Attack
      document.getElementById('btn-toggle-pos-attack')?.addEventListener('click', () => {
        const res = consensusComparison.togglePoSAttack();
        if (res.pos.attackActive) {
          Toast.show("PoS 51% Attack Neutralized 🛡️", "Attacker equivocation detected! 100% of attacker stake ($15.0B) incinerated via Casper FFG!", "success", 5000);
        } else {
          Toast.show("PoS State Restored 🌱", "Slashing logs archived.", "info", 2500);
        }
        renderSplitScreenLabUI();
      });
    }


    function attachPoSLabListeners() {
      // Mode switch back to PoW
      document.getElementById('btn-mode-pow')?.addEventListener('click', () => {
        setConsensusMode('pow');
        Toast.show("Consensus Switched ⛏️", "Proof of Work (PoW) Mining Rig activated.", "info", 3000);
      });

      // Mode switch to Split-Screen Compare
      document.getElementById('btn-mode-compare')?.addEventListener('click', () => {
        setConsensusMode('compare');
        Toast.show("Split-Screen Simulator ⚖️", "Comparing PoW vs PoS across identical transaction streams.", "info", 3000);
      });

      // Mode switch to The Merge
      document.getElementById('btn-mode-merge')?.addEventListener('click', () => {
        setConsensusMode('merge');
        Toast.show("The Merge (2022) 🐼", "Simulate Ethereum's historic swap from PoW to PoS at Block 15,537,394.", "success", 4000);
      });

      // Stake Presets
      document.querySelectorAll('.btn-stake-preset').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = btn.getAttribute('data-val');
          const input = document.getElementById('input-stake-amount');
          if (!input) return;
          if (val === 'max') {
            input.value = Math.floor(playerWallet.balance);
          } else {
            input.value = val;
          }
        });
      });

      // Become Validator button
      document.getElementById('btn-become-validator')?.addEventListener('click', () => {
        const input = document.getElementById('input-stake-amount');
        const amt = parseFloat(input?.value || '0');
        try {
          consensusPoS.stakePlayer(amt);
          missionState.hasStakedValidator = true;
          notifyState();
          renderPoSLabUI();
          Toast.show(
            "Validator Activated! 👑",
            `Locked ${amt.toFixed(1)} QUEST as validator collateral. You are now eligible to propose and attest!`,
            "success",
            5000
          );
        } catch (err) {
          Toast.show("Staking Failed", err.message, "error", 4000);
        }
      });

      // Request Unbond button
      document.getElementById('btn-request-unbond')?.addEventListener('click', () => {
        try {
          consensusPoS.requestUnbondPlayer();
          renderPoSLabUI();
          Toast.show(
            "Unbonding Requested ⏳",
            "Entered 3 game-day unbonding period. Funds locked under protocol surveillance.",
            "warning",
            5000
          );
        } catch (err) {
          Toast.show("Unbonding Error", err.message, "error", 4000);
        }
      });

      // Advance Slot button
      document.getElementById('btn-advance-slot')?.addEventListener('click', async () => {
        const result = await consensusPoS.runSlot(false);
        if (result.isFinalized) {
          missionState.hasFinalizedPoSBlock = true;
          notifyState();
        }
        renderPoSLabUI();
      });

      // Toggle Auto-Slot button
      document.getElementById('btn-toggle-auto-slot')?.addEventListener('click', () => {
        consensusPoS.toggleAutoSlot();
        renderPoSLabUI();
      });

      // Simulate Slashing button (legacy fallback)
      document.getElementById('btn-simulate-slashing')?.addEventListener('click', async () => {
        await consensusPoS.runSlot('EQUIVOCATION');
        missionState.hasTriggeredSlashing = true;
        notifyState();
        renderPoSLabUI();
      });

      // Equivocation (Double-Sign) Button
      document.getElementById('btn-slash-equivocation')?.addEventListener('click', async () => {
        await consensusPoS.runSlot('EQUIVOCATION');
        missionState.hasTriggeredSlashing = true;
        notifyState();
        renderPoSLabUI();
      });

      // Invalid Block Proposal Button
      document.getElementById('btn-slash-invalid')?.addEventListener('click', async () => {
        await consensusPoS.runSlot('INVALID_BLOCK');
        missionState.hasTriggeredSlashing = true;
        notifyState();
        renderPoSLabUI();
      });

      // Liveness Failure Button
      document.getElementById('btn-slash-liveness')?.addEventListener('click', async () => {
        await consensusPoS.runSlot('LIVENESS_FAILURE');
        missionState.hasTriggeredSlashing = true;
        notifyState();
        renderPoSLabUI();
      });

      // Open PoS Rules Modal
      document.getElementById('btn-view-pos-rules')?.addEventListener('click', () => {
        eventBus.emit('SHOW_POS_MODAL');
      });

      // Open Delegated Staking Educational Modal
      document.getElementById('btn-open-delegation-explainer')?.addEventListener('click', () => {
        eventBus.emit('SHOW_DELEGATED_STAKING_MODAL');
      });
      document.getElementById('btn-explain-delegation')?.addEventListener('click', () => {
        eventBus.emit('SHOW_DELEGATED_STAKING_MODAL');
      });

      // Delegate buttons on validator cards
      document.querySelectorAll('.btn-delegate-to-val').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const valId = btn.getAttribute('data-val-id');
          eventBus.emit('SHOW_DELEGATE_ACTION_MODAL', { validatorId: valId });
        });
      });

      // Jump to Level 6 DeFi AMM
      document.getElementById('btn-goto-defi-amm')?.addEventListener('click', () => {
        const select = document.getElementById('chapter-select');
        if (select) {
          select.value = '6';
          select.dispatchEvent(new Event('change'));
        }
        eventBus.emit('NAVIGATE_TO_LEVEL', 6);
      });

      // Stake Tuner buttons ([-5] and [+5])
      document.querySelectorAll('.btn-stake-tune').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const valId = btn.getAttribute('data-val-id');
          const delta = parseFloat(btn.getAttribute('data-delta') || '0');
          try {
            consensusPoS.adjustValidatorStake(valId, delta);
            renderPoSLabUI();
            Toast.show("Stake Adjusted ⚖️", `Recalculated selection probabilities for active validators.`, "info", 2000);
          } catch (err) {
            Toast.show("Adjustment Error", err.message, "error");
          }
        });
      });

      // Run 100-Slot Simulation
      document.getElementById('btn-run-batch-sim')?.addEventListener('click', () => {
        try {
          consensusPoS.runBatchSimulation(100);
          renderPoSLabUI();
          Toast.show("100 Slots Simulated! 🎲", "Evaluated actual vs expected selections. Inspect luck meter below.", "success", 4000);
        } catch (err) {
          Toast.show("Simulation Failed", err.message, "error");
        }
      });

      // Open RANDAO Educational Modal
      document.getElementById('btn-open-randao-modal')?.addEventListener('click', () => {
        eventBus.emit('SHOW_RANDAO_MODAL');
      });
      document.getElementById('btn-explain-randao')?.addEventListener('click', () => {
        eventBus.emit('SHOW_RANDAO_MODAL');
      });
    }


    
    function renderMergeLabUI() {
      consensusPoS.setActive(false);
      consensusComparison.setActive(false);
      finalitySimulator.setActive(false);
      mergeSimulation.setActive(true);

      const sim = mergeSimulation;
      const state = sim.getState();
      const isPost = state.isPostMerge;
      const isMerge = state.isExactMergeBlock;
      const bomb = state.difficultyBomb;

      container.innerHTML = `
        <!-- CONSENSUS SELECTOR TABS -->
        <div style="display: flex; gap: 4px; margin-bottom: 12px; background: rgba(0,0,0,0.4); padding: 4px; border-radius: 6px; border: 1px solid var(--border-subtle);">
          <button id="btn-mode-pow" class="hud-btn" style="flex: 1; justify-content: center; font-size: 9.5px; padding: 6px 2px;">
            ⛏️ PoW
          </button>
          <button id="btn-mode-pos" class="hud-btn" style="flex: 1; justify-content: center; font-size: 9.5px; padding: 6px 2px;">
            🌱 PoS
          </button>
          <button id="btn-mode-compare" class="hud-btn" style="flex: 1; justify-content: center; font-size: 9.5px; padding: 6px 2px;">
            ⚖️ Compare
          </button>
          <button id="btn-mode-merge" class="hud-btn primary" style="flex: 1; justify-content: center; font-size: 9.5px; padding: 6px 2px; border-color: #ffd700; color: #ffd700;">
            🐼 The Merge
          </button>
        </div>

        <!-- THE MERGE MISSION CARD -->
        <div class="theory-card" style="margin-bottom: 12px; background: linear-gradient(145deg, #1f1b0a, #0d0c05); border-color: #ffd700;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255, 215, 0, 0.2); padding-bottom: 6px; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <strong style="color: #ffd700; font-size: 11px;">🐼 THE MERGE: HISTORIC UPGRADE LAB</strong>
              <button class="btn-explain" data-explain="ethereum_merge" id="btn-explain-merge-hero" title="Explain The Merge">ℹ️ Explain</button>
            </div>
            <span class="badge-label" style="background: ${isPost ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 215, 0, 0.2)'}; color: ${isPost ? 'var(--accent-green)' : '#ffd700'}; font-size: 9px;">
              ${isPost ? '🌱 PROOF OF STAKE LIVE' : (isMerge ? '🐼 TTD TRIGGERED' : '⛏️ ETHASH MINING')}
            </span>
          </div>
          <p style="font-size: 10px; color: #cbd5e1; line-height: 1.45; margin-bottom: 8px;">
            On <strong>September 15, 2022</strong> at block <strong>15,537,394</strong>, Ethereum permanently executed The Merge. When cumulative difficulty surpassed <strong>58.75 ZettaHashes</strong> (TTD), miners were decommissioned and replaced by 420,000+ Beacon Chain validators with zero downtime and a 99.95% energy drop.
          </p>
          <button id="btn-open-merge-modal" class="hud-btn" style="width: 100%; justify-content: center; font-size: 10px; padding: 5px; color: #ffd700; border-color: rgba(255, 215, 0, 0.4); background: rgba(255, 215, 0, 0.1);">
            📜 Read The Merge Historical Briefing & Metrics ➔
          </button>
        </div>

        <!-- LIVE TELEMETRY: BLOCK & TTD PROGRESS -->
        <div class="theory-card" style="margin-bottom: 12px; background: rgba(0,0,0,0.35); border-color: var(--border-subtle);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 10px; color: #94a3b8; font-weight: bold;">CURRENT BLOCK PROGRESSION:</span>
            <strong style="font-family: var(--font-mono); font-size: 12px; color: ${isPost ? 'var(--accent-green)' : (isMerge ? '#ffd700' : 'var(--accent-amber)')};">
              Block #${state.currentBlock.toLocaleString()}
            </strong>
          </div>

          <!-- TTD Accumulation Bar -->
          <div style="margin-bottom: 6px;">
            <div style="display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; margin-bottom: 2px;">
              <span>Terminal Total Difficulty (TTD):</span>
              <strong style="color: var(--accent-cyan); font-family: var(--font-mono);">${state.ttdProgressPct.toFixed(1)}% / 58.75 ZettaHashes</strong>
            </div>
            <div style="height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
              <div style="width: ${state.ttdProgressPct}%; height: 100%; background: linear-gradient(90deg, #f59e0b, #ffd700, #00ff88); border-radius: 3px; transition: width 0.3s ease;"></div>
            </div>
          </div>

          <!-- Live Metrics Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 9.5px; font-family: var(--font-mono); margin-top: 8px;">
            <div style="background: rgba(0,0,0,0.4); padding: 5px 8px; border-radius: 4px;">
              <span style="color: #94a3b8;">Consensus Engine:</span><br>
              <strong style="color: ${isPost ? 'var(--accent-green)' : 'var(--accent-amber)'};">${state.consensusEngine}</strong>
            </div>
            <div style="background: rgba(0,0,0,0.4); padding: 5px 8px; border-radius: 4px;">
              <span style="color: #94a3b8;">Thermodynamic Energy:</span><br>
              <strong style="color: ${isPost ? 'var(--accent-green)' : 'var(--accent-red)'};">${state.currentEnergyMw >= 1 ? state.currentEnergyMw.toFixed(0) + ' MW (8.5 GW)' : '0.0026 MW (2.6 kW)'}</strong>
            </div>
            <div style="background: rgba(0,0,0,0.4); padding: 5px 8px; border-radius: 4px;">
              <span style="color: #94a3b8;">Energy Reduction:</span><br>
              <strong style="color: ${isPost ? 'var(--accent-green)' : '#94a3b8'};">${isPost ? '-99.95% (40,000x cleaner)' : '0.00% (PoW Baseline)'}</strong>
            </div>
            <div style="background: rgba(0,0,0,0.4); padding: 5px 8px; border-radius: 4px;">
              <span style="color: #94a3b8;">Difficulty Bomb:</span><br>
              <strong style="color: ${bomb.defused ? 'var(--accent-green)' : (bomb.multiplier > 1 ? 'var(--accent-red)' : 'var(--accent-amber)')};">
                ${bomb.defused ? 'DEFUSED (12s Slots)' : 'Level ' + bomb.escalationLevel + ' (' + bomb.blockTimeSec + 's)'}
              </strong>
            </div>
          </div>
        </div>

        <!-- INTERACTIVE CONTROLS -->
        <div class="theory-card" style="margin-bottom: 12px; background: rgba(0,0,0,0.35); border-color: var(--border-subtle);">
          <div style="font-size: 10px; color: #94a3b8; font-weight: bold; margin-bottom: 8px;">
            🎮 MERGE SIMULATION CONTROLS:
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; gap: 6px;">
              <button id="btn-merge-advance" class="action-btn primary-action" style="flex: 2; justify-content: center; font-size: 10.5px; padding: 7px;">
                <span>▶ Advance 1 Block (${state.currentBlock + 1})</span>
              </button>
              <button id="btn-merge-autorun" class="hud-btn" style="flex: 1; justify-content: center; font-size: 10px; padding: 7px; color: ${sim.isAutoRunning ? '#ff3366' : 'var(--accent-green)'};">
                <span>${sim.isAutoRunning ? '⏸ Pause' : '▶ Auto-Run'}</span>
              </button>
            </div>

            <button id="btn-merge-trigger-now" class="action-btn" style="width: 100%; justify-content: center; background: linear-gradient(90deg, #ffd700, #f59e0b); color: #000; font-weight: bold; font-size: 11px; padding: 7px;" title="Jump directly to block 15,537,394 and execute The Merge">
              <span>⚡ Trigger The Merge Now (Block #15,537,394) 🐼</span>
            </button>

            <div style="display: flex; gap: 6px;">
              <button id="btn-merge-tick-bomb" class="hud-btn" style="flex: 1; justify-content: center; font-size: 9.5px; padding: 6px; color: #ff3366;" title="Simulate Ice Age difficulty escalation">
                <span>💣 Escalate Difficulty Bomb</span>
              </button>
              <button id="btn-merge-reset" class="hud-btn" style="flex: 1; justify-content: center; font-size: 9.5px; padding: 6px;" title="Reset back to pre-merge state">
                <span>🔄 Reset Simulation</span>
              </button>
            </div>
          </div>
        </div>

        <!-- EVENT LOG CONSOLE -->
        <div style="background: rgba(0,0,0,0.5); padding: 8px 10px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06); font-family: var(--font-mono); font-size: 9.5px; color: #cbd5e1;">
          <span style="color: #64748b;">LAST CONSENSUS EVENT:</span><br>
          <span style="color: ${isPost ? 'var(--accent-green)' : (isMerge ? '#ffd700' : 'var(--accent-cyan)')};">
            ${state.lastEventMessage}
          </span>
        </div>
      `;

      attachMergeLabListeners();
    }

    function attachMergeLabListeners() {
      // Mode switches
      document.getElementById('btn-mode-pow')?.addEventListener('click', () => {
        setConsensusMode('pow');
        Toast.show("Consensus Switched ⛏️", "Proof of Work (PoW) Mining Rig activated.", "info", 3000);
      });

      document.getElementById('btn-mode-pos')?.addEventListener('click', () => {
        setConsensusMode('pos');
        Toast.show("Consensus Switched 🌱", "Proof of Stake (PoS) Validator Console activated.", "success", 3000);
      });

      document.getElementById('btn-mode-compare')?.addEventListener('click', () => {
        setConsensusMode('compare');
        Toast.show("Split-Screen Simulator ⚖️", "Comparing PoW vs PoS across identical transaction streams.", "info", 3000);
      });

      // Advance 1 block
      document.getElementById('btn-merge-advance')?.addEventListener('click', () => {
        mergeSimulation.advanceBlock();
        renderMergeLabUI();
      });

      // Auto-run toggle
      document.getElementById('btn-merge-autorun')?.addEventListener('click', () => {
        mergeSimulation.toggleAutoRun();
        renderMergeLabUI();
      });

      // Trigger The Merge now
      document.getElementById('btn-merge-trigger-now')?.addEventListener('click', () => {
        mergeSimulation.triggerMerge();
        renderMergeLabUI();
      });

      // Escalate difficulty bomb
      document.getElementById('btn-merge-tick-bomb')?.addEventListener('click', () => {
        mergeSimulation.tickDifficultyBomb();
        renderMergeLabUI();
      });

      // Reset
      document.getElementById('btn-merge-reset')?.addEventListener('click', () => {
        mergeSimulation.reset();
        renderMergeLabUI();
        Toast.show("Merge Simulation Reset 🔄", "Reset back to PoW block 15,537,388.", "info", 2500);
      });

      // Open Modal
      document.getElementById('btn-open-merge-modal')?.addEventListener('click', () => {
        eventBus.emit('SHOW_MERGE_MODAL');
      });
      document.getElementById('btn-explain-merge-hero')?.addEventListener('click', () => {
        eventBus.emit('SHOW_MERGE_MODAL');
      });
    }

    renderLabUI();
    notifyState();
  }
};

