import React, { Component } from "react";
import withInterfaceControls from "./withInterfaceControls";
import Aux from '../../../hoc/Aux/Aux';

class ProjectingControl extends Component {
  constructor(props) {
    super(props);

    this.state = {
      initedInterface: false,
      ui: {
        projecting: {
          x1ButtonClasses: this.evalProjectingButtonClasses("x", 1),
          y1ButtonClasses: this.evalProjectingButtonClasses("y", 1),
          z1ButtonClasses: this.evalProjectingButtonClasses("z", 1),
          x2ButtonClasses: this.evalProjectingButtonClasses("x", 2),
          y2ButtonClasses: this.evalProjectingButtonClasses("y", 2),
          z2ButtonClasses: this.evalProjectingButtonClasses("z", 2)
        }
      }
    };
  }

  componentDidMount = () => {
    this.setState({
      ...this.state,
      initedInterface: true,
      parametricObj: this.props.parametricObj,
      ui: {
        ...this.state.ui,
        projecting: {
          x1ButtonClasses: this.evalProjectingButtonClasses("x", 1),
          y1ButtonClasses: this.evalProjectingButtonClasses("y", 1),
          z1ButtonClasses: this.evalProjectingButtonClasses("z", 1),
          x2ButtonClasses: this.evalProjectingButtonClasses("x", 2),
          y2ButtonClasses: this.evalProjectingButtonClasses("y", 2),
          z2ButtonClasses: this.evalProjectingButtonClasses("z", 2)
        }
      }
    });
  };

  componentDidUpdate = () => {
    // console.log("componentDidUpdate");
  };

  //TODO: refactor code to use memoization techniques or move it to static getDerivedStateFromProps. Learn more at: https://fb.me/react-derived-state
  componentWillReceiveProps = nextProps => {
    if (this.state.initedInterface) {
      const nextShape =
        nextProps.parametricObj.transformationInstructions.shaping.formula;
      this.setUI_ProjectingTypes(nextProps, nextShape);
    }
  };

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

  evalProjectingButtonClasses = (vector, vID, newState) => {
    const currentVectors = newState
      ? newState.parametricObj.transformationInstructions.projecting.vectors
      : this.props.parametricObj.transformationInstructions.projecting.vectors;

    const vectorToUpdate = vID === 1 ? currentVectors[0] : currentVectors[1];
    
    const projectionFactor = newState
      ? newState.parametricObj.transformationInstructions.projecting.formula
      : this.props.parametricObj.transformationInstructions.projecting.formula;

    //TODO: address need for workaround to not activate
    //  vector 2 button if only 1 vector is being projected
    const project1Check = vID === 2 && projectionFactor === "project1";

    return (
      "IconButton___" +
      vector +
      " IconButton" +
      (vectorToUpdate === vector && !project1Check
        ? " IconButton___Vector___Active"
        : "")
    );
  };

  handleProjectingChange = data => {
    const currentProjectingFormula = this.props.parametricObj
      .transformationInstructions.projecting.formula;

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

    // console.log("updatedVectors",updatedVectors)

    const statePath =
      projectionArea === "shaping"
        ? "parametricObj.transformationInstructions.shaping"
        : "parametricObj.transformationInstructions.projecting";

    const projectionFormula = currentVectors.map((vector, index) => {
      if (index + 1 === parseInt(vectorArea)) {
        if (newVector === vector && vectorArea === "2") {
          //The active vector in the vector2 area was selected to turn it off
          return "project1";
        } else if (
          newVector === vector &&
          vectorArea === "1" &&
          currentProjectingFormula !== "project2"
        ) {
          return "none";
        } else if (vectorArea === "2") {
          return "project2";
        } else {
          return "project1";
        }
      } else {
        return "project2";
      }
    });
    
    const updatedVectors = currentVectors.map((vector, index) => {
      if (projectionFormula[0] !== "none") {
        if (index + 1 === parseInt(vectorArea)) {
          if (newVector === vector && vectorArea === "2") {
            return null;
          } else {
            return newVector;
          }
        } else {
          return vector;
        }
      } else {
        return null;
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
    } else if (projectionArea === "projecting") {
      const updateArray = [
        {
          objectStatePath: statePath,
          paramToUpdate: "formula",
          newValue: projectionFormula[vectorArea - 1]
        },
        {
          objectStatePath: statePath,
          paramToUpdate: "vectors",
          newValue: updatedVectors
        }
      ];
      //TODO: find a better way to not do anything if only vector 2 has a value
      if (!updatedVectors[0] && updatedVectors[1]) {
        // console.log("do nothing!");
        return;
      } else {
        this.props.handleUpdate(updateArray);
      }
    }
  };

  render = () => {
    return (
      <Aux>
        <button
          onClick={this.props.updateControlsRef}
          className="TAreaInterface___TitleButton"
        >
          <h3 className="TAreaInterface___TitleButton_Label">Project</h3>
        </button>
        <div className="TAreaInterface_controlsContainer">
          <label className="VectorLabel">Vector 1</label>
          <button
            id="iconButton___projecting_x_v1"
            alt="x shape"
            className={this.state.ui.projecting.x1ButtonClasses}
            onClick={this.handleProjectingChange}
          ></button>
          <button
            id="iconButton___projecting_y_v1"
            alt="y shape"
            className={this.state.ui.projecting.y1ButtonClasses}
            onClick={this.handleProjectingChange}
          ></button>
          <button
            id="iconButton___projecting_z_v1"
            alt="z shape"
            className={this.state.ui.projecting.z1ButtonClasses}
            onClick={this.handleProjectingChange}
          ></button>
          <label className="VectorLabel">Vector 2</label>
          <button
            id="iconButton___projecting_x_v2"
            alt="x shape"
            className={this.state.ui.projecting.x2ButtonClasses}
            onClick={this.handleProjectingChange}
          ></button>
          <button
            id="iconButton___projecting_y_v2"
            alt="y shape"
            className={this.state.ui.projecting.y2ButtonClasses}
            onClick={this.handleProjectingChange}
          ></button>
          <button
            id="iconButton___projecting_z_v2"
            alt="z shape"
            className={this.state.ui.projecting.z2ButtonClasses}
            onClick={this.handleProjectingChange}
          ></button>
        </div>
      </Aux>
    );
  };
}

export default(withInterfaceControls(ProjectingControl,"project","TAreaInterface"));
