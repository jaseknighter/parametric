import React, { Component } from "react";
import update from "immutability-helper";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { parameterizeGeometry } from "../../components/ParametricGeometryBuilder/ParametricGeometryBuilder";
import Interface from "../Interface/Interface";

import "./Parametric.css";

class Parametric extends Component {
  constructor(props) {
    super(props);

    //NOTE: the order of transformation types held in state
    // dictates the order they are run

    //IMPORTANT: this is where the initial state configs are set!!!
    this.state = {
      audioStarted: false,
      selectedValue: "Nothing selected",
      parametricObjects: [{ obj: "obj1" }],
      parametricObj: {
        name: "pObj1",
        slices: 30,
        stacks: 10,
        transformationInstructions: {
          shaping: {
            formula: "circle",
            vectors: ["x", "y"],
            vectorParams: {
              bendCos: false,
              bendCosAmt: 0.025,
              bendSin: false,
              bendSinAmt: 0.025,
              spiralCos: false,
              spiralCosAmt: 10,
              spiralSin: false,
              spiralSinAmt: 10,
              texture: false,
              outerTextureAmt: 2,
              innerTextureAmt: 4,
              modulate: false,
              modulateAmt: 3,
              pinch: false,
              pinchAmt: 3,
              flatten: false,
              flattenAmt1: 0,
              flattenAmt2: 0,
              flattenAmt3: 0
            }
          },
          projecting: {
            formula: "project2",
            vectors: ["x", "y"],            
            vectorParams: {
              flatten: false,
              flattenAmt1: 0,
              flattenAmt2: 0,
              flattenAmt3: 0
            }
          },
          rotating: {
            formula: "rotate",
            vectorParams: { pitch: 0, roll: 0, yaw: -90 }
          }
        }
      },
      visible: true
    };
  }

  componentDidMount = () => {
    this.setupThree();
    this.setState({ initedScene: true });
  };

  componentDidUpdate = () => {
    this.updateThree();
  };

  updateParametricObjHandler = updateArray => {
    updateArray.forEach(updateItem => {
        // 1. Dynamically create the update object for parametricObj using immutability-helper
        var parametricObjUpdate = {};
        var current = parametricObjUpdate;

        const pathArray = updateItem.objectStatePath.split(".");
        for (var i = 0; i < pathArray.length; i++) {
            if (i !== pathArray.length - 1) {
                current[pathArray[i]] = {};
                current = current[pathArray[i]];
            } else {
                current[pathArray[i]] = {
                    [updateItem.paramToUpdate]: { $set: updateItem.newValue }
                };
                current = current[pathArray[i]];
            }
        }

        // 2. Create a separate update object for root-level state properties (like 'visible')
        var rootStateUpdate = {};
        
        // Check if the updateItem includes the 'visible' property
        if (updateItem.hasOwnProperty('visible')) {
            // Add the visible property update to the rootStateUpdate object
            // This will update 'this.state.visible'
            rootStateUpdate.visible = { $set: updateItem.visible };
        }

        // 3. Call setState with both update objects
        this.setState(
            this.setParametricObjStateCallback(parametricObjUpdate, rootStateUpdate),
        );
    });
  };

  setParametricObjStateCallback = (parametricObjUpdate, rootStateUpdate) => {
    return (previousState, currentProps) => {
        
        // Apply the update for parametricObj
        const updatedParametricObjState = update(previousState, parametricObjUpdate);
        
        // Apply the update for root-level properties (like 'visible')
        // The rootStateUpdate will only contain properties like 'visible' if they exist.
        const combinedUpdatedState = update(updatedParametricObjState, rootStateUpdate);
        
        // Return the final combined state
        return combinedUpdatedState;
    };
  };

  lastGeo = [];
  updateThree = () => {
    this.state.scene.remove(this.state.scene.getObjectByName("pGeo"));
    const geometry = parameterizeGeometry(this.state.parametricObj);
    this.lastGeo = geometry.index.array;
    geometry.center();
    const visible = this.state.visible;
    this.addGeometry(0, 0, geometry, "pGeo", visible);
  };

  setupThree = () => {
    const canvas = document.querySelector("#three");
    const renderer = new THREE.WebGLRenderer({ canvas });

    // Define the "frustrum" (see wikipedia for details)
    const fov = 40; // field of view in degrees
    const cWidth = canvas.clientWidth;
    const cHeight = canvas.clientHeight;
    const aspect = cWidth / cHeight; // 2 is the canvas default
    const near = 0.1; // the near space in front of the camera that will be clipped
    const far = 1000; // the far space in front of the camera that will be clipped

    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(camera, canvas);

    this.controls.target.set(0, 0, 0);
    this.controls.update();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    // an array of objects whose rotation to update
    const objects = [];

    this.createMaterial = (visible) => {
      //Passing THREE.DoubleSide front and back of shapes will be drawn
      //NOTE: this takes more time to render
      const showWireframe = visible ? 1 : 0;
      const material = new THREE.MeshPhongMaterial({
        side: THREE.DoubleSide,
        specular: 0xffffff,
        shininess: 0,
        opacity: showWireframe,
        transparent: true,
        flatShading: true,
        wireframe: true
      });
      const hue = 0.0; 
      const saturation = 1;
      const luminance = 0.0;
      material.color.setHSL(hue, saturation, luminance);
      return material;
    };

    this.addGeometry = (x, y, geometry, name, visible) => {
      const mesh = new THREE.Mesh(geometry, this.createMaterial(visible));
      this.addObject(x, y, mesh, name);
    };

    this.addObject = (x, y, obj, name) => {
      // put obj in center
      obj.position.x = x;
      obj.position.y = y;
      obj.name = name;
      scene.add(obj);
      objects.push(obj);
    };

    const geometry = parameterizeGeometry(
      this.state.parametricObj
    );

    //center the geometry
    geometry.center();

    // create lighting
    const color = 0xffffff;
    const intensity = 2;
    
    // const light = new THREE.AmbientLight(color, intensity);
    const light = new THREE.PointLight(color, intensity);
    light.position.set(0, -3, 3);
    scene.add(light);

    const lightLocObj = new THREE.Object3D();
    lightLocObj.position.set(
      light.position.x,
      light.position.y,
      light.position.z
    );
    scene.add(lightLocObj);

    const backlight = new THREE.PointLight(color, intensity);
    backlight.position.set(0, 3, -3);
    scene.add(backlight);

    const backlightLocObj = new THREE.Object3D();
    backlightLocObj.position.set(
      backlight.position.x,
      backlight.position.y,
      backlight.position.z
    );
    scene.add(backlightLocObj);

    const centerObj = new THREE.Object3D();
    scene.add(centerObj);

    // set state for canvas, renderer, camera...
    this.setState({
      canvas: canvas,
      renderer: renderer,
      camera: camera,
      cameraSettings: {
        fov: fov,
        aspect: aspect,
        near: near,
        far: far
      },
      objects: objects,
      light: light,
      lightSettings: {
        color: color,
        intensity: intensity
      },
      scene: scene
    });

    this.renderThree = () => {
      // const canvas = renderer.domElement;
      if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
      }

      renderer.render(scene, camera);
      requestAnimationFrame(this.renderThree);
    };

    function resizeRendererToDisplaySize(renderer) {
      const canvas = renderer.domElement;
      const pixelRatio = window.devicePixelRatio;
      const width = (canvas.clientWidth * pixelRatio) | 0;
      const height = (canvas.clientHeight * pixelRatio) | 0;
      const needResize = canvas.width !== width || canvas.height !== height;
      if (needResize) {
        renderer.setSize(width, height, false);
      }
      return needResize;
    }

    requestAnimationFrame(this.renderThree);
  };

  render = () => {
    return (
      <div className="Container">
        <header id="header" className="Header">
          Parametric Equations
          <a href="#footer" className="about-link">
            (about)
          </a>
        </header>
        <canvas className="Three" id="three" />
        <div id="control" className="Interface_Container">
          <Interface
            handleUpdate={this.updateParametricObjHandler}
            parametricObj={this.state.parametricObj}
          />
        </div>
        <footer id="footer" className="Footer">
          <header className="Footer___Title">About Parametric Equations</header>
          <div className="Footer___Content___Container"><h3>add info about parametric equations...</h3></div>
        </footer>
      </div>
    );
  };
}
export default Parametric;
