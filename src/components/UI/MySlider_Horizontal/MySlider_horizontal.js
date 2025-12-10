//Code from https://sghall.github.io/react-compound-slider/#/slider-demos/horizontal

import React, { Component } from "react";
import { Slider, Rail, Handles, Tracks, Ticks } from "react-compound-slider";
// import ValueViewer from 'docs/src/pages/ValueViewer' // for examples only - displays the table above slider
import { SliderRail, Handle, Track, Tick } from "./MySliderComponents_horizontal"; // example render components - source below

import classes from "./MySlider.css";

const sliderStyle = {
  touchAction: "none"
};

class MySlider extends Component {
  constructor(props) {
    super(props);
    const domain = props.domain ? props.domain : [0,10];
    const defaultValues = props.defaultValues ? props.defaultValues : [1];
    this.state = {
      values: props.defaultValues.slice(),
      update: props.update,      
      domain: domain
    };
  }

  onUpdate = update => {
    this.setState({ update });
    {this.props.update(update)}
  };

  onChange = values => {
    this.setState({ values });
  };

  render() {
    const {
      state: { values, update }
    } = this;

    return (
      <div className="Slider" style={{ height: 520, width: '100%' }}>        
        <Slider
          mode={1}
          step={1}
          domain={this.state.domain}
          rootStyle={sliderStyle}
          onUpdate={this.onUpdate}
          onChange={this.onChange}
          values={values}
        >
          <Rail className="Rail">
            {({ getRailProps }) => <SliderRail getRailProps={getRailProps} />}
          </Rail>
          <Handles>
            {({ handles, getHandleProps }) => (
              <div className="slider-handles">
                {handles.map(handle => (
                  <Handle
                    key={handle.id}
                    handle={handle}
                    domain={this.state.domain}
                    getHandleProps={getHandleProps}
                  />
                ))}
              </div>
            )}
          </Handles>
          <Tracks right={false}>
            {({ tracks, getTrackProps }) => (
              <div className="slider-tracks">
                {tracks.map(({ id, source, target }) => (
                  <Track
                    key={id}
                    source={source}
                    target={target}
                    getTrackProps={getTrackProps}
                  />
                ))}
              </div>
            )}
          </Tracks>
          <Ticks count={5}>
            {({ ticks }) => (
              <div className="slider-ticks">
                {ticks.map(tick => (
                  <Tick key={tick.id} tick={tick} count={ticks.length} />
                ))}
              </div>
            )}
          </Ticks>
        </Slider>
      </div>
    );
  }
}

export default MySlider;
