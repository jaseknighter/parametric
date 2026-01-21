/**
 * @fileoverview ParametricDiagnostics.js
 * JSDoc: Handles performance metrics, ASCII visualization, and health checks.
 */
export const createDiagnostics = (iterations) => {
  const stats = {
    totalRequests: 0,
    actualRenders: 0,
    staleRenders: 0,
    latencies: [],
    lastCheckSum: -1
  };

  return {
    reset: () => {
      stats.totalRequests = 0;
      stats.actualRenders = 0;
      stats.staleRenders = 0;
      stats.latencies = [];
    },

    recordLatency: (ms) => stats.latencies.push(ms),
    incrementRender: () => stats.actualRenders++,
    incrementRequest: () => stats.totalRequests++,

    /**
     * verifyIntegrity
     * Checks if geometry actually changed to detect stale worker responses.
     */
    verifyIntegrity: (positions, isStable) => {
      if (!positions) return;
      const currentCheckSum = positions[0] + positions[10] + positions[100];
      if (!isStable && currentCheckSum === stats.lastCheckSum && stats.totalRequests > 1) {
        stats.staleRenders++;
      }
      stats.lastCheckSum = currentCheckSum;
    },

    getAverageLatency: () => 
      stats.latencies.reduce((a, b) => a + b, 0) / (stats.latencies.length || 1),

    /**
     * getAsciiBar
     * Visualizes Avg (█) vs Max/Spike (▒)
     */
    getAsciiBar: (maxScale = 50) => {
      const latencies = stats.latencies;
      const avg = latencies.reduce((a, b) => a + b, 0) / (latencies.length || 1);
      const last = latencies[latencies.length - 1] || 0;
      
      const avgChars = Math.min(Math.floor((avg / maxScale) * 20), 20);
      const spikeChars = Math.min(Math.floor((last / maxScale) * 20), 20);
      
      let bar = "";
      for (let i = 0; i < 20; i++) {
        if (i < avgChars) bar += "█";
        else if (i < spikeChars) bar += "▒";
        else bar += "░";
      }
      return `${bar} Avg: ${avg.toFixed(1)}ms (Last: ${last.toFixed(1)}ms)`;
    },

    getReport: (label, steps, duration) => ({
      Pass: label,
      Res: `${steps}x${steps}`,
      AvgLat_raw: stats.latencies.reduce((a, b) => a + b, 0) / (stats.latencies.length || 1),
      FPS: (stats.actualRenders / (duration / 1000)).toFixed(1),
      Health: stats.staleRenders > (iterations * 0.2) ? "❌" : "✅"
    })
  };
};