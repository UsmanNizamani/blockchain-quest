import { Crypto } from '../blockchain/Crypto.js';
import { eventBus } from '../core/EventBus.js';

export const Chapter1_Hashing = {
  id: 1,
  title: "The Cryptographic Seal",
  subtitle: "Mastering SHA-256 and the Avalanche Effect",
  xpReward: 150,

  // Educational Content for Theory Tab
  theory: {
    heroTitle: "Chapter 1: The Cryptographic Seal",
    sections: [
      {
        title: "What is a Cryptographic Hash Function?",
        content: `A cryptographic hash function (like <strong>SHA-256</strong>, the bedrock of Bitcoin) takes an arbitrary amount of data—whether a single word, a transaction, or the entire Library of Alexandria—and compresses it into a strictly fixed-size digital fingerprint of <strong>256 bits</strong> (represented as 64 hexadecimal characters).`
      },
      {
        title: "The Four Golden Properties",
        highlight: "1. Deterministic: The same input ALWAYS produces the exact same hash.\n2. Quick Computation: Computing the hash is fast and efficient.\n3. Pre-image Resistance (One-Way): Infeasible to calculate the original input from the hash.\n4. Collision Resistant: Infeasible to find two different inputs that produce identical hashes."
      },
      {
        title: "The Avalanche Effect",
        content: `A hallmark of secure cryptographic hash functions is the <strong>Avalanche Effect</strong>. If you change even a single bit in the input (e.g. changing 'cat' to 'Cat'), the output hash changes drastically and unpredictably—flipping approximately <strong>50%</strong> of the 256 output bits. This property makes blockchains mathematically tamper-evident.`
      }
    ],
    concepts: [
      { name: "Digest Length", desc: "Always 256 bits (64 hex characters)" },
      { name: "Avalanche Rate", desc: "~50% bit variation on minor tweak" },
      { name: "Nonce", desc: "Arbitrary number incremented by miners" },
      { name: "Target Difficulty", desc: "Requirement for leading zero bits" }
    ]
  },

  // Mission Objectives
  objectives: [
    {
      id: "ch1_obj1",
      title: "1. Generate a Custom Hash",
      desc: "Type any custom string with at least 4 characters into the data input field.",
      xp: 40,
      completed: false,
      check: (state) => {
        return state.input && state.input.trim().length >= 4;
      }
    },
    {
      id: "ch1_obj2",
      title: "2. Trigger the Avalanche Effect",
      desc: "Modify your input by just 1 character or tweak the nonce to achieve at least 40% bit flip difference.",
      xp: 50,
      completed: false,
      check: (state) => {
        return state.avalanche && state.avalanche.percentage >= 40;
      }
    },
    {
      id: "ch1_obj3",
      title: "3. The Miner's Proof (Find Leading Zero)",
      desc: "Adjust the Nonce until the computed hash begins with at least one leading '0'.",
      xp: 60,
      completed: false,
      check: (state) => {
        return state.hash && state.hash.startsWith('0');
      }
    }
  ],

  // Lab Tool Initialization and Logic
  initLab(container, onStateChange) {
    let currentInput = "Satoshi";
    let currentNonce = 0;
    let baseHash = Crypto.hashSync("Satoshi0");
    let currentHash = baseHash;

    container.innerHTML = `
      <div class="lab-field-group">
        <label class="lab-field-label" for="lab-data-input">
          <span>Data Payload (Message)</span>
          <span id="input-bit-count" class="badge-label">56 bits</span>
        </label>
        <input type="text" id="lab-data-input" class="lab-input" value="Satoshi" placeholder="Type data here..." />
      </div>

      <div class="lab-field-group">
        <div class="lab-field-label">
          <span>Nonce (Proof-of-Work Counter)</span>
          <span id="nonce-display" class="badge-label">Nonce: 0</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <input type="range" id="lab-nonce-slider" min="0" max="100" value="0" style="flex: 1; accent-color: var(--accent-cyan);" />
          <button id="btn-nonce-inc" class="hud-btn" style="padding: 6px 10px;">+1</button>
          <button id="btn-nonce-rand" class="hud-btn" style="padding: 6px 10px;">🎲 Random</button>
        </div>
      </div>

      <div class="hash-output-box">
        <div class="hash-label-row">
          <span style="font-size: 11px; font-weight: 700; color: #fff;">SHA-256 COMPUTED HASH</span>
          <span id="hash-zero-status" class="hash-status">No Leading Zeros</span>
        </div>
        <div id="hash-hex-display" class="hash-hex-display">${baseHash}</div>
      </div>

      <div class="avalanche-meter">
        <div class="avalanche-stats">
          <span>AVALANCHE BIT VARIATION</span>
          <strong id="avalanche-rate-text" style="color: var(--accent-purple);">0.0%</strong>
        </div>
        <div class="avalanche-bar-track">
          <div id="avalanche-bar-fill" class="avalanche-bar-fill"></div>
        </div>
        <span id="avalanche-detail-text" style="font-size: 11px; color: var(--text-muted);">
          0 / 256 bits flipped compared to initial state
        </span>
      </div>
    `;

    const dataInput = container.querySelector('#lab-data-input');
    const nonceSlider = container.querySelector('#lab-nonce-slider');
    const nonceDisplay = container.querySelector('#nonce-display');
    const btnInc = container.querySelector('#btn-nonce-inc');
    const btnRand = container.querySelector('#btn-nonce-rand');
    const hashDisplay = container.querySelector('#hash-hex-display');
    const hashZeroStatus = container.querySelector('#hash-zero-status');
    const avalancheText = container.querySelector('#avalanche-rate-text');
    const avalancheFill = container.querySelector('#avalanche-bar-fill');
    const avalancheDetail = container.querySelector('#avalanche-detail-text');
    const inputBitCount = container.querySelector('#input-bit-count');

    function updateHash() {
      currentInput = dataInput.value;
      currentNonce = parseInt(nonceSlider.value, 10);
      nonceDisplay.textContent = `Nonce: ${currentNonce}`;

      const payload = `${currentInput}${currentNonce}`;
      inputBitCount.textContent = `${payload.length * 8} bits`;

      currentHash = Crypto.hashSync(payload);
      hashDisplay.textContent = currentHash;

      // Avalanche diff calculation against base hash
      const diff = Crypto.calculateBitDiff(baseHash, currentHash);
      avalancheText.textContent = `${diff.percentage}%`;
      avalancheFill.style.width = `${diff.percentage}%`;
      avalancheDetail.textContent = `${diff.flippedBits} / 256 bits flipped vs baseline`;

      // Check leading zeros
      const leadingZeros = Crypto.countLeadingZeros(currentHash);
      if (leadingZeros > 0) {
        hashZeroStatus.textContent = `★ ${leadingZeros} LEADING ZERO${leadingZeros > 1 ? 'S' : ''}!`;
        hashZeroStatus.style.color = 'var(--accent-green)';
        hashDisplay.style.borderColor = 'var(--accent-green)';
      } else {
        hashZeroStatus.textContent = 'No Leading Zeros';
        hashZeroStatus.style.color = 'var(--text-muted)';
        hashDisplay.style.borderColor = 'var(--accent-cyan)';
      }

      // Emit event for canvas scene
      eventBus.emit('HASH_UPDATED', {
        input: currentInput,
        nonce: currentNonce,
        hash: currentHash,
        avalancheRate: diff.percentage
      });

      // Callback to Mission Manager
      if (onStateChange) {
        onStateChange({
          input: currentInput,
          nonce: currentNonce,
          hash: currentHash,
          avalanche: diff
        });
      }
    }

    dataInput.addEventListener('input', updateHash);
    nonceSlider.addEventListener('input', updateHash);
    btnInc.addEventListener('click', () => {
      nonceSlider.value = parseInt(nonceSlider.value, 10) + 1;
      updateHash();
    });
    btnRand.addEventListener('click', () => {
      nonceSlider.value = Math.floor(Math.random() * 100);
      updateHash();
    });

    // Initial trigger
    updateHash();
  }
};
