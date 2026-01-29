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
        height: '210px',
        zIndex: 99999,
        backgroundColor: '#1e1e1e',
        color: '#fff',
        border: '1px solid #666',
        padding: '10px',
        maxHeight: '90vh',
        fontFamily: 'monospace',
        fontSize: '13px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
        boxSizing: 'border-box', // [cite: 2026-01-28] FIX: Include padding/border in width calc
        display: 'flex', // [cite: 2026-01-28] LAYOUT: Flex column for sticky header
        flexDirection: 'column',
      });
      document.body.appendChild(container);
    }

    // 2. Statement of Intent & Instruction
    container.innerHTML = `
      <div id="ff-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; cursor: grab; background: #2a2a2a; padding: 5px; border-radius: 4px; user-select: none;">
        <strong style="color:#4da3ff; pointer-events: none;">Feature Flags</strong>
        <button id="ff-close" style="background:none; border:none; color:#888; cursor:pointer;">[x]</button>
      </div>
      <div id="ff-content" style="flex: 1; overflow-y: auto; min-height: 0;">
        <div style="margin-bottom:10px; padding:5px; background:#222; border-left:3px solid #fbc02d; font-size:10px;">
          Note: Refresh browser to apply changes.
        </div>
      </div>
    `;
    const contentArea = container.querySelector('#ff-content');

    // Wire up Close
    container.querySelector('#ff-close').onclick = () => container.remove();

    // [cite: 2026-01-28] BOUNDARY: Centralized enforcement logic with resizing
    const updatePosition = (targetX, targetY) => {
      const headerHeight = 60;
      const baseWidth = 400;
      const baseHeight = 210; // Fixed height from creation
      const viewportW = window.innerWidth; // [cite: 2026-01-28] FIX: Flush right against edge
      const viewportH = window.innerHeight;

      const containerEl = document.querySelector('.Container');
      const layoutMode = containerEl && containerEl.classList.contains('layout-mobile') ? 'mobile' : 'desktop';
      
      const interfaceEl = document.querySelector('.Interface_Container');
      const canvasEl = document.querySelector('.Three_Grid_Area');
      
      let minX = 0;
      let maxY = viewportH - baseHeight;

      if (layoutMode === 'desktop') {
        if (canvasEl) minX = canvasEl.getBoundingClientRect().left;
        if (interfaceEl) {
           const iRect = interfaceEl.getBoundingClientRect();
           if (iRect.top < viewportH && iRect.top > headerHeight) {
             maxY = Math.min(maxY, iRect.top - baseHeight);
           }
        }
      } else {
        if (interfaceEl) {
           const iRect = interfaceEl.getBoundingClientRect();
           minX = iRect.right;
        }
      }
      
      maxY = Math.max(headerHeight, maxY);
      
      // 1. Calculate Width & X
      let newW = baseWidth;
      let newX = targetX;

      // If X + W > Viewport, push left
      if (newX + newW > viewportW) {
        newX = viewportW - newW;
      }

      // If X < minX, clamp left
      if (newX < minX) {
        newX = minX;
      }

      // If still overflowing right, shrink width
      if (newX + newW > viewportW) {
        newW = Math.max(200, viewportW - newX); // Min width 200
      }

      // 2. Calculate Y
      const newY = Math.max(headerHeight, Math.min(targetY, maxY));

      container.style.left = `${newX}px`;
      container.style.top = `${newY}px`;
      container.style.width = `${newW}px`;
    };

    const enforceBoundaries = () => {
      const rect = container.getBoundingClientRect();
      const currentLeft = parseFloat(container.style.left) || rect.left;
      const currentTop = parseFloat(container.style.top) || rect.top;
      updatePosition(currentLeft, currentTop);
    };

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
        updatePosition(startLeft + dx, startTop + dy);
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
      // [cite: 2026-01-28] VISUAL: flex-wrap prevents buttons from overlapping long flag names
      row.style.cssText = "display:flex; align-items:center; flex-wrap:wrap; gap:4px; margin-bottom:8px; border-bottom:1px solid #333; padding-bottom:4px;";
      
      const label = document.createElement('span');
      // [cite: 2026-01-28] VISUAL: Match HUD Info Icon style (Lightweight Circle)
      const iconColor = runtimeEnabled ? 'rgba(77, 255, 136, 0.7)' : 'rgba(255, 77, 77, 0.7)';
      const iconStyle = `
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        border: 1px solid ${iconColor};
        border-radius: 50%;
        color: ${iconColor};
        font-family: serif;
        font-style: italic;
        font-size: 12px;
        margin-right: 8px;
      `;
      label.innerHTML = `<span style="${iconStyle}">${runtimeEnabled ? '+' : '-'}</span> ${key}`;

      if (runtimeEnabled) {
        const disableBtn = document.createElement('button');
        disableBtn.textContent = 'Disable';
        disableBtn.style.cssText = "padding:2px 8px; cursor:pointer; background:#333; color:#fff; border:1px solid #666; margin-left: auto;";
        disableBtn.onclick = () => {
          this.setFlag(key, false);
        };
        row.appendChild(label);
        row.appendChild(disableBtn);
      } else {
        const enableBtn = document.createElement('button');
        enableBtn.textContent = 'Enable';
        enableBtn.style.cssText = "padding:2px 8px; cursor:pointer; background:#333; color:#fff; border:1px solid #666; margin-left: auto;";
        enableBtn.onclick = () => {
          this.setFlag(key, true);
        };
        row.appendChild(label);
        row.appendChild(enableBtn);
      }

      contentArea.appendChild(row);
    });

    // [cite: 2026-01-28] RESPONSIVENESS: Enforce bounds on resize and layout shifts
    window.addEventListener('resize', enforceBoundaries);
    
    // Poll for layout changes (e.g. mobile nav toggle) since we don't have React props here
    const pollTimer = setInterval(enforceBoundaries, 500);

    // Cleanup on remove (monkey-patch remove to clear listeners)
    const originalRemove = container.remove.bind(container);
    container.remove = () => {
      window.removeEventListener('resize', enforceBoundaries);
      clearInterval(pollTimer);
      originalRemove();
    };
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