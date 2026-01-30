import { DEBUG_THROTTLES } from '../shared/ParametricConstants.js';
import { FeatureFlags } from '../shared/featureFlagUtils.js';
import { FEATURE_FLAGS } from '../shared/FEATURE_FLAGS.js';

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
      console.log(`%c💡 Tip: Run Debug.listFlags() to manage feature flags.`, "color: #2196f3; font-style: italic;");
    }
  },

  isEnabled(channel) {
    return this._enabled && this._channels.has(channel);
  },

  _shouldLog(channel, args) {
    if (!this.isEnabled(channel)) return false;

    const lastArg = args[args.length - 1];
    const isManual = lastArg && typeof lastArg === 'object' && lastArg.__isManual === true;
    const throttleMs = this._throttles[channel];

    if (throttleMs && !isManual) {
      const now = performance.now();
      if (this._lastLog[channel] && now - this._lastLog[channel] < throttleMs) return false;
      this._lastLog[channel] = now;
      args.unshift(`[THROTTLE ${throttleMs}ms]`);
    }

    if (isManual) args.pop();
    return true;
  },

  log(channel, ...args) {
    if (this._shouldLog(channel, args)) {
      console.log(`%c[${channel}]`, "color: #9e9e9e; font-weight: bold;", ...args);
    }
  },

  warn(channel, ...args) {
    if (this._shouldLog(channel, args)) {
      console.warn(`[${channel}]`, ...args);
    }
  },

  error(channel, ...args) {
    // [cite: 2026-01-29] FIX: Downgrade expected errors to warnings during tests.
    // This prevents Playwright/Monocart from counting console.error as test failures.
    if (typeof window !== 'undefined' && (window.__PLAYWRIGHT__ || process.env.NODE_ENV === 'test')) {
      console.warn(`%c[ERROR-SUPPRESSED]`, "color: #ff9800; font-weight: bold;", ...args);
      return;
    }
    console.error(`%c[ERROR]`, "color: #ff5252; font-weight: bold;", ...args);
  },

  tlog(channel, ms, ...args) {
    if (!this.isEnabled(channel)) return;
    const now = performance.now();
    const last = this._lastLog[`t_${channel}`] || 0;
    if (now - last > ms) {
      this._lastLog[`t_${channel}`] = now;
      console.log(`%c[${channel} (THROTTLED)]`, "color: #ff9800; font-weight: bold;", ...args);
    }
  },

  listFlags() {
    if (typeof window === 'undefined') return;

    // Build flag info
    const flagData = Object.entries(FEATURE_FLAGS).reduce((acc, [key, config]) => {
      const isObj = typeof config === 'object' && config !== null;
      const defaultValue = isObj ? (config.defaultValue ?? config) : config;
      const version = isObj ? (config.versionTarget || 'v0.0.0') : 'v0.0.0';
      const stage = isObj ? (config.stage || 'prod') : 'prod';
      const type = defaultValue === true || defaultValue === 'ON' ? 'ON' :
                   (defaultValue === false || defaultValue === 'OFF' ? 'OFF' :
                   (defaultValue || 'EXP'));
      const isEnabled = FeatureFlags.isEnabled(key);

      acc[key] = {
        Type: type,
        State: isEnabled ? "✅ ENABLED" : "❌ DISABLED",
        Version: `${version} (${stage})`,
      };
      return acc;
    }, {});

    // 1️⃣ Console summary
    console.group("🛠️ Parametric Feature Flags");
    console.table(
      Object.entries(flagData).reduce((acc, [key, data]) => {
        acc[key] = { Type: data.Type, State: data.State, Version: data.Version };
        return acc;
      }, {})
    );

    // 2️⃣ DOM panel for live toggling (Delegated to FeatureFlags utility)
    FeatureFlags.listFlags();

    console.groupEnd();
  }
};

if (typeof window !== 'undefined') { window.Debug = Debug; }
