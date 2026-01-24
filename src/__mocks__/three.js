// src/__mocks__/three.js
const THREE = jest.requireActual('three');

// Create a "Safe Mock" renderer
const mockRenderer = {
  setSize: jest.fn(),
  setPixelRatio: jest.fn(),
  clear: jest.fn(),
  render: jest.fn(),
  dispose: jest.fn(),
  shadowMap: { enabled: false },
  domElement: document.createElement('canvas'),
};

module.exports = {
  ...THREE,
  WebGLRenderer: jest.fn().mockImplementation(() => mockRenderer),
};