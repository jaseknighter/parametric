/**
 * @fileoverview ParametricAuthority.js
 * CENTRAL AUTHORITY: Manages RID generation, Mode Latching, and Pre-emption logic.
 * [cite: 2026-01-17]
 */
import { Debug } from "../utilities/debug";

export class ParametricAuthority {
  constructor() {
    this.manager = null;
    this.ridCounter = 0;
    this.mode = 'AUTO'; // 'AUTO' or 'MANUAL'
    this.isWorkerBusy = false;
    this.pendingUpdate = false;
    this.highestRidProcessed = -1;
  }

  setManager(manager) {
    this.manager = manager;
  }

  /**
   * THE PRE-EMPTIVE STRIKE
   * Call this when focus shifts (e.g., HUD -> Slider)
   */
  requestManualOverride() {
    this.mode = 'MANUAL';
    this.isWorkerBusy = false; 
    this.pendingUpdate = false;
    if (this.manager) {
        this.manager.resetAuthority(); // Tell Manager to ignore worker
    }
    Debug.log("AUTHORITY", "Manual Override Latched. Pipeline Cleared.");
    return this.getNextRid();
  }

  releaseOverride() {
    this.mode = 'AUTO';
    this.isWorkerBusy = false;
    Debug.log("AUTHORITY", "Manual Override Released.");
  }

  getNextRid() {
    return ++this.ridCounter;
  }

  /**
   * VALIDATION GATE
   * Only allows the Manager to apply data if it's the newest RID.
   */
  shouldAcceptResult(rid) {
    if (rid < this.highestRidProcessed) {
      Debug.warn("AUTHORITY", `Stale Packet Rejected: ${rid} < ${this.highestRidProcessed}`);
      return false;
    }
    this.highestRidProcessed = rid;
    this.isWorkerBusy = false;
    return true;
  }

  canShip() {
    // Logic: If in Manual mode, we always ship (Pre-empt). 
    // If in Auto, we respect the busy gate.
    if (this.mode === 'MANUAL') return true;
    return !this.isWorkerBusy;
  }
}
