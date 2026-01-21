import { DEBUG_THROTTLES } from '../shared/ParametricConstants';

/**
 * @fileoverview debug.js
 * ULTRA-LIGHTWEIGHT OBSERVABILITY
 */

export const Debug = {
  _enabled: false,
  _channels: new Set(),
  _throttles: DEBUG_THROTTLES,
  _lastLog: {},

  init({ enabled = false, channels = [] } = {}) {
    this._enabled = enabled;
    this._channels = new Set(channels);
    if (this._enabled) {
      console.log(`%c🛠️ Debug Configured: [${[...this._channels].join(", ")}]`, "color: #2196f3; font-weight: bold;");
    }
  },

  isEnabled(channel) {
    return this._enabled && this._channels.has(channel);
  },

  /**
   * Internal logic to determine if a log should be suppressed
   * @returns {boolean} True if we should proceed with logging
   */
  _shouldLog(channel, args) {
    if (!this.isEnabled(channel)) return false;

    // Look specifically at the last argument for our internal debug flag
    const lastArg = args[args.length - 1];
    const isManual = lastArg && typeof lastArg === 'object' && lastArg.__isManual === true;

    const throttleMs = this._throttles[channel];
    
    if (throttleMs && !isManual) {
      const now = performance.now();
      if (this._lastLog[channel] && now - this._lastLog[channel] < throttleMs) {
        return false; 
      }
      this._lastLog[channel] = now;
      args.unshift(`[ANIMATION HEARTBEAT ${throttleMs}ms]`);
    }
    
    // If we used the metadata argument, pop it so it doesn't show in the console
    if (isManual) args.pop(); 

    return true;
  },
  log(channel, ...args) {
    if (this._shouldLog(channel, args)) {
      console.log(`%c[${channel}]`, "color: #9e9e9e; font-weight: bold;", ...args);
    }
  },

  warn(channel, ...args) {
    // Warnings follow the same throttle/manual rules to prevent flood during edit errors
    if (this._shouldLog(channel, args)) {
      console.warn(`[${channel}]`, ...args);
    }
  },

  error(channel, ...args) {
    // Errors bypass all filters; they are critical signals
    console.error(`%c[ ERROR]`, "color: #ff5252; font-weight: bold;", ...args);
  },

  /**
   * Manual override for one-off high-frequency logging
   */
  tlog(channel, ms, ...args) {
    if (!this.isEnabled(channel)) return;
    const now = performance.now();
    const last = this._lastLog[`t_${channel}`] || 0;
    
    if (now - last > ms) {
      this._lastLog[`t_${channel}`] = now;
      console.log(`%c[${channel} (THROTTLED)]`, "color: #ff9800; font-weight: bold;", ...args);
    }
  }
};

if (typeof window !== 'undefined') { window.Debug = Debug; }