/**
 * @fileoverview workerHelper.js
 * MAIN SINGLETON: Ensures only one worker exists.
 * FIXED: Restored Debug import to fix ReferenceError.
 * FIXED: Uncommented handshake handler for active verification.
 * [cite: 2026-01-13]
 */

import { Debug } from '../../utilities/debug'; // RESTORED IMPORT

let workerInstance = null;

/** * getActiveWorker
 * @returns {Worker|null}
 */
export const getActiveWorker = () => workerInstance;

/**
 * createWorker
 * AUTHORITY: Singleton spawn logic for Vite.
 * @returns {Worker|null}
 */
const createWorker = () => {
  // 🟢 INVARIANT: Never spawn twice.
  if (workerInstance) return workerInstance;

  try {
    // 🟢 VITE NATIVE: Correct way to resolve worker in dev and prod.
    workerInstance = new Worker(
      new URL('./Parametric.worker.js', import.meta.url),
      { type: 'module' }
    );
    
    workerInstance.onerror = (e) => {
      Debug.error("WORKER", `Fatal: ${e.message} at ${e.filename}:${e.lineno}`);
    };

  } catch (err) {
    Debug.error("WORKER", "Spawn failed. Check if Parametric.worker.js exists:", err);
  }

  return workerInstance;
};

export default createWorker;

/**
 * 🛠️ IMPROVED DIAGNOSTIC TOOL
 * Runs only in Dev to verify the connection without hardcoded paths.
 */
if (import.meta.env.DEV) {
  (function debugWorker() {
    Debug.log("WORKER", "Initiating Handshake Test...");
    
    const testWorker = createWorker();
    
    if (!testWorker) {
      Debug.error("WORKER", "Cannot run debug: Worker instance is null.");
      return;
    }

    /**
     * Internal handler to verify worker response.
     */
    const testHandler = (e) => {
      if (e.data === "ALIVE") {
        Debug.log("WORKER", "HANDSHAKE SUCCESS: Worker is responsive.");
      }
      if (e.data === "WORKER_READY") {
        Debug.log("WORKER", "MATH READY: Formulas loaded.");
      }
    };

    testWorker.addEventListener('message', testHandler);
    
    Debug.log("WORKER", "Sending PING...");
    testWorker.postMessage("PING");
    
    // Cleanup the debug listener after 5s so it doesn't leak
    setTimeout(() => {
      testWorker.removeEventListener('message', testHandler);
      Debug.log("WORKER", "Debug listener detached.");
    }, 5000);
  })();
}