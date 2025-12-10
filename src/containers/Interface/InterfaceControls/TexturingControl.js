import React, { Component } from "react";
import withInterfaceControls from './withInterfaceControls'
import Aux from '../../../hoc/Aux/Aux';

import MySlider from "../../../components/UI/MySlider/MySlider";

import "../../Interface/Interface.css";

class TexturingControl extends Component {
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

  handleTexturing1Change = data => {
    this.handleTexturingChange(data.pop(), "v1");
  };
  handleTexturing2Change = data => {
    this.handleTexturingChange(data.pop(), "v2");
  };

  handleTexturingChange = (data, vector) => {    
    const texture = data > 0 ? true : false;    
    let textureParam = "";
    let paramToUpdate = "";
    switch (vector) {
      case "v1":
        textureParam = "outerTextureAmt";
        paramToUpdate = "texture"
        break;
      case "v2":
        textureParam = "innerTextureAmt";
        paramToUpdate = "texture"
        break;
      default:
        break;
    }

    //TODO: Fix bug where texturez only works if project1/project2 values are set
    const statePath = "parametricObj.transformationInstructions.shaping.vectorParams" ;

    const updateArray = [
      {
        objectStatePath: statePath,
        paramToUpdate: paramToUpdate,
        newValue: texture
      },
      { objectStatePath: statePath, paramToUpdate: textureParam, newValue: data }
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
          <h3 className="TAreaInterface___TitleButton_Label">Texture</h3>
        </button>

        <div className="TAreaInterface_controlsContainer">
          <div className="UISliderContainer UISliderContainer__1">
            <label className="SliderLabel">1</label>
            <MySlider
              defaultValues={[0]}
              domain={[0, 20]}
              update={this.handleTexturing1Change}
            />
          </div>

          {/* 
          TODO: figure out why errors occur with a second slider
          <div className="UISliderContainer UISliderContainer__2">
            <label className="SliderLabel">2</label>
            <MySlider
              defaultValues={[0]}
              domain={[0, 20]}
              update={this.handleTexturing2Change}
            />
          </div> 
          */}
        </div>
      </Aux>
    );
  };
}

export default(withInterfaceControls(TexturingControl,"texture","TAreaInterface"));
