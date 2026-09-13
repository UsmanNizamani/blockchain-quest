import { eventBus } from '../core/EventBus.js';

export class NetworkNode {
  constructor(id, name, role, avatar) {
    this.id = id;
    this.name = name;
    this.role = role;
    this.avatar = avatar;
    this.status = 'idle'; // 'idle' | 'checking' | 'approved' | 'rejected'
    this.failureReason = '';
    this.checks = {
      sig: { name: "Signature Valid", status: 'pending' },
      balance: { name: "Sufficient Balance", status: 'pending' },
      nonce: { name: "Nonce Correct (N+1)", status: 'pending' },
      doubleSpend: { name: "Not a Double-Spend", status: 'pending' }
    };
  }

  reset() {
    this.status = 'idle';
    this.failureReason = '';
    this.checks = {
      sig: { name: "Signature Valid", status: 'pending' },
      balance: { name: "Sufficient Balance", status: 'pending' },
      nonce: { name: "Nonce Correct (N+1)", status: 'pending' },
      doubleSpend: { name: "Not a Double-Spend", status: 'pending' }
    };
  }
}

export class NodeNetwork {
  constructor() {
    this.nodes = [
      new NetworkNode('node_alpha', 'Node Alpha', 'Validator Terminal', '🛡️'),
      new NetworkNode('node_beta', 'Node Beta', 'Full Node Core', '🖥️'),
      new NetworkNode('node_gamma', 'Node Gamma', 'Mining Validator', '⚡'),
      new NetworkNode('node_delta', 'Node Delta', 'Archive Peer', '🤖')
    ];
    this.isBroadcasting = false;
    this.activeScenario = 'VALID';
    this.currentTx = null;
    this._watchdog = null;
    console.log('[node-network] init', this.nodes.length, 'nodes');
  }

  /**
   * Alias for resetAll
   */
  reset() {
    this.resetAll();
  }

  /**
   * Reset all nodes to idle state
   */
  resetAll() {
    if (this._watchdog) {
      clearTimeout(this._watchdog);
      this._watchdog = null;
    }
    this.isBroadcasting = false;
    this.nodes.forEach(n => n.reset());
    eventBus.emit('NETWORK_RESET', { nodes: this.nodes });
  }

  /**
   * Broadcast a transaction to the network with an optional simulated attack scenario
   * @param {Object} tx
   * @param {'VALID'|'FORGED_SIGNATURE'|'INSUFFICIENT_FUNDS'|'BAD_NONCE'|'DOUBLE_SPEND'} attackScenario
   */
  broadcastTransaction(tx, attackScenario = 'VALID') {
    this.isBroadcasting = true;
    this.activeScenario = attackScenario;
    this.currentTx = tx;
    this.resetAll();
    this.isBroadcasting = true; // resetAll sets isBroadcasting = false

    // Watchdog: force-complete if nothing resolves within 15s (configurable for tests)
    const watchdogMs = this.watchdogTimeoutMs || 15000;
    if (this._watchdog) clearTimeout(this._watchdog);
    this._watchdog = setTimeout(() => {
      console.error('[node-network] watchdog fired — forcing completion');
      // Mark any still-checking nodes as 'error' so they render distinctly
      this.nodes.forEach(n => {
        if (n.status === 'checking') {
          n.status = 'error';
          n.failureReason = 'Verification timed out';
          eventBus.emit('NODE_VERIFIED', { node: n, allPass: false });
        }
      });
      this.isBroadcasting = false;

      const approvedCount = this.nodes.filter(n => n.status === 'approved').length;
      const rejectedCount = this.nodes.filter(n => n.status === 'rejected' || n.status === 'error').length;
      const consensusApproved = false;

      const summary = {
        approvedCount,
        rejectedCount,
        consensusApproved,
        attackScenario: this.activeScenario,
        tx: this.currentTx,
        watchdog: true
      };

      eventBus.emit('CONSENSUS_COMPLETED', summary);
      // Deprecated alias for backwards compatibility:
      eventBus.emit('BROADCAST_COMPLETED', summary);
    }, watchdogMs);

    eventBus.emit('BROADCAST_STARTED', {
      tx,
      nodes: this.nodes,
      attackScenario
    });

    const maybeFinish = () => {
      if (this.nodes.every(n => n.status === 'approved' || n.status === 'rejected' || n.status === 'error')) {
        if (!this.isBroadcasting) return; // idempotent — don't double-emit
        if (this._watchdog) {
          clearTimeout(this._watchdog);
          this._watchdog = null;
        }
        this.isBroadcasting = false;
        const approvedCount = this.nodes.filter(n => n.status === 'approved').length;
        const rejectedCount = this.nodes.filter(n => n.status === 'rejected' || n.status === 'error').length;
        const consensusApproved = approvedCount >= 3; // Supermajority

        const summary = {
          approvedCount,
          rejectedCount,
          consensusApproved,
          attackScenario: this.activeScenario,
          tx: this.currentTx
        };

        eventBus.emit('CONSENSUS_COMPLETED', summary);
        // Deprecated alias for backwards compatibility:
        eventBus.emit('BROADCAST_COMPLETED', summary);
      }
    };

    this.nodes.forEach((node, nodeIdx) => {
      node.status = 'checking';
      eventBus.emit('NODE_STATUS_CHANGED', { node });

      // Staggered asynchronous check execution for visual drama
      const baseDelay = 300 + nodeIdx * 70;

      const safeRun = (fn, label) => {
        try {
          fn();
        } catch (err) {
          console.error('[node-network] check failed:', node.id, label, err);
          node.status = 'rejected';
          node.failureReason = 'Internal verification error: ' + err.message;
          eventBus.emit('NODE_VERIFIED', { node, allPass: false });
          maybeFinish();
        }
      };

      // Check 1: Signature Valid?
      setTimeout(() => safeRun(() => {
        const pass = attackScenario !== 'FORGED_SIGNATURE';
        node.checks.sig.status = pass ? 'pass' : 'fail';
        if (!pass) node.failureReason = 'Cryptographic signature mismatch!';
        eventBus.emit('NODE_CHECK_PROGRESS', { node, checkKey: 'sig', pass });
      }, 'sig'), baseDelay + 250);

      // Check 2: Sufficient Balance?
      setTimeout(() => safeRun(() => {
        const pass = attackScenario !== 'INSUFFICIENT_FUNDS';
        node.checks.balance.status = pass ? 'pass' : 'fail';
        if (!pass && !node.failureReason) node.failureReason = 'Account balance lower than transfer amount!';
        eventBus.emit('NODE_CHECK_PROGRESS', { node, checkKey: 'balance', pass });
      }, 'balance'), baseDelay + 500);

      // Check 3: Nonce Correct?
      setTimeout(() => safeRun(() => {
        const pass = attackScenario !== 'BAD_NONCE';
        node.checks.nonce.status = pass ? 'pass' : 'fail';
        if (!pass && !node.failureReason) node.failureReason = 'Nonce sequence skipped or replayed!';
        eventBus.emit('NODE_CHECK_PROGRESS', { node, checkKey: 'nonce', pass });
      }, 'nonce'), baseDelay + 750);

      // Check 4: Not a Double-Spend?
      setTimeout(() => safeRun(() => {
        const pass = attackScenario !== 'DOUBLE_SPEND';
        node.checks.doubleSpend.status = pass ? 'pass' : 'fail';
        if (!pass && !node.failureReason) node.failureReason = 'UTXO/funds already pledged in mempool!';
        eventBus.emit('NODE_CHECK_PROGRESS', { node, checkKey: 'doubleSpend', pass });

        // Conclude Node verdict
        const allPass = Object.values(node.checks).every(c => c.status === 'pass');
        node.status = allPass ? 'approved' : 'rejected';
        eventBus.emit('NODE_VERIFIED', { node, allPass });

        maybeFinish();
      }, 'doubleSpend'), baseDelay + 1000);
    });
  }
}

export const nodeNetwork = new NodeNetwork();
