import { getWorkerDataPacket, preflightValidation, validateAxisSelection } from './ParametricLogic';

jest.mock('./ParametricGeometryFormulas.js', () => ({
  generateFormulaString: jest.fn(() => 'generated_code')
}));

jest.mock('../../services/ParametricIntentService.js', () => ({
  intentService: {
    projectForCPU: jest.fn(() => ({ mathScope: { radius: 5, globalScale: 2 } }))
  }
}));

jest.mock('../../utilities/debug', () => ({
  Debug: {
    isEnabled: jest.fn(),
    log: jest.fn()
  }
}));

describe('ParametricLogic', () => {
  describe('getWorkerDataPacket', () => {
    test('Flattens 3x3 projection vectors', () => {
      const settings = {
        rid: 1,
        transformationInstructions: {
          projecting: {
            vectors: [['x', '', ''], ['', 'y', ''], ['', '', 'z']]
          }
        }
      };
      const packet = getWorkerDataPacket(settings);
      expect(packet.projecting.vectors).toEqual(['x', 'y', 'z']);
    });

    test('Uses manual formula and global scale when in manual override', () => {
      const settings = {
        rid: 2,
        isManualOverride: true,
        manualFormula: 'manual_code',
        uFormula: 'u_code',
        vFormula: 'v_code',
        wFormula: 'w_code'
      };
      const packet = getWorkerDataPacket(settings);
      expect(packet.manualFormula).toBe('manual_code');
      expect(packet.scaleFactor).toBe(5); // From mock scope.radius (effectiveRadius)
    });

    test('Uses global scale when not in manual override', () => {
      const settings = { rid: 3, isManualOverride: false };
      const packet = getWorkerDataPacket(settings);
      expect(packet.scaleFactor).toBe(5); // From mock scope.radius (effectiveRadius)
    });
  });

  describe('preflightValidation', () => {
    test('Validates correct code', () => {
      expect(preflightValidation('x = u + v;').valid).toBe(true);
    });

    test('Rejects empty/short code', () => {
      expect(preflightValidation('x=1').valid).toBe(false);
    });

    test('Rejects syntax errors', () => {
      expect(preflightValidation('x = ;').valid).toBe(false);
    });

    test('Rejects unbalanced parentheses', () => {
      expect(preflightValidation('x = (u + v').valid).toBe(false);
    });

    test('Rejects missing variables', () => {
      expect(preflightValidation('x = 5').valid).toBe(false); // No u, v, or t
    });
  });

  describe('validateAxisSelection', () => {
    test('Validates correct selection', () => {
      const res = validateAxisSelection(['x', 'y', 'z']);
      expect(res.isValid).toBe(true);
      expect(res.x).toBe(true);
    });

    test('Invalidates duplicates or missing', () => {
      const res = validateAxisSelection(['x', 'x', 'z']);
      expect(res.isValid).toBe(false);
    });
  });
});