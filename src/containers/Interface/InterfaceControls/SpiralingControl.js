import React, { Component } from "react";
import withInterfaceControls from './withInterfaceControls'
import Aux from '../../../hoc/Aux/Aux';

import MySlider from "../../../components/UI/MySlider/MySlider";

import "../../Interface/Interface.css";

class SprialingControl extends Component {
  constructor(props) {
    super(props);

    this.state = {
      ui: { }
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
  
  handleSpiraling1Change = data => {
    this.handleSpiralingChange(data.pop(), "v1");
  };
  handleSpiraling2Change = data => {
    this.handleSpiralingChange(data.pop(), "v2");
  };

  handleSpiralingChange = (data, vector) => {
    
    //TODO: spiral should only turn to false if all vectors are < 1
    const spiral = data > 0 ? true : false;    
    let spiralParam = "";
    let paramToUpdate = "";
    switch (vector) {
      case "v1":
        spiralParam = "spiralCosAmt";
        paramToUpdate = "spiralCos"
        break;
      case "v2":
        spiralParam = "spiralSinAmt";
        paramToUpdate = "spiralSin"
        break;
      default:
        break;
    }

    //TODO: Fix bug where spiralz only works if project1/project2 values are set
    const statePath = "parametricObj.transformationInstructions.shaping.vectorParams" ;

    const updateArray = [
      {
        objectStatePath: statePath,
        paramToUpdate: paramToUpdate,
        newValue: spiral
      },
      { objectStatePath: statePath, paramToUpdate: spiralParam, newValue: data }
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
          <h3 className="TAreaInterface___TitleButton_Label">Spiral</h3>
        </button>

        <div className="TAreaInterface_controlsContainer">
          <div className="UISliderContainer UISliderContainer__1">
            <label className="SliderLabel">1</label>
            <MySlider
              defaultValues={[0]}
              domain={[0, 10]}
              update={this.handleSpiraling1Change}
            />
          </div>

          <div className="UISliderContainer UISliderContainer__2">
            <label className="SliderLabel">2</label>
            <MySlider
              defaultValues={[0]}
              domain={[0, 10]}
              update={this.handleSpiraling2Change}
            />
          </div>
        </div>
      </Aux>
    );
  };
}

export default(withInterfaceControls(SprialingControl,"spiral","TAreaInterface"));
