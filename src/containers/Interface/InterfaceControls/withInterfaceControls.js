import React, { Component } from "react";

const withInterfaceControls = (WrappedComponent, controlID, controlClass) => {
  const AuxControls = React.forwardRef((props, ref) => (
    <div id={controlID} className={controlClass} ref={ref}>
      <WrappedComponent {...props} ref={ref} />
    </div>
  ));

  return class extends Component {
    state = {
      open: false
    };

    constructor(props) {
      super(props);
    }

    componentDidMount = () => {
      this.controlsRef = React.createRef();
      this.updateControlsRef = this.updateControlsRef.bind(this);

      this.openContainerStyleName =
        "Controls___Container_" + this.props.numberOfColumns + "column_Open";
      this.closeContainerStyleName =
        "Controls___Container_" + this.props.numberOfColumns + "column_Close";
    };

    componentDidUpdate = () => {
      if (this.props.collapse && this.state.open && !this.state.transitioning) {
        // console.log("collapse")
        this.updateControlsRef();
      }
    };

    updateControlsRef = () => {
      const cRef = this.controlsRef.current;

      const controlsContainer___Button = cRef.querySelector(
        ".TAreaInterface___TitleButton"
      );
      const controlsContainer___Interface = cRef.querySelector(
        ".TAreaInterface_controlsContainer"
      );
      
      if (!this.state.open && !this.state.transitioning) {
        this.props.onOpen(controlID);
        this.openControlAnim(
          250,
          cRef,
          controlsContainer___Interface,
          controlsContainer___Button
        );
      } else if (!this.state.transitioning) {
        this.props.onClose(controlID);
        this.closeControlAnim(
          250,
          cRef,
          controlsContainer___Interface,
          controlsContainer___Button
        );
      }
    };

    openControlAnim = (
      timeout,
      controlsContainer,
      controlsContainer___Interface,
      controlsContainer___Button
    ) => {
      // console.log("openControlAnim", this.openContainerStyleName);
      controlsContainer.classList.remove(this.openContainerStyleName);
      controlsContainer.classList.add(this.openContainerStyleName);
      controlsContainer___Interface.classList.remove("Controls_Show");
      controlsContainer.classList.remove(this.closeContainerStyleName);
      this.setState({
        ...this.state,
        transitioning: true
      });

      setTimeout(
        function() {
          const numberOfColumns = this.props.numberOfColumns;
          controlsContainer___Interface.classList.remove("Controls_Hide");
          controlsContainer.classList.remove(this.closeContainerStyleName);
          controlsContainer___Interface.classList.add("Controls_Show");
          controlsContainer___Interface.style.transform =
            "translateY(" + -1 * this.props.adjustYAmt + "px)";
          if (this.props.showMobile){
            if (this.props.adjustYAmt < 0){
              controlsContainer___Interface.style.borderTopStyle = "solid";
              controlsContainer___Interface.style.borderLeft = "none";
              controlsContainer___Interface.style.borderBottom = "none";
            } else {
              controlsContainer___Interface.style.borderStyle = "solid";
              controlsContainer___Interface.style.borderLeft = "none";
              controlsContainer___Interface.style.borderTop = "none"
            }
          } else {
              controlsContainer___Interface.style.borderRightStyle = "none";
              controlsContainer___Interface.style.borderLeftStyle = "none";
              controlsContainer___Interface.style.borderBottomStyle = "none";
              controlsContainer___Interface.style.borderTopStyle = "none";
          }

          const controlColumnsValue = numberOfColumns === 1 ? "0" : numberOfColumns === 2 ? "5rem 5rem" : "5rem 5rem 5rem";
          controlsContainer___Interface.style.gridTemplateColumns = controlColumnsValue;

          const newState = this.state.open ? false : true;
          this.setState({
            ...this.state,
            open: newState,
            transitioning: false
          });
        }.bind(this),
        timeout
      );
    };

    closeControlAnim = (
      timeout,
      controlsContainer,
      controlsContainer___Interface,
      controlsContainer___Button
    ) => {
      controlsContainer___Interface.classList.add("Controls_Hide");
      this.setState({
        ...this.state,
        transitioning: true
      });
      setTimeout(
        function() {
          controlsContainer.classList.add(this.closeContainerStyleName);
          controlsContainer___Interface.classList.remove("Controls_Show");
          controlsContainer.classList.remove(this.openContainerStyleName);

          setTimeout(
            function() {
              controlsContainer.classList.remove(this.closeContainerStyleName);
              const newState = this.state.open ? false : true;
              this.setState({
                ...this.state,
                open: newState,
                transitioning: false
              });
            }.bind(this),
            timeout
          );
        }.bind(this),
        timeout
      );
    };

    ////////////////////////////////
    // TODO: Look into why it necessary to explicitly pass parametricObj to props
    ////////////////////////////////
    render() {
      return (
        <AuxControls
          controlID={controlID}
          updateControlsRef={this.updateControlsRef}
          parametricObj={this.props.parametricObj}
          handleUpdate={this.props.handleUpdate}
          onOpen={this.props.onOpenHandler}
          onClose={this.onCloseHandler}
          ref={this.controlsRef}
        />
      );
    }
  };
};

export default withInterfaceControls;
