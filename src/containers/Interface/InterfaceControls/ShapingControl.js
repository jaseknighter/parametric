import React, { Component } from "react";

import withInterfaceControls from './withInterfaceControls'
import Aux from '../../../hoc/Aux/Aux';

class ShapingControl extends Component {
  constructor(props) {
    super(props);

    this.state = {
      initedInterface: false,
      ui: {
        shaping: {
          lineButtonClasses:
            "IconButton___line IconButton" +
            (this.currentShape === "line" ? " IconButton___Active" : ""),
          sinButtonClasses:
            "IconButton___sin IconButton" +
            (this.currentShape === "sin" ? " IconButton___Active" : ""),
          cosButtonClasses:
            "IconButton___cos IconButton" +
            (this.currentShape === "cos" ? " IconButton___Active" : ""),
          circleButtonClasses:
            "IconButton___circle IconButton" +
            (this.currentShape === "circle" ? " IconButton___Active" : ""),
          x1ButtonClasses: this.evalShapingButtonClasses("x", 1),
          y1ButtonClasses: this.evalShapingButtonClasses("y", 1),
          z1ButtonClasses: this.evalShapingButtonClasses("z", 1),
          x2ButtonClasses: this.evalShapingButtonClasses("x", 2),
          y2ButtonClasses: this.evalShapingButtonClasses("y", 2),
          z2ButtonClasses: this.evalShapingButtonClasses("z", 2)
        }
      }
    };
  }

  componentDidMount = () => {
    this.setState({
      ...this.state,
      initedInterface: true,
      parametricObj: this.props.parametricObj,
      
    });
  };

  componentDidUpdate = () => {
    // console.log("componentDidUpdate");
  };

  //TODO: refactor code to use memoization techniques or move it to static getDerivedStateFromProps. Learn more at: https://fb.me/react-derived-state
  componentWillReceiveProps = nextProps => {
    if (this.state.initedInterface) {
      this.setUI_ShapingTypes(nextProps);
    }
  };

  updateControlsRef = () => {
    const cRef = this.controlsRef.current;
    console.log("updateControlsRef")
    console.log("ref.current ",this.controlsRef.current)
    console.log("cRef ", cRef);
    console.log(".TAreaInterface_controlsContainer", 
      (cRef.querySelector('.TAreaInterface_controlsContainer'))
    )
  }

  get currentShape() {
    return this.props.parametricObj.transformationInstructions.shaping.formula;
  }

  setUI_StateCallback = (newState, updateArea, newObj) => {  
    return (previousState, currentProps) => {
      return {
        ...previousState,
        ui: {
          ...previousState.ui,
          [updateArea]: newObj
        }
      };
    };
  };

  setUI_ShapingTypes = props => {
      const newFormula =
        props.parametricObj.transformationInstructions.shaping.formula;
      this.setState(
        this.setUI_StateCallback(props, "shaping", {
          lineButtonClasses:
            "IconButton___line IconButton" +
            (newFormula === "line" ? " IconButton___Active" : " "),
          cosButtonClasses:
            "IconButton___cos IconButton" +
            (newFormula === "cos" ? " IconButton___Active" : " "),
          sinButtonClasses:
            "IconButton___sin IconButton" +
            (newFormula === "sin" ? " IconButton___Active" : " "),
          circleButtonClasses:
            "IconButton___circle IconButton" +
            (newFormula === "circle" ? " IconButton___Active" : " "),
          x1ButtonClasses: this.evalShapingButtonClasses("x", 1, props),
          y1ButtonClasses: this.evalShapingButtonClasses("y", 1, props),
          z1ButtonClasses: this.evalShapingButtonClasses("z", 1, props),
          x2ButtonClasses: this.evalShapingButtonClasses("x", 2, props),
          y2ButtonClasses: this.evalShapingButtonClasses("y", 2, props),
          z2ButtonClasses: this.evalShapingButtonClasses("z", 2, props)
        })
      );
    };

  evalShapingButtonClasses = (vector, vID, newState) => {
    const currentVectors = newState
      ? newState.parametricObj.transformationInstructions.shaping.vectors
      : this.props.parametricObj.transformationInstructions.shaping.vectors;

      const vectorToUpdate = vID === 1 ? currentVectors[0] : currentVectors[1];

    const currentVectorClasses =
      "IconButton___" +
      vector +
      " IconButton" +
      (vectorToUpdate === vector ? " IconButton___Vector___Active" : "");
    return currentVectorClasses;
  };

  
    

  handleShapingFormulaChange = data => {
    const newType = data.target.id.substring(13);
    const statePath = "parametricObj.transformationInstructions.shaping";
    const updateArray = [
      {
        objectStatePath: statePath,
        paramToUpdate: "formula",
        newValue: newType
      }
    ];
    this.props.handleUpdate(updateArray);
  };

  handleShapingVectorChange = data => {
    //Get the projection area ("shaping" or "projecting" from the button ID, e.g. "iconButton___projecting_x_v1"
    const projectionArea = data.target.id.substring(
      13,
      data.target.id.length - 5
    );

    //Get the newVector ("x", "y", or "z") from the button ID, e.g. "iconButton___projecting_x_v1"
    const newVector = data.target.id.substring(
      14 + projectionArea.length,
      15 + projectionArea.length
    );

    //Determine whether vector1 or vector2 is being updated
    const vectorArea = data.target.id.substring(
      data.target.id.length - 1,
      data.target.id.length
    );

    const currentVectors =
      projectionArea === "shaping"
        ? this.props.parametricObj.transformationInstructions.shaping.vectors
        : this.props.parametricObj.transformationInstructions.projecting
            .vectors;

    const statePath =
      projectionArea === "shaping"
        ? "parametricObj.transformationInstructions.shaping"
        : "parametricObj.transformationInstructions.projecting";

    const updatedVectors = currentVectors.map((vector, index) => {
      if (index + 1 === parseInt(vectorArea)) {
        return newVector;
      } else {
        return vector;
      }
    });

    if (projectionArea === "shaping") {
      const updateArray = [
        {
          objectStatePath: statePath,
          paramToUpdate: "vectors",
          newValue: updatedVectors
        }
      ];
      this.props.handleUpdate(updateArray);
    }
  };

  render = () => {
    return (
        <Aux>
          <button 
            onClick={this.props.updateControlsRef}
            className="TAreaInterface___TitleButton">
            <h3 className="TAreaInterface___TitleButton_Label">Shape</h3>
          </button>
          <div className="TAreaInterface_controlsContainer">
            <button
              id="iconButton___line"
              alt="line shape"
              className={this.state.ui.shaping.lineButtonClasses}
              onClick={this.handleShapingFormulaChange}
            ></button>
            <button
              id="iconButton___sin"
              alt="sine shape"
              className={this.state.ui.shaping.sinButtonClasses}
              onClick={this.handleShapingFormulaChange}
            ></button>
            <button
              id="iconButton___cos"
              alt="cos shape"
              className={this.state.ui.shaping.cosButtonClasses}
              onClick={this.handleShapingFormulaChange}
            ></button>
            <button
              id="iconButton___circle"
              alt="circle shape"
              className={this.state.ui.shaping.circleButtonClasses}
              type="button"
              onClick={this.handleShapingFormulaChange}
            ></button>
            <label className="VectorLabel">Vector 1</label>
            <button
              id="iconButton___shaping_x_v1"
              alt="x shape"
              className={this.state.ui.shaping.x1ButtonClasses}
              onClick={this.handleShapingVectorChange}
            ></button>
            <button
              id="iconButton___shaping_y_v1"
              alt="y shape"
              className={this.state.ui.shaping.y1ButtonClasses}
              onClick={this.handleShapingVectorChange}
            ></button>
            <button
              id="iconButton___shaping_z_v1"
              alt="z shape"
              className={this.state.ui.shaping.z1ButtonClasses}
              onClick={this.handleShapingVectorChange}
            ></button>
            <label className="VectorLabel">Vector 2</label>
            <button
              id="iconButton___shaping_x_v2"
              alt="x shape"
              className={this.state.ui.shaping.x2ButtonClasses}
              onClick={this.handleShapingVectorChange}
            ></button>
            <button
              id="iconButton___shaping_y_v2"
              alt="y shape"
              className={this.state.ui.shaping.y2ButtonClasses}
              onClick={this.handleShapingVectorChange}
            ></button>
            <button
              id="iconButton___shaping_z_v2"
              alt="z shape"
              className={this.state.ui.shaping.z2ButtonClasses}
              onClick={this.handleShapingVectorChange}
            ></button>
          </div>
        </Aux>
    );
  };
};

export default(withInterfaceControls(ShapingControl,"shape","TAreaInterface"));
