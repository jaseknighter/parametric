import React, { Component } from "react";
import withInterfaceControls from './withInterfaceControls'
import Aux from '../../../hoc/Aux/Aux';
import MySlider from "../../../components/UI/MySlider/MySlider";

import "../../Interface/Interface.css";

class SprialingControl extends Component {
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
        ...this.state.ui,
        
      }
    });
  };

  componentDidUpdate = () => {
    // console.log("componentDidUpdate");
  };

  handleBending1Change = data => {
    this.handleBendingChange(data.pop(), "v1");
  };
  handleBending2Change = data => {
    this.handleBendingChange(data.pop(), "v2");
  };

  handleBendingChange = (data, vector) => {
    
    //////////////////////////////////////////////////////
    //TODO: bend should only turn to false if all vectors are < 1
    //////////////////////////////////////////////////////
    const bend = data > 0 ? true : false;
    
    let bendParam = "";
    let paramToUpdate = "";
    switch (vector) {
      case "v1":
        bendParam = "bendCosAmt";
        paramToUpdate = "bendCos"
        break;
      case "v2":
        bendParam = "bendSinAmt";
        paramToUpdate = "bendSin"
        break;
      default:
        break;
    }

    //TODO: Fix bug where bendz only works if project1/project2 values are set
    const statePath = "parametricObj.transformationInstructions.shaping.vectorParams" ;

    const updateArray = [
      {
        objectStatePath: statePath,
        paramToUpdate: paramToUpdate,
        newValue: bend
      },
      { objectStatePath: statePath, paramToUpdate: bendParam, newValue: data }
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
          <h3 className="TAreaInterface___TitleButton_Label">Bend</h3>
        </button>

        <div className="TAreaInterface_controlsContainer">
          <div className="UISliderContainer UISliderContainer__1">
            <label className="SliderLabel">1</label>
            <MySlider
              defaultValues={[0]}
              domain={[0, 15]}
              update={this.handleBending1Change}
            />
          </div>

          <div className="UISliderContainer UISliderContainer__2">
            <label className="SliderLabel">2</label>
            <MySlider
              defaultValues={[0]}
              domain={[0, 15]}
              update={this.handleBending2Change}
            />
          </div>
        </div>
      </Aux>
    );
  };
}

export default(withInterfaceControls(SprialingControl,"bend","TAreaInterface"));
