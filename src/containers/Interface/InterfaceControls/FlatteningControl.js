import React, { Component } from "react";
import withInterfaceControls from './withInterfaceControls'
import Aux from '../../../hoc/Aux/Aux';
import MySlider from "../../../components/UI/MySlider/MySlider";

import "../../Interface/Interface.css";

class FlatteningControl extends Component {
  constructor(props) {
    super(props);

    this.state = {
      ui: {        
      }
    };
  }

  componentDidMount = () => {
    this.setState({
      ...this.state,
      parametricObj: this.props.parametricObj,
      ui: {
        ...this.state.ui,
        
      }
    });
  };

  componentDidUpdate = () => {
    // console.log("componentDidUpdate");
  };

  get currentShape() {
    return this.props.parametricObj.transformationInstructions.shaping.formula;
  }

  get currentProjection() {
    this.props.parametricObj.transformationInstructions.projecting.vectors.pop();
  }

  setUI_ProjectingTypes = (newState, shape) => {
    this.setState(
      this.setUI_StateCallback(newState, "projecting", {
        x1ButtonClasses: this.evalProjectingButtonClasses("x", 1, newState *.1),
        y1ButtonClasses: this.evalProjectingButtonClasses("y", 1, newState *.1),
        z1ButtonClasses: this.evalProjectingButtonClasses("z", 1, newState *.1),
        x2ButtonClasses: this.evalProjectingButtonClasses("x", 2, newState *.1),
        y2ButtonClasses: this.evalProjectingButtonClasses("y", 2, newState *.1),
        z2ButtonClasses: this.evalProjectingButtonClasses("z", 2, newState *.1)
      })
    );
  };

  //TODO: flattening functions can be simplified
  handleFlattening1Change = data => {
    this.handleFlatteningChange(data.pop(), "v1");
  };
  handleFlattening2Change = data => {
    this.handleFlatteningChange(data.pop(), "v2");
  };
  handleFlattening3Change = data => {
    this.handleFlatteningChange(data.pop(), "v3");
  };

  handleFlatteningChange = (data, vector) => {
    //////////////////////////////////////////////////////
    //TODO: flatten should only turn to false if all vectors are < 1
    //////////////////////////////////////////////////////

    const flatten = data > 0 ? true : false;
    let flattenParam = "";
    switch (vector) {
      case "v1":
        flattenParam = "flattenAmt1";
        break;
      case "v2":
        flattenParam = "flattenAmt2";
        break;
      case "v3":
        flattenParam = "flattenAmt3";
        break;
      default:
        break;
    }

    //TODO: Fix bug where flattenz only works if project1/project2 values are set
    const statePath1 = flattenParam !== "flattenAmt3" ?
      "parametricObj.transformationInstructions.shaping.vectorParams" :
      "parametricObj.transformationInstructions.projecting.vectorParams";
    const statePath2 = flattenParam !== "flattenAmt3" ?
      "parametricObj.transformationInstructions.shaping.vectorParams" :
      "parametricObj.transformationInstructions.projecting.vectorParams";
    const updateArray = [
      {
        objectStatePath: statePath1,
        paramToUpdate: "flatten",
        newValue: flatten
      },
      { objectStatePath: statePath2, paramToUpdate: flattenParam, newValue: data*10 }
    ];

    this.props.handleUpdate(updateArray);
  };

  render = () => {
    return (
      <Aux>
        <button
          onClick={this.props.updateControlsRef}
          className="TAreaInterface___TitleButton"
        >
          <h3 className="TAreaInterface___TitleButton_Label">Flatten</h3>
        </button>

        <div className="TAreaInterface_controlsContainer">
          <div className="UISliderContainer UISliderContainer__1">
            <label className="SliderLabel">x</label>
            <MySlider
              defaultValues={[0]}
              domain={[0, 10]}
              update={this.handleFlattening1Change}
            />
          </div>

          <div className="UISliderContainer UISliderContainer__2">
            <label className="SliderLabel">y</label>
            <MySlider
              defaultValues={[0]}
              domain={[0, 10]}
              update={this.handleFlattening2Change}
            />
          </div>

          <div className="UISliderContainer UISliderContainer__3">
            <label className="SliderLabel">z</label>
            <MySlider
              defaultValues={[0]}
              domain={[0, 10]}
              update={this.handleFlattening3Change}
            />
          </div>
        </div>
      </Aux>
    );
  };
}

export default(withInterfaceControls(FlatteningControl,"flatten","TAreaInterface"));
