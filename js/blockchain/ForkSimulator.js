// ForkSimulator.js
// Simulates soft forks and hard forks with both backward-compatible and
// chain-splitting scenarios. Integrates with Level 5 Defender.
import { eventBus } from '../core/EventBus.js';

// ── Event Constants ───────────────────────────────────────────────────────────
export const FORK_SIM_EVENTS = {
  RESET:           'FORK_SIM_RESET',
  FORK_TRIGGERED:  'FORK_SIM_TRIGGERED',
  BLOCK_ADDED:     'FORK_SIM_BLOCK_ADDED',
  OLD_NODE_ACCEPT: 'FORK_SIM_OLD_NODE_ACCEPTED',
  OLD_NODE_REJECT: 'FORK_SIM_OLD_NODE_REJECTED',
  CHAIN_SPLIT:     'FORK_SIM_CHAIN_SPLIT',
  SHOW_MODAL:      'SHOW_FORK_MODAL',
};

// ── ForkSimulator Class ───────────────────────────────────────────────────────
export class ForkSimulator {
  constructor() {
    this._active = false;
    this.reset();
  }

  // ── Activation ──────────────────────────────────────────────────────────────
  get isActive() { return this._active; }
  setActive(val) {
    this._active = !!val;
    if (!val) this.reset();
    eventBus.emit(val ? 'FORK_SIM_ACTIVATED' : 'FORK_SIM_DEACTIVATED');
  }

  activate() {
    this.setActive(true);
  }

  deactivate() {
    this.setActive(false);
  }

  // ── Full State Reset ─────────────────────────────────────────────────────────
  reset() {
    // Shared trunk — blocks before the fork
    this.trunk = [
      { id: 'A0', label: 'Genesis', height: 0, rule: 'v1', valid: true },
      { id: 'A1', label: 'Block 1', height: 1, rule: 'v1', valid: true },
      { id: 'A2', label: 'Block 2', height: 2, rule: 'v1', valid: true },
      { id: 'A3', label: 'Block 3', height: 3, rule: 'v1', valid: true },
    ];

    // Two fork branches
    this.forkA = [];  // canonical / upgraded chain
    this.forkB = [];  // minority / legacy chain

    // Node pools
    this.upgradedNodes  = this._makeNodes('upgraded',  5, 'v2');  // always on A
    this.legacyNodes    = this._makeNodes('legacy',    5, 'v1');  // behaviour depends on mode

    this.forkMode   = null;   // null | 'soft' | 'hard'
    this.forkState  = 'pre';  // 'pre' | 'forked' | 'resolved' | 'split'
    this.forkHeight = 4;      // fork diverges at height 4
    this.verdict    = null;   // summary string for UI

    // Events log
    this.eventLog = [];
    eventBus.emit(FORK_SIM_EVENTS.RESET);
  }

  // ── Internal helpers ─────────────────────────────────────────────────────────
  _makeNodes(role, count, version) {
    return Array.from({ length: count }, (_, i) => ({
      id:      `${role}_${i}`,
      label:   `Node ${String.fromCharCode(65 + i)}`,
      version,
      role,
      accepts: null,  // null | 'new' | 'reject'
    }));
  }

  _log(msg) {
    this.eventLog.unshift({ ts: Date.now(), msg });
    if (this.eventLog.length > 20) this.eventLog.pop();
  }

  // ── Trigger Fork ─────────────────────────────────────────────────────────────
  /**
   * @param {'soft'|'hard'} mode
   */
  triggerFork(mode) {
    if (this.forkState !== 'pre') return;
    this.forkMode  = mode;
    this.forkState = 'forked';

    if (mode === 'soft') {
      // SOFT FORK – new rule tightens validation (SegWit style)
      // New blocks follow stricter rule v2 but are still valid under old v1 rules
      this.forkA = [
        { id: 'B4',  label: 'Block 4',  height: 4,  rule: 'v2', valid: true, note: 'SegWit-style: data in witness field' },
        { id: 'B5',  label: 'Block 5',  height: 5,  rule: 'v2', valid: true, note: 'Upgraded node proposes' },
        { id: 'B6',  label: 'Block 6',  height: 6,  rule: 'v2', valid: true, note: 'v2 rule enforced' },
      ];
      this.forkB = []; // Legacy nodes don't produce blocks — they simply follow the upgraded chain

      // Old (legacy) nodes accept new blocks — they look valid under v1 rules too
      this.legacyNodes.forEach(n => {
        n.accepts = 'accept'; // Backward compatible!
        n.note = 'Block satisfies old rule — accepted silently';
      });
      this.upgradedNodes.forEach(n => {
        n.accepts = 'accept';
        n.note = 'Block satisfies new strict rule — accepted';
      });

      this.verdict = 'SOFT FORK: All nodes follow a single chain. Legacy nodes accept new blocks because they still satisfy v1 rules. No split.';
      this.forkState = 'resolved';
      this._log('⬅ Soft fork triggered: v2 rule is a strict subset of v1. No network split.');
      this._log('✅ All 10 nodes converge on the upgraded chain (single canonical chain).');
      eventBus.emit(FORK_SIM_EVENTS.OLD_NODE_ACCEPT);

    } else {
      // HARD FORK – new rule is incompatible (ETH / ETC style)
      // New blocks are INVALID under old v1 rules → chain permanently splits
      this.forkA = [
        { id: 'B4',  label: 'Block 4',  height: 4,  rule: 'v2', valid: true,  chain: 'ETH', note: 'EIP-1559 fee change (incompatible)' },
        { id: 'B5',  label: 'Block 5',  height: 5,  rule: 'v2', valid: true,  chain: 'ETH', note: 'Upgraded node proposes' },
        { id: 'B6',  label: 'Block 6',  height: 6,  rule: 'v2', valid: true,  chain: 'ETH', note: 'Mined on new ETH chain' },
      ];
      this.forkB = [
        { id: 'C4',  label: 'Block 4',  height: 4,  rule: 'v1', valid: true,  chain: 'ETC', note: 'Legacy nodes reject v2 blocks and mine their own' },
        { id: 'C5',  label: 'Block 5',  height: 5,  rule: 'v1', valid: true,  chain: 'ETC', note: 'Old chain continues' },
        { id: 'C6',  label: 'Block 6',  height: 6,  rule: 'v1', valid: true,  chain: 'ETC', note: 'Legacy miners keep going' },
      ];

      // Legacy nodes REJECT the new chain
      this.legacyNodes.forEach(n => {
        n.accepts = 'reject';
        n.note = 'v2 block violates old rule — REJECTED — follows ETC chain';
      });
      this.upgradedNodes.forEach(n => {
        n.accepts = 'accept';
        n.note = 'v2 block valid — follows ETH chain';
      });

      this.verdict = 'HARD FORK: Network permanently splits. v2 upgraded nodes follow ETH. v1 legacy nodes follow ETC. Two separate chains co-exist forever.';
      this.forkState = 'split';
      this._log('💥 Hard fork triggered: v2 block is INVALID under old rules. Network splits!');
      this._log('🔵 Upgraded nodes (×5): follow ETH chain (EIP-1559)');
      this._log('🟠 Legacy nodes (×5): reject ETH blocks — mine ETC legacy chain');
      eventBus.emit(FORK_SIM_EVENTS.OLD_NODE_REJECT);
      eventBus.emit(FORK_SIM_EVENTS.CHAIN_SPLIT);
    }

    eventBus.emit(FORK_SIM_EVENTS.FORK_TRIGGERED, { mode });
  }

  // ── Continue Chain Post-Fork ──────────────────────────────────────────────────
  addBlock() {
    if (this.forkState === 'pre') return null;
    const len = this.forkA.length;
    const height = this.forkHeight + len;
    const blockA = { id: `B${height}`, label: `Block ${height}`, height, rule: 'v2', valid: true, chain: this.forkMode === 'hard' ? 'ETH' : 'main' };
    this.forkA.push(blockA);
    if (this.forkMode === 'hard') {
      const blockB = { id: `C${height}`, label: `Block ${height}`, height, rule: 'v1', valid: true, chain: 'ETC' };
      this.forkB.push(blockB);
    }
    this._log(`📦 Block ${height} added (${this.forkMode === 'hard' ? 'ETH + ETC' : 'main chain'})`);
    eventBus.emit(FORK_SIM_EVENTS.BLOCK_ADDED, { height });
    return blockA;
  }

  // ── Show Educational Modal ────────────────────────────────────────────────────
  openModal() {
    eventBus.emit(FORK_SIM_EVENTS.SHOW_MODAL);
  }

  // ── State Snapshot ────────────────────────────────────────────────────────────
  getState() {
    return {
      active:         this._active,
      forkMode:       this.forkMode,
      forkState:      this.forkState,
      trunk:          [...this.trunk],
      forkA:          [...this.forkA],
      forkB:          [...this.forkB],
      upgradedNodes:  this.upgradedNodes.map(n => ({ ...n })),
      legacyNodes:    this.legacyNodes.map(n => ({ ...n })),
      verdict:        this.verdict,
      eventLog:       [...this.eventLog],
    };
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────
export const forkSimulator = new ForkSimulator();
