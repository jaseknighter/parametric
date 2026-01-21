/**
 * @fileoverview MySliderComponents.js
 * FIXED: Added left: 50% to all absolute components to ensure horizontal centering 
 * within the UISliderContainer when labels are set to text-align: center.
 */
import React, { Fragment } from 'react'
import PropTypes from 'prop-types'

// *******************************************************
// RAIL
// *******************************************************
const railOuterStyle = {
  position: 'absolute',
  height: '100%',
  width: '4vw',
  left: '50%', // 🟢 FIXED: Center the coordinate
  transform: 'translate(-50%, 0%)',
  cursor: 'pointer',
}

const railInnerStyle = {
  position: 'absolute',
  height: '100%',
  width: '1vh',
  left: '50%', // 🟢 FIXED: Center the coordinate
  transform: 'translate(-50%, 0%)',
  pointerEvents: 'none',
  backgroundColor: 'rgba(155,155,155,.5)',
}

export function SliderRail({ getRailProps, 'data-testid': testID }) {
  // SMOKE TESTING: added data-testid
  return (
    <Fragment>
      <div data-testid={testID} style={railOuterStyle} {...getRailProps()} />
      <div style={railInnerStyle} />
    </Fragment>
  )
}

SliderRail.propTypes = {
  getRailProps: PropTypes.func.isRequired,
  'data-testid': PropTypes.string, // SMOKE TESTING
}

// *******************************************************
// HANDLE COMPONENT
// *******************************************************
export function Handle({
  domain: [min, max],
  handle: { id, value, percent },
  getHandleProps,
  disabled,
  'data-testid': testID, // SMOKE TESTING
}) {
  return (
    <Fragment>
      <div
        data-testid={testID} // SMOKE TESTING
        style={{
          top: `${percent}%`,
          left: '50%', 
          position: 'absolute',
          transform: 'translate(-50%, -50%)',
          WebkitTapHighlightColor: 'rgba(0,0,0,0.5)',
          zIndex: 5,
          width: 28,
          height: 28,
          cursor: 'pointer',
          backgroundColor: 'none',
        }}
        {...getHandleProps(id)}
      />
      <div
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        style={{
          top: `${percent}%`,
          left: '50%', // 🟢 FIXED
          position: 'absolute',
          transform: 'translate(-50%, -50%)',
          zIndex: 2,
          width: "2.5vh",
          height: "1.0vh",
          backgroundColor: disabled ? '#666' : "rgba(25,25,25,.5)",
        }}
      />
    </Fragment>
  )
}

Handle.propTypes = {
  domain: PropTypes.array.isRequired,
  handle: PropTypes.shape({
    id: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
    percent: PropTypes.number.isRequired,
  }).isRequired,
  getHandleProps: PropTypes.func.isRequired,
  'data-testid': PropTypes.string, // SMOKE TESTING
}

// *******************************************************
// TRACK COMPONENT
// *******************************************************
export function Track({ source, target, getTrackProps, disabled, 'data-testid': testID }) {
  return (
    <div
      data-testid={testID}
      style={{
        position: 'absolute',
        zIndex: 1,
        backgroundColor: disabled ? '#999' : '#767696',
        borderRadius: 7,
        cursor: 'pointer',
        width: "1.5rem",
        left: '50%', // 🟢 FIXED
        transform: 'translate(-50%, 0%)',
        top: `${source.percent}%`,
        height: `${target.percent - source.percent}%`,
      }}
      {...getTrackProps()}
    />
  )
}

Track.propTypes = {
  source: PropTypes.shape({
    id: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
    percent: PropTypes.number.isRequired,
  }).isRequired,
  target: PropTypes.shape({
    id: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
    percent: PropTypes.number.isRequired,
  }).isRequired,
  getTrackProps: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  'data-testid': PropTypes.string, // SMOKE TESTING
}

Track.defaultProps = {
  disabled: false,
}

// Tick component left as is, since you mentioned removing/hiding ticks earlier.
export function Tick({ tick, format }) {
  return (
    <div>
      <div
        style={{
          position: 'absolute',
          marginTop: -0.5,
          marginLeft: 10,
          height: 1,
          width: 6,
          backgroundColor: 'rgba(200,200,200,0.5)',
          top: `${tick.percent}%`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          marginTop: -5,
          marginLeft: 20,
          fontSize: 10,
          top: `${tick.percent}%`,
        }}
      >
        {format(tick.value)}
      </div>
    </div>
  )
}