import React from 'react';
import { ParametricRegistry } from '../../services/ParametricRegistry';

/**
 * Higher-Order Component to wrap interface controls with the standard
 * Title Button + Collapsible Container structure.
 * [cite: 2026-01-31] RESTORED: Missing HOC file to resolve build error.
 */
export const withInterfaceControls = (WrappedComponent, id) => {
  const WithControls = (props) => {
    const { isOpen, onOpen, onClose, ...passThroughProps } = props;
    // Derive title from props or Registry, fallback to ID
    const title = props.title || ParametricRegistry[id]?.label || id.toUpperCase();

    return (
      <div className={`TAreaInterface ${isOpen ? 'Controls_Opened' : ''}`}>
        <button 
          className="TAreaInterface___TitleButton"
          onClick={() => isOpen ? onClose() : onOpen()}
          aria-expanded={isOpen}
          type="button"
        >
          <h3 className="TAreaInterface___TitleButton_Label">{title}</h3>
        </button>
        <div className={`TAreaInterface_controlsContainer ${isOpen ? 'Controls_Show' : ''}`}>
          {isOpen && <WrappedComponent {...passThroughProps} />}
        </div>
      </div>
    );
  };
  
  WithControls.displayName = `WithInterfaceControls(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  return WithControls;
};