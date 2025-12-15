import React, { Component } from "react";
// import Select from 'react-select';
// import Select from "../../components/UI/Select/Select";
// import Button from "../../components/UI/Button/Button";

// import { updateObject } from "../../../shared/utility";

import withInterfaceControls from './withInterfaceControls'
import Aux from '../../../hoc/Aux/Aux';

import MySlider from "../../../components/UI/MySlider/MySlider";



import "../../Interface/Interface.css";

class PinchingControl extends Component {
  constructor(props) {
    super(props);
    // this.controlsRef = React.createRef();
    // this.updateControlsRef = this.updateControlsRef.bind(this);
    console.log(props)
    this.state = {
      //TODO: setup tests (especially testing for 0 values)
      initedInterface: false,

      ui: {}
    };
  }

  componentDidMount = () => {
    // this.setupUI();
    // console.log("cdm shape", this.currentShape)

    this.setState({
      ...this.state,
      initedInterface: true,
      parametricObj: this.props.parametricObj,
      ui: {
        ...this.state.ui
      },
      // open: false
    });

    // console.log(props.interfaceRef.queryAelector('.TAreaInterface_controlsContainer'));
  };

  componentDidUpdate = () => {
    // console.log("componentDidUpdate");
  };

  setupUI = () => {
    // this.setUI_ShapingTypes();
  };

  get currentShape() {
    return this.props.parametricObj.transformationInstructions.shaping.formula;
  }

  get currentProjection() {
    this.props.parametricObj.transformationInstructions.projecting.vectors.pop();
  }

  //////////////////////////////////////////////////////
  // IMPORTANT: use setState's callback feature so it can be called multiple times
  // without losing the updated state of the last call
  //////////////////////////////////////////////////////
  //TODO: Remove this function...it isn't needed in this control
  setUI_StateCallback = (newState, updateArea, newObj) => {
    // this.currentProjection = this.props.parametricObj.transformationInstructions.projecting.vectors.pop();
    // console.log("setUI_StateCallback",updateArea)
    if (updateArea === "shaping") {
      // console.log("reset other areas", newState.parametricObj.transformationInstructions.shaping.formula);
      const newShape =
        newState.parametricObj.transformationInstructions.shaping.formula;

      // this.setUI_ProjectingTypes(newState, newShape);
    }

    return (previousState, currentProps) => {
      // const updatedState = update(previousState, newObj);
      // console.log("updatedState",updatedState.parametricObj.transformationInstructions.shaping.vectorParams)
      // console.log("setUI_StateCallback", previousState);
      return {
        ...previousState,
        ui: {
          ...previousState.ui,
          [updateArea]: newObj
        }
      };
    };
  };

  //////////////////////////////////////////////////////
  // IMPORTANT: use setState's callback feature so it can be called multiple times
  // without losing the updated state of the last call
  //////////////////////////////////////////////////////

  setUI_ProjectingTypes = (newState, shape) => {
    // console.log("setUI_ProjectingTypes", newState, shape)
    this.setState(
      this.setUI_StateCallback(newState, "projecting", {
        // xButtonClasses: this.evalProjectingButtonClasses("x", shape, newState),
        // yButtonClasses: this.evalProjectingButtonClasses("y", shape, newState),
        // zButtonClasses: this.evalProjectingButtonClasses("z", shape, newState)

        x1ButtonClasses: this.evalProjectingButtonClasses("x", 1, newState),
        y1ButtonClasses: this.evalProjectingButtonClasses("y", 1, newState),
        z1ButtonClasses: this.evalProjectingButtonClasses("z", 1, newState),
        x2ButtonClasses: this.evalProjectingButtonClasses("x", 2, newState),
        y2ButtonClasses: this.evalProjectingButtonClasses("y", 2, newState),
        z2ButtonClasses: this.evalProjectingButtonClasses("z", 2, newState)
      })
    );

    
  };

  handlePinchingChange = (data) => {
    // console.log(data.pop())

    const pinchData = data.pop()
    const pinch = pinchData > 0 ? true : false;

    const statePath1 = 
      "parametricObj.transformationInstructions.shaping.vectorParams" 
    const statePath2 = 
      "parametricObj.transformationInstructions.shaping.vectorParams" ;

    const updateArray = [
      {
        objectStatePath: statePath1,
        paramToUpdate: "pinch",
        newValue: pinch
      },
      { objectStatePath: statePath2, paramToUpdate: "pinchAmt", newValue: pinchData*2 }
    ];
    this.props.handleUpdate(updateArray);
  }

  render = () => {
    return (
      
        // <div id="pinch" className="TAreaInterface">
        <Aux>
          <button
            // onClick={this.props.updateControlsRef}
            onClick={this.props.updateControlsRef}
            className="TAreaInterface___TitleButton"
          >
            <h3 className="TAreaInterface___TitleButton_Label">Pinch</h3>
          </button>
          <div className="TAreaInterface_controlsContainer">
            <div className="UISliderContainer UISliderContainer__3">
              <label className="SliderLabel"></label>
              <MySlider
                defaultValues={[0]}
                domain={[0, 5]}
                update={this.handlePinchingChange}
              />
            </div>
          </div>
        </Aux>
    );
  };
}

export default(withInterfaceControls(PinchingControl,"pinch","TAreaInterface"));
