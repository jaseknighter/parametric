import React, { Component } from "react";

import ShapingControl from "./InterfaceControls/ShapingControl";
import ProjectingControl from "./InterfaceControls/ProjectingControl";
import FlatteningControl from "./InterfaceControls/FlatteningControl";
import SpiralingControl from "./InterfaceControls/SpiralingControl";
import BendingControl from "./InterfaceControls/BendingControl";
import ModulatingControl from "./InterfaceControls/ModulatingControl";
import TexturingControl from "./InterfaceControls/TexturingControl";

import "./Interface.css";

class Interface extends Component {
  constructor(props) {
    super(props);
    this.state = {
      openInterfaces: [],
      shapeNumColumns: 3,
      projectNumColumns: 2,
      bendNumColumns: 2,
      textureNumColumns: 2,
      spiralNumColumns: 2,
      flattenNumColumns: 3,
      modulateNumColumns: 1
    };
  }

  updateDimensions = () => {
    if (this.state.openInterfaces.length > 0) {
      this.onOpenHandler();
    }
    const checkWindowSizeForMobile =
      window.innerHeight <= 500 || window.innerWidth <= 500;
    if (checkWindowSizeForMobile !== this.state.showMobile) {
      this.setState({
        ...this.state,
        showMobile: checkWindowSizeForMobile
      });
      if (checkWindowSizeForMobile) {
        document.getElementById("html").style.fontSize = "8px";
      } else {
        document.getElementById("html").style.fontSize = "10px";
      }
    }
  };

  componentDidMount = () => {
    this.interfaceRef = React.createRef();
    window.addEventListener("resize", this.updateDimensions);

    this.setState({
      ...this.state,
      parametricObj: this.props.parametricObj,
      showMobile: window.innerHeight <= 500 || window.innerWidth <= 500
    });
  };

  componentDidUpdate = () => {
    // console.log("componentDidUpdate");
  };

  get currentShape() {
    return this.props.parametricObj.transformationInstructions.shaping.formula;
  }

  onOpenHandler = controlOpened => {
    // The code below checks if there's enough room to open
    // a new control. If not, collapse one
    const interfaceCanvas = this.interfaceRef.current;
    const pixelRatio = 1; //window.devicePixelRatio;
    const interfaceWidth = (interfaceCanvas.clientWidth * pixelRatio) | 0;
    const interfaceHeight = (interfaceCanvas.clientHeight * pixelRatio) | 0;
    
    const shapeRef = this.interfaceRef.current.querySelector("#shape");
    const projectRef = this.interfaceRef.current.querySelector("#project");
    const bendRef = this.interfaceRef.current.querySelector("#bend");
    const textureRef = this.interfaceRef.current.querySelector("#texture");
    const spiralRef = this.interfaceRef.current.querySelector("#spiral");
    const flattenRef = this.interfaceRef.current.querySelector("#flatten");
    const modulateRef = this.interfaceRef.current.querySelector("#modulate");

    const rootEl = document.getElementById("root");
    const rootFontSize = parseFloat(
      window.getComputedStyle(rootEl, null).getPropertyValue("font-size")
    );
    
    const headerHeight = document.getElementById("header").clientHeight;
    
    const controlsWidth =
      shapeRef.clientWidth +
      projectRef.clientWidth +
      bendRef.clientWidth +
      textureRef.clientWidth +
      spiralRef.clientWidth +
      flattenRef.clientWidth +
      modulateRef.clientWidth;

    let openingControlYLocation;

    switch (controlOpened) {
      case "shape":
        openingControlYLocation = shapeRef.offsetTop;
        break;
      case "project":
        openingControlYLocation = projectRef.offsetTop;
        break;
      case "bend":
        openingControlYLocation = bendRef.offsetTop;
        break;
      case "texture":
        openingControlYLocation = textureRef.offsetTop;
        break;
      case "spiral":
        openingControlYLocation = spiralRef.offsetTop;
        break;
      case "flatten":
        openingControlYLocation = flattenRef.offsetTop;
        break;
      case "modulate":
        openingControlYLocation = modulateRef.offsetTop;
        break;
      default:
        break;
    }

    ///////////////////////////////
    //TODO: fix inconsistency related to when pixelRatio is calculated
    //TODO: replace 6 with a constant representing column control interfaceWidth
    //TODO: fix bug where 2 controls need to collapse but only 1 collapses
    //TODO: is pixel ratio really needed here???!!!???
    //      See for reference: https://stackoverflow.com/questions/19014250/rerender-view-on-browser-resize-with-react
    ///////////////////////////////
    const newControlWidth = controlOpened
      ? (this.state[controlOpened + "NumColumns"] * 6 + 150) * pixelRatio
      : 0;

    const newControlHeight = controlOpened ? rootFontSize * 13 * pixelRatio : 0;
    const newControlLabelHeight = rootFontSize * 4 * pixelRatio;


    const forceControlCollapse =
      this.state.showMobile && this.state.openInterfaces.length > 1
        ? true
        : controlsWidth * pixelRatio + newControlWidth >= interfaceWidth;

    const pushControlYAboveFold =
      openingControlYLocation * pixelRatio +
        newControlHeight -
        headerHeight * pixelRatio >
      interfaceHeight;

    //TODO: add ajdustment if the top of the control is moved into the header area
    const adjustControlY = this.state.showMobile ? true : true;

    const adjustControlYAmt = this.state.showMobile
      ? pushControlYAboveFold
        ? newControlHeight * pixelRatio - newControlLabelHeight * pixelRatio
        : rootFontSize * -2
      : 0;

    if (forceControlCollapse) {
      // console.log("forceControlCollapse ");
      if (adjustControlY && controlOpened) {
        this.setState({
          ...this.state,
          [this.state.openInterfaces[0] + "Collapse"]: true,
          [controlOpened + "AdjustY"]: adjustControlY,
          [controlOpened + "AdjustYAmt"]: Math.floor(adjustControlYAmt),
          openInterfaces: [...this.state.openInterfaces, controlOpened]
        });
      } else if (controlOpened) {
        this.setState({
          ...this.state,
          [this.state.openInterfaces[0] + "Collapse"]: true,
          [controlOpened + "AdjustY"]: adjustControlY,
          [controlOpened + "AdjustYAmt"]: 0,
          openInterfaces: [...this.state.openInterfaces, controlOpened]
        });
      } else if (this.state.openInterfaces.length > 1) {
        this.setState({
          ...this.state,
          [this.state.openInterfaces[0] + "Collapse"]: true,
          [controlOpened + "AdjustYAmt"]: Math.floor(adjustControlYAmt)
        });
      }
    } else if (controlOpened && !this.state.showMobile) {
      this.setState({
        ...this.state,
        [controlOpened + "AdjustY"]: false,
        [controlOpened + "AdjustYAmt"]: 0,
        openInterfaces: [...this.state.openInterfaces, controlOpened]
      });
    } else if (this.state.showMobile) {
      this.setState({
        ...this.state,
        [controlOpened + "AdjustY"]: adjustControlY,
        [controlOpened + "AdjustYAmt"]: Math.floor(adjustControlYAmt)
      });
    } else {
      this.setState({
        ...this.state,
        [controlOpened + "AdjustY"]: adjustControlY,
        [controlOpened + "AdjustYAmt"]: Math.floor(adjustControlYAmt)
      });
    }
  };

  onCloseHandler = controlClosed => {
    const newOpenInterfaces = this.state.openInterfaces.filter(
      control => control !== controlClosed
    );

    // clear out the associated state properties
    this.setState({
      ...this.state,
      openInterfaces: newOpenInterfaces,
      [controlClosed + "Collapse"]: false
    });
  };

  render = () => {
    return (
      <div className="Interface" ref={this.interfaceRef}>
        <ShapingControl
          id="shape"
          showMobile={this.state.showMobile}
          numberOfColumns={3}
          collapse={this.state.shapeCollapse}
          adjustY={this.state.shapeAdjustY}
          adjustYAmt={this.state.shapeAdjustYAmt}
          onOpen={this.onOpenHandler}
          onClose={this.onCloseHandler}
          handleUpdate={this.props.handleUpdate}
          parametricObj={this.props.parametricObj}
        />
        <ProjectingControl
          id="project"
          showMobile={this.state.showMobile}
          numberOfColumns={2}
          collapse={this.state.projectCollapse}
          adjustY={this.state.projectAdjustY}
          adjustYAmt={this.state.projectAdjustYAmt}
          onOpen={this.onOpenHandler}
          onClose={this.onCloseHandler}
          handleUpdate={this.props.handleUpdate}
          parametricObj={this.props.parametricObj}
        />

        <BendingControl
          id="bend"
          showMobile={this.state.showMobile}
          numberOfColumns={2}
          collapse={this.state.bendCollapse}
          adjustY={this.state.bendAdjustY}
          adjustYAmt={this.state.bendAdjustYAmt}
          onOpen={this.onOpenHandler}
          onClose={this.onCloseHandler}
          handleUpdate={this.props.handleUpdate}
          parametricObj={this.props.parametricObj}
        />
        <TexturingControl
          id="texture"
          showMobile={this.state.showMobile}
          // TODO: figure out why errors occur with a second slider
          numberOfColumns={1}
          collapse={this.state.textureCollapse}
          adjustY={this.state.textureAdjustY}
          adjustYAmt={this.state.textureAdjustYAmt}
          onOpen={this.onOpenHandler}
          onClose={this.onCloseHandler}
          handleUpdate={this.props.handleUpdate}
          parametricObj={this.props.parametricObj}
        />
        <SpiralingControl
          id="spiral"
          showMobile={this.state.showMobile}
          numberOfColumns={2}
          collapse={this.state.spiralCollapse}
          adjustY={this.state.spiralAdjustY}
          adjustYAmt={this.state.spiralAdjustYAmt}
          onOpen={this.onOpenHandler}
          onClose={this.onCloseHandler}
          handleUpdate={this.props.handleUpdate}
          parametricObj={this.props.parametricObj}
        />
        <FlatteningControl
          id="flatten"
          showMobile={this.state.showMobile}
          numberOfColumns={3}
          collapse={this.state.flattenCollapse}
          adjustY={this.state.flattenAdjustY}
          adjustYAmt={this.state.flattenAdjustYAmt}
          onOpen={this.onOpenHandler}
          onClose={this.onCloseHandler}
          handleUpdate={this.props.handleUpdate}
          parametricObj={this.props.parametricObj}
        />

        <ModulatingControl
          id="modulate"
          showMobile={this.state.showMobile}
          numberOfColumns={1}
          collapse={this.state.modulateCollapse}
          adjustY={this.state.modulateAdjustY}
          adjustYAmt={this.state.modulateAdjustYAmt}
          onOpen={this.onOpenHandler}
          onClose={this.onCloseHandler}
          handleUpdate={this.props.handleUpdate}
          parametricObj={this.props.parametricObj}
        />
      </div>
    );
  };
}
export default Interface;
