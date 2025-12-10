import React, { Component } from "react";
import withInterfaceControls from './withInterfaceControls'
import Aux from '../../../hoc/Aux/Aux';
import MySlider from "../../../components/UI/MySlider/MySlider";

import "../../Interface/Interface.css";

class ModulatingControl extends Component {
  constructor(props) {
    super(props);
    this.state = {
      ui: {}
    };
  }

  componentDidMount = () => {
    this.setState({
      ...this.state,
      parametricObj: this.props.parametricObj,
      ui: {
        ...this.state.ui
      },
    });
  };

  componentDidUpdate = () => {
    // console.log("componentDidUpdate");
  };

  get currentShape() {
    return this.props.parametricObj.transformationInstructions.shaping.formula;
  }

  setUI_ProjectingTypes = (newState, shape) => {
    this.setState(
      this.setUI_StateCallback(newState, "projecting", {
        x1ButtonClasses: this.evalProjectingButtonClasses("x", 1, newState),
        y1ButtonClasses: this.evalProjectingButtonClasses("y", 1, newState),
        z1ButtonClasses: this.evalProjectingButtonClasses("z", 1, newState),
        x2ButtonClasses: this.evalProjectingButtonClasses("x", 2, newState),
        y2ButtonClasses: this.evalProjectingButtonClasses("y", 2, newState),
        z2ButtonClasses: this.evalProjectingButtonClasses("z", 2, newState)
      })
    );
  };

  handleModulatingChange = (data) => {
    const modulateData = data.pop()
    const modulate = modulateData > 0 ? true : false;

    const statePath1 = 
      "parametricObj.transformationInstructions.shaping.vectorParams" 
    const statePath2 = 
      "parametricObj.transformationInstructions.shaping.vectorParams" ;

    const updateArray = [
      {
        objectStatePath: statePath1,
        paramToUpdate: "modulate",
        newValue: modulate
      },
      { objectStatePath: statePath2, paramToUpdate: "modulateAmt", newValue: modulateData*2 }
    ];
    this.props.handleUpdate(updateArray);
  }

  render = () => {
    return (
        <Aux>
          <button
            onClick={this.props.updateControlsRef}
            className="TAreaInterface___TitleButton"
          >
            <h3 className="TAreaInterface___TitleButton_Label">Modulate</h3>
          </button>
          <div className="TAreaInterface_controlsContainer">
            <div className="UISliderContainer UISliderContainer__3">
              <label className="SliderLabel"></label>
              <MySlider
                defaultValues={[0]}
                domain={[0, 25]}
                update={this.handleModulatingChange}
              />
            </div>
          </div>
        </Aux>
    );
  };
}

export default(withInterfaceControls(ModulatingControl,"modulate","TAreaInterface"));
