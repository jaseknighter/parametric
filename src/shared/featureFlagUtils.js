import { FEATURE_FLAGS, FLAG_STATE } from './FEATURE_FLAGS.js';

/**
 * Internal helper to enforce the "Comma-Separated Contract"
 */
const getFlagArray = (params, key) => {
  const val = params.get(key) || '';
  return val.split(',').map(s => s.trim()).filter(Boolean);
};

export function isFeatureEnabled(flagName) {
  let flagState = FEATURE_FLAGS[flagName];

  // [cite: 2026-01-27] FIX: Support object-based config (v0.5.0.1+)
  if (typeof flagState === 'object' && flagState !== null) {
    flagState = flagState.defaultValue;
  }

  if (!flagState || flagState === FLAG_STATE.OFF) return false;

  const urlParams = new URLSearchParams(window.location.search);

  if (flagState === FLAG_STATE.ON) {
    // Allow disabling via URL: ?flag_off=featureName
    const offFlags = getFlagArray(urlParams, 'flag_off');
    return !offFlags.includes(flagName);
  }

  // EXP mode: only enabled if URL contains ?flag_on=<flagName>
  if (flagState === FLAG_STATE.EXP) {
    const onFlags = getFlagArray(urlParams, 'flag_on');
    return onFlags.includes(flagName);
  }

  return false;
}

/**
 * Lightweight runtime feature flag manager
 */
export const FeatureFlags = {
  listFlagsContainerId: '__debugFlagPanel',

  isEnabled(key) {
    return isFeatureEnabled(key);
  },

  setFlag(key, enable) {
    const url = new URL(window.location.href);
    const searchParams = url.searchParams;

    // [cite: 2026-01-27] FIX: robust parsing and cleaning of flags
    let onFlags = (searchParams.get('flag_on') || '').split(',').map(s => s.trim()).filter(Boolean);
    let offFlags = (searchParams.get('flag_off') || '').split(',').map(s => s.trim()).filter(Boolean);

    // 1. Remove key from BOTH lists to start fresh (prevents conflicts)
    onFlags = onFlags.filter(f => f !== key);
    offFlags = offFlags.filter(f => f !== key);

    if (enable) {
      onFlags.push(key);
    } else {
      offFlags.push(key);
    }

    if (onFlags.length) searchParams.set('flag_on', onFlags.join(','));
    else searchParams.delete('flag_on');

    if (offFlags.length) searchParams.set('flag_off', offFlags.join(','));
    else searchParams.delete('flag_off');

    // [cite: 2026-01-27] DX: Sticky panel persistence
    searchParams.set('showFlags', 'true');

    // [cite: 2026-01-27] SAFARI FIX: Silent Reload Strategy
    // 1. Update URL without navigating to sync state
    window.history.replaceState({}, '', url.toString());

    // 2. Trigger clean reload to allow Vite/Safari to teardown gracefully
    queueMicrotask(() => {
      window.location.reload();
    });
  },

  listFlags() {
    if (typeof window === 'undefined') return;

    let container = document.getElementById(this.listFlagsContainerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.listFlagsContainerId;
      Object.assign(container.style, {
        position: 'fixed',
        bottom: '150px',
        left: '40px',
        width: '400px',
        height: '200px',
        zIndex: 99999,
        backgroundColor: '#1e1e1e',
        color: '#fff',
        border: '1px solid #666',
        padding: '10px',
        maxHeight: '90vh',
        overflowY: 'scroll',
        fontFamily: 'monospace',
        fontSize: '13px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
      });
      document.body.appendChild(container);
    }

    // 2. Statement of Intent & Instruction
    container.innerHTML = `
      <div id="ff-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; cursor: grab; background: #2a2a2a; padding: 5px; border-radius: 4px; user-select: none;">
        <strong style="color:#4da3ff; pointer-events: none;">Feature Flags</strong>
        <button id="ff-close" style="background:none; border:none; color:#888; cursor:pointer;">[x]</button>
      </div>
      <div style="margin-bottom:10px; padding:5px; background:#222; border-left:3px solid #fbc02d; font-size:10px;">
        Note: Refresh browser to apply changes.
      </div>
    `;

    // Wire up Close
    container.querySelector('#ff-close').onclick = () => container.remove();

    // Wire up Drag
    const header = container.querySelector('#ff-header');
    header.onmousedown = (e) => {
      e.preventDefault();
      header.style.cursor = 'grabbing';
      
      const startX = e.clientX;
      const startY = e.clientY;
      const rect = container.getBoundingClientRect();
      const startLeft = rect.left;
      const startTop = rect.top;

      // Switch to top/left positioning to support drag
      container.style.bottom = 'auto';
      container.style.right = 'auto';
      container.style.left = `${startLeft}px`;
      container.style.top = `${startTop}px`;

      const onMouseMove = (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        container.style.left = `${startLeft + dx}px`;
        container.style.top = `${startTop + dy}px`;
      };

      const onMouseUp = () => {
        header.style.cursor = 'grab';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    Object.entries(FEATURE_FLAGS).forEach(([key, config]) => {
      const runtimeEnabled = this.isEnabled(key);
      const row = document.createElement('div');
      row.style.cssText = "display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #333; padding-bottom:4px;";
      
      const label = document.createElement('span');
      label.innerHTML = `<span style="color:${runtimeEnabled ? '#4dff88' : '#ff4d4d'}">${runtimeEnabled ? '✅' : '❌'}</span> ${key}`;

      if (runtimeEnabled) {
        const disableBtn = document.createElement('button');
        disableBtn.textContent = 'Disable';
        disableBtn.style.cssText = "padding:2px 8px; cursor:pointer; background:#333; color:#fff; border:1px solid #666;";
        disableBtn.onclick = () => {
          this.setFlag(key, false);
        };
        row.appendChild(label);
        row.appendChild(disableBtn);
      } else {
        const enableBtn = document.createElement('button');
        enableBtn.textContent = 'Enable';
        enableBtn.style.cssText = "padding:2px 8px; cursor:pointer; background:#333; color:#fff; border:1px solid #666;";
        enableBtn.onclick = () => {
          this.setFlag(key, true);
        };
        row.appendChild(label);
        row.appendChild(enableBtn);
      }

      container.appendChild(row);
    });
  },
};

if (typeof window !== 'undefined') {
  window.FeatureFlags = FeatureFlags;
  window.listFeatureFlags = () => {
    const summary = Object.keys(FEATURE_FLAGS).map(key => ({
      'Flag Name': key,
      'Enabled': isFeatureEnabled(key) ? '✅ YES' : '❌ NO',
      'Config Mode': typeof FEATURE_FLAGS[key] === 'object' ? 'CONFIG' : FEATURE_FLAGS[key]
    }));
    console.table(summary);
  };
}