import React, { Component } from "react";
import update from "immutability-helper";
import * as THREE from "three";
import { TrackballControls } from "three/examples/jsm/controls/TrackballControls";
import { parameterizeGeometry } from "../../components/ParametricGeometryBuilder/ParametricGeometryBuilder";
import Interface from "../Interface/Interface";

import "./Parametric.css";

class Parametric extends Component {
  constructor(props) {
    super(props);
    this.state = {
      inited: false,
      isInteracting: false,
      parametricObj: {
        name: "pObj1",
        slices: 100,
        stacks: 100,
        transformationInstructions: {
          shaping: {
            formula: "circle",
            vectors: ["x", "y"],
            vectorParams: {
              bendCos: false, bendCosAmt: 0.025, bendSin: false, bendSinAmt: 0.025,
              spiralCos: false, spiralCosAmt: 10, spiralSin: false, spiralSinAmt: 10,
              texture: false, outerTextureAmt: 2, innerTextureAmt: 4,
              modulate: false, modulateAmt: 3, pinch: false, pinchAmt: 3,
              flatten: false, flattenAmt1: 0, flattenAmt2: 0, flattenAmt3: 0
            }
          },
          projecting: {
            formula: "project2",
            vectors: ["x", "y"],            
            vectorParams: { flatten: false, flattenAmt1: 0, flattenAmt2: 0, flattenAmt3: 0 }
          },
          rotating: { formula: "rotate", vectorParams: { pitch: 0, roll: 0, yaw: -90 } }
        }
      },
      visible: true
    };
    this.interactionTimeout = null;
    this.controls = null;
  }

  componentDidMount = () => {
    this.setupThree();
  };

  componentDidUpdate = (prevProps, prevState) => {
    // Check if the math parameters actually changed
    const mathChanged = JSON.stringify(prevState.parametricObj) !== JSON.stringify(this.state.parametricObj);
    const interactionChanged = prevState.isInteracting !== this.state.isInteracting;

    if (mathChanged || interactionChanged || !this.state.inited) {
      this.updateThree();
      if (!this.state.inited) this.setState({ inited: true });
    }
  };

  updateParametricObjHandler = (updateArray) => {
    if (!this.state.isInteracting) {
      this.setState({
        isInteracting: true,
        parametricObj: { ...this.state.parametricObj, slices: 40, stacks: 40 }
      });
    }

    if (this.interactionTimeout) clearTimeout(this.interactionTimeout);

    updateArray.forEach((updateItem) => {
      let parametricObjUpdate = {};
      let current = parametricObjUpdate;
      const pathArray = updateItem.objectStatePath.split(".");
      for (let i = 0; i < pathArray.length; i++) {
        if (i !== pathArray.length - 1) {
          current[pathArray[i]] = {};
          current = current[pathArray[i]];
        } else {
          current[pathArray[i]] = { [updateItem.paramToUpdate]: { $set: updateItem.newValue } };
        }
      }

      let rootStateUpdate = {};
      if (updateItem.hasOwnProperty("visible")) {
        rootStateUpdate.visible = { $set: updateItem.visible };
      }
      this.setState(this.setParametricObjStateCallback(parametricObjUpdate, rootStateUpdate));
    });

    this.interactionTimeout = setTimeout(() => {
      this.setState({
        isInteracting: false,
        parametricObj: { ...this.state.parametricObj, slices: 100, stacks: 100 }
      });
    }, 150);
  };

  setParametricObjStateCallback = (parametricObjUpdate, rootStateUpdate) => {
    return (previousState) => {
      const updatedParametricObjState = update(previousState, parametricObjUpdate);
      return update(updatedParametricObjState, rootStateUpdate);
    };
  };

  updateThree = () => {
    const scene = this.state.scene;
    if (!scene) return;
    
    const oldObj = scene.getObjectByName("pGeo");
    if (oldObj) {
      scene.remove(oldObj);
      oldObj.geometry.dispose();
      oldObj.material.dispose();
    }

    const geometry = parameterizeGeometry(this.state.parametricObj);
    geometry.center();
    
    const material = new THREE.MeshPhongMaterial({
      side: THREE.DoubleSide,
      color: 0x000000,
      flatShading: true,
      wireframe: true,
      transparent: true,
      opacity: this.state.visible ? 1 : 0
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "pGeo";
    scene.add(mesh);
  };

  setupThree = () => {
    const canvas = document.querySelector("#three");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

    const camera = new THREE.PerspectiveCamera(40, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);

    // CONTROL CONFIGURATION
    this.controls = new TrackballControls(camera, canvas);
    this.controls.rotateSpeed = 3.0;
    this.controls.dynamicDampingFactor = 0.02; // Slightly higher to help the "brake"

    // THE HARD BRAKE: Listener to kill momentum
    this.controls.addEventListener("start", () => {
      // Stop the movement immediately by disabling damping temporarily
      this.controls.staticMoving = true;
      this.controls.update();
      
      if (this.interactionTimeout) clearTimeout(this.interactionTimeout);
      
      // if (!this.state.isInteracting) {
      //   this.setState({
      //     isInteracting: true,
      //     parametricObj: { ...this.state.parametricObj, slices: 40, stacks: 40 }
      //   });
      // }
    });

    this.controls.addEventListener("end", () => {
      // Re-enable damping once user moves the mouse
      this.controls.staticMoving = false;
      
      // this.interactionTimeout = setTimeout(() => {
      //   this.setState({
      //     isInteracting: false,
      //     parametricObj: { ...this.state.parametricObj, slices: 100, stacks: 100 }
      //   });
      // }, 150);
    });

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // LIGHTING
    const light = new THREE.PointLight(0xffffff, 2);
    light.position.set(0, -3, 3);
    scene.add(light);
    const backlight = new THREE.PointLight(0xffffff, 2);
    backlight.position.set(0, 3, -3);
    scene.add(backlight);

    this.setState({ scene, renderer, camera }, () => {
        this.updateThree();
        this.renderThree();
    });
  };

  renderThree = () => {
    if (this.controls) this.controls.update();
    this.state.renderer.render(this.state.scene, this.state.camera);
    requestAnimationFrame(this.renderThree);
  };

  render = () => (
    <div className="Container">
      <header className="Header">Parametric Equations</header>
      <canvas className="Three" id="three" />
      <div className="Interface_Container">
        <Interface handleUpdate={this.updateParametricObjHandler} parametricObj={this.state.parametricObj} />
      </div>
    </div>
  );
}

export default Parametric;