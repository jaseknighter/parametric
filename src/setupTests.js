// 1. Standard DOM Matchers
import '@testing-library/jest-dom';

console.log("Setup loaded!")

// 2. Mock for the Web Worker (Crucial for your app)
// JSDOM (the test environment) doesn't know what a Worker is.
// This prevents "Worker is not defined" errors.
global.Worker = class {
  constructor(stringUrl) {
    this.url = stringUrl;
    this.onmessage = () => {};
  }
  postMessage(msg) {
    this.onmessage({ data: msg });
  }
  terminate() {}
};

// 3. Mock for HTML Canvas (Required for Three.js)
// Three.js needs a canvas to get a 'webgl' context.
// You may need to run: npm install --save-dev jest-canvas-mock
import 'jest-canvas-mock';
