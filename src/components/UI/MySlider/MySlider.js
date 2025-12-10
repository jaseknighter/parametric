//Code from https://sghall.github.io/react-compound-slider/#/slider-demos/vertical

import React, { Component } from "react";
import Slider, { Rail, Handles, Tracks, Ticks } from "react-compound-slider";
import { SliderRail, Handle, Track, Tick } from "./MySliderComponents"; // example render components - source below

const sliderStyle = {
  position: "relative",
  height: "9rem",
  marginLeft: "45%",
  touchAction: "none"
};


class MySlider extends Component {
  constructor(props) {
    super(props);
    const domain = props.domain ? props.domain : [0, 10];
    const tickCount = domain[1] / 5;
    this.state = {
      values: props.defaultValues.slice(),
      update: props.update,
      tickCount: tickCount,
      domain: domain
    };
  }

  onUpdate = update => {
    this.setState({ update });
    {
      this.props.update(update);
    }
  };

  onChange = values => {
    this.setState({ values });
  };

  render() {
    const {
      state: { values }
    } = this;

    return (
      <div style={{ height: "9rem", width: "100%" }}>
        <Slider
          vertical
          reversed
          mode={1}
          step={this.state.domain[1] / 10}
          domain={this.state.domain}
          rootStyle={sliderStyle}
          onUpdate={this.onUpdate}
          onChange={this.onChange}
          values={values}
        >
          <Rail>
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
          <Tracks left={false} right={false}>
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
          <Ticks count={this.state.tickCount}>
            {({ ticks }) => (
              <div className="slider-ticks">
                {ticks.map(tick => (
                  <Tick key={tick.id} tick={tick} />
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
