import React, { useMemo } from 'react';
import ReactDOM from 'react-dom';
// Assuming katex is installed or available. If not, this import might need adjustment.
// For this implementation, we assume standard npm usage.
import 'katex/dist/katex.min.css';
import katex from 'katex';

const MathTooltip = ({ intent, text, visible, x, y, isA11yEnabled, placement, ...rest }) => {
  // [cite: 2026-01-31] RUTHLESS: Absolute suppression on mobile devices.
  // We check window width directly to bypass any state/prop lag.
  if (typeof window !== 'undefined' && window.innerWidth < 800) return null;

  if (!visible || (!text && !intent)) return null;

  const renderedContent = useMemo(() => {
    if (!text) return null; // [cite: 2026-01-27] GUARD: Prevent crash if behavior is missing
    // Split by $ delimiters to find math segments
    const parts = text.split('$');
    return parts.map((part, index) => {
      // Even indices are plain text, odd indices are LaTeX math
      if (index % 2 === 0) {
        return <span key={index}>{part}</span>;
      } else {
        try {
          const html = katex.renderToString(part, {
            throwOnError: false,
            displayMode: false
          });
          return <span key={index} dangerouslySetInnerHTML={{ __html: html }} />;
        } catch (e) {
          console.warn('KaTeX rendering error:', e);
          return <span key={index} className="katex-error">{part}</span>;
        }
      }
    });
  }, [text]);

  // [cite: 2026-01-27] FIX: Smart Positioning.
  // If the cursor is near the top (e.g. HUD Header), show tooltip BELOW.
  // Otherwise, show ABOVE to avoid blocking content.
  const isNearTop = y < 100; // [cite: 2026-01-27] FIX: Adjusted threshold for HUD header

  let posStyle = {
    top: (isNearTop ? y + 25 : y - 15) + 'px',
    left: (x + 15) + 'px',
    transform: isNearTop ? 'none' : 'translateY(-100%)'
  };

  if (placement === 'right') {
    posStyle = { top: y + 'px', left: x + 'px', transform: 'translateY(-50%)' };
  } else if (placement === 'bottom-left') {
    posStyle = { top: (y + 20) + 'px', left: (x - 10) + 'px', transform: 'translateX(-100%)' };
  }

  return ReactDOM.createPortal(
    <div 
      className="MathTooltip_Container"
      role="tooltip"
      aria-hidden={!visible}
      aria-live={visible && isA11yEnabled ? "polite" : undefined}
      {...rest}
      style={{
        position: 'fixed',
        ...posStyle,
        zIndex: 10000,
        pointerEvents: 'none',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '14px',
        maxWidth: '300px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        whiteSpace: 'pre-wrap'
      }}
    >
      {intent && (
        <div style={{ marginBottom: '6px', fontWeight: 'bold', color: '#4da3ff' }}>
          {intent}
        </div>
      )}
      {renderedContent}
    </div>
    , document.body
  );
};

export default MathTooltip;