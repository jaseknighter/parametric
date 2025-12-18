import React, { useState, useMemo } from "react";
import Slider, { Rail, Handles, Tracks, Ticks } from "react-compound-slider";
import { SliderRail, Handle, Track, Tick } from "./MySliderComponents";

const sliderStyle = {
  position: "relative",
  height: "9rem",
  marginLeft: "45%",
  touchAction: "none"
};

const MySlider = ({ domain: propsDomain, defaultValues, update: propsUpdate }) => {
  // Domain uses useMemo to ensure values only recalculate if the domain prop changes
  const domain = useMemo(() => propsDomain || [0, 10], [propsDomain]);
  const tickCount = domain[1] / 5;
  const step = 0.01; //domain[1] / 10;

  const [values, setValues] = useState(() => defaultValues.slice());

  const onUpdate = (update) => {
    console.log(update)
    propsUpdate(update);
  };

  const onChange = (newValues) => {
    setValues(newValues);
  };

  return (
    <div style={{ height: "9rem", width: "100%" }}>
      <Slider
        vertical
        reversed
        mode={1}
        step={step}
        domain={domain}
        rootStyle={sliderStyle}
        onUpdate={onUpdate}
        onChange={onChange}
        values={values}
      >
        <Rail>
          {({ getRailProps }) => <SliderRail getRailProps={getRailProps} />}
        </Rail>
        
        <Handles>
          {({ handles, getHandleProps }) => (
            <div className="slider-handles">
              {handles.map((handle) => (
                <Handle
                  key={handle.id}
                  handle={handle}
                  domain={domain}
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

        <Ticks count={tickCount}>
          {({ ticks }) => (
            <div className="slider-ticks">
              {ticks.map((tick) => (
                <Tick key={tick.id} tick={tick} />
              ))}
            </div>
          )}
        </Ticks>
      </Slider>
    </div>
  );
};

export default MySlider;