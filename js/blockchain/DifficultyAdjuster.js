import { eventBus } from '../core/EventBus.js';

/**
 * DifficultyAdjuster - Simulates Bitcoin's self-regulating difficulty adjustment in compressed time.
 * In Bitcoin: Retargets every 2,016 blocks to maintain ~10 minute block time.
 * In Blockchain Quest: Retargets based on a rolling window of blocks to maintain ~5.0 second block time.
 */
export class DifficultyAdjuster {
  constructor() {
    this.targetBlockTime = 5.0; // Target block cadence in seconds
    this.retargetWindow = 5;    // Evaluate every 5 blocks (or rolling 10)
    this.autoAdjustEnabled = true;
    this.hashrateMultiplier = 1.0; // 0.2x (crash), 1.0x (normal), 3.0x (pool), 5.0x (ASIC surge)
    this.minDifficulty = 1;
    this.maxDifficulty = 5;

    // Seed initial block history to allow immediate chart rendering
    this.blockHistory = [
      { blockIndex: 1, blockTimeSec: 4.8, difficulty: 2, hashRate: 5100, timestamp: Date.now() - 40000 },
      { blockIndex: 2, blockTimeSec: 5.2, difficulty: 2, hashRate: 5300, timestamp: Date.now() - 30000 },
      { blockIndex: 3, blockTimeSec: 5.0, difficulty: 2, hashRate: 5200, timestamp: Date.now() - 20000 }
    ];

    this.blocksSinceRetarget = 3;
    this.lastAdjustment = null;
  }

  setHashrateMultiplier(mult) {
    this.hashrateMultiplier = Math.max(0.1, Math.min(10.0, mult));
    eventBus.emit('HASHRATE_MODIFIER_CHANGED', {
      multiplier: this.hashrateMultiplier,
      label: this.getHashrateLabel(this.hashrateMultiplier)
    });
  }

  getHashrateLabel(mult = this.hashrateMultiplier) {
    if (mult <= 0.3) return '0.2x Hashrate Crash 📉';
    if (mult <= 1.2) return '1.0x Normal Hashrate ⚖️';
    if (mult <= 3.5) return '3.0x Mining Pool Boom ⚡';
    return '5.0x Global ASIC Surge 🚀';
  }

  setAutoAdjust(enabled) {
    this.autoAdjustEnabled = Boolean(enabled);
    eventBus.emit('AUTO_ADJUST_TOGGLED', { enabled: this.autoAdjustEnabled });
  }

  recordBlockMined(blockIndex, elapsedSec, currentDifficulty, hashRate = 5000) {
    const entry = {
      blockIndex,
      blockTimeSec: Number(Math.max(0.1, elapsedSec).toFixed(2)),
      difficulty: currentDifficulty,
      hashRate,
      timestamp: Date.now()
    };

    this.blockHistory.push(entry);
    if (this.blockHistory.length > 20) {
      this.blockHistory.shift();
    }

    this.blocksSinceRetarget++;

    let retargetResult = null;
    if (this.autoAdjustEnabled && this.blocksSinceRetarget >= this.retargetWindow) {
      retargetResult = this.evaluateRetarget(currentDifficulty);
      this.blocksSinceRetarget = 0;
    }

    eventBus.emit('BLOCK_TIME_RECORDED', {
      entry,
      avgTime: this.getAverageBlockTime(),
      retargetResult
    });

    return retargetResult;
  }

  getAverageBlockTime(windowSize = 10) {
    const slice = this.blockHistory.slice(-windowSize);
    if (slice.length === 0) return this.targetBlockTime;
    const sum = slice.reduce((acc, curr) => acc + curr.blockTimeSec, 0);
    return Number((sum / slice.length).toFixed(2));
  }

  evaluateRetarget(currentDifficulty) {
    const avgTime = this.getAverageBlockTime(this.retargetWindow);
    let newDiff = currentDifficulty;
    let reason = 'In equilibrium: average block time matches target (~5s)';

    if (avgTime < 3.8 && currentDifficulty < this.maxDifficulty) {
      newDiff = currentDifficulty + 1;
      reason = `Blocks solved too fast (${avgTime}s < ${this.targetBlockTime}s target). Increasing difficulty to maintain 5s cadence.`;
    } else if (avgTime > 6.5 && currentDifficulty > this.minDifficulty) {
      newDiff = currentDifficulty - 1;
      reason = `Blocks solved too slowly (${avgTime}s > ${this.targetBlockTime}s target). Decreasing difficulty to maintain 5s cadence.`;
    }

    const adjusted = newDiff !== currentDifficulty;
    const result = {
      adjusted,
      oldDiff: currentDifficulty,
      newDiff,
      avgTime,
      targetTime: this.targetBlockTime,
      ratio: Number((this.targetBlockTime / (avgTime || 0.1)).toFixed(2)),
      reason
    };

    if (adjusted) {
      this.lastAdjustment = result;
      eventBus.emit('DIFFICULTY_RETARGETED', result);
    }

    return result;
  }

  renderSVGChart(width = 380, height = 140) {
    const padding = { top: 20, right: 35, bottom: 25, left: 35 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const history = this.blockHistory.slice(-12);
    if (history.length === 0) {
      return `<svg width="${width}" height="${height}"><text x="50%" y="50%" fill="#94a3b8" font-size="11" text-anchor="middle">No mining data yet</text></svg>`;
    }

    const maxTime = Math.max(10, ...history.map(h => h.blockTimeSec), this.targetBlockTime * 1.5);
    const timeToY = (t) => padding.top + chartH - (t / maxTime) * chartH;
    const diffToY = (d) => padding.top + chartH - ((d - 1) / 4) * chartH;
    const stepX = chartW / Math.max(1, history.length - 1);
    const getX = (idx) => padding.left + idx * stepX;

    const targetY = timeToY(this.targetBlockTime);
    const targetLineSvg = `
      <line x1="${padding.left}" y1="${targetY}" x2="${width - padding.right}" y2="${targetY}" stroke="rgba(0, 240, 255, 0.4)" stroke-dasharray="4,4" stroke-width="1.5" />
      <text x="${padding.left + 4}" y="${targetY - 4}" fill="#00f0ff" font-family="monospace" font-size="9">Target: 5.0s</text>
    `;

    let timePathD = '';
    const timeCircles = [];
    history.forEach((h, idx) => {
      const x = getX(idx);
      const y = timeToY(h.blockTimeSec);
      if (idx === 0) timePathD += `M ${x} ${y}`;
      else timePathD += ` L ${x} ${y}`;

      const color = h.blockTimeSec < 3.8 ? '#00f0ff' : (h.blockTimeSec > 6.5 ? '#ff3366' : '#00ff88');
      timeCircles.push(`
        <circle cx="${x}" cy="${y}" r="3.5" fill="${color}" stroke="#0b111e" stroke-width="1.5">
          <title>Block #${h.blockIndex}: ${h.blockTimeSec}s (Diff ${h.difficulty})</title>
        </circle>
      `);
    });

    let diffPathD = '';
    history.forEach((h, idx) => {
      const x = getX(idx);
      const y = diffToY(h.difficulty);
      if (idx === 0) diffPathD += `M ${x} ${y}`;
      else {
        diffPathD += ` L ${x} ${diffToY(history[idx - 1].difficulty)} L ${x} ${y}`;
      }
    });

    return `
      <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible; background: rgba(0,0,0,0.3); border-radius: 6px;">
        <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
        <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${padding.top + chartH}" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
        <line x1="${width - padding.right}" y1="${padding.top}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="rgba(255,255,255,0.1)" stroke-width="1" />

        ${targetLineSvg}

        <path d="${timePathD}" fill="none" stroke="rgba(0, 255, 136, 0.7)" stroke-width="1.5" />
        ${timeCircles.join('')}

        <path d="${diffPathD}" fill="none" stroke="#ffb703" stroke-width="2.5" />

        <text x="${padding.left - 6}" y="${padding.top + 8}" fill="#00ff88" font-family="monospace" font-size="8" text-anchor="end">${maxTime.toFixed(0)}s</text>
        <text x="${padding.left - 6}" y="${padding.top + chartH}" fill="#94a3b8" font-family="monospace" font-size="8" text-anchor="end">0s</text>

        <text x="${width - padding.right + 6}" y="${padding.top + 8}" fill="#ffb703" font-family="monospace" font-size="8" text-anchor="start">D5</text>
        <text x="${width - padding.right + 6}" y="${padding.top + chartH}" fill="#ffb703" font-family="monospace" font-size="8" text-anchor="start">D1</text>

        <g transform="translate(${padding.left + 80}, ${padding.top - 8})">
          <circle cx="0" cy="0" r="3" fill="#00ff88" />
          <text x="6" y="3" fill="#00ff88" font-family="monospace" font-size="8.5">Time (s)</text>
          <line x1="60" y1="0" x2="75" y2="0" stroke="#ffb703" stroke-width="2" />
          <text x="80" y="3" fill="#ffb703" font-family="monospace" font-size="8.5">Difficulty (1-5)</text>
        </g>
      </svg>
    `;
  }
}

export const difficultyAdjuster = new DifficultyAdjuster();
