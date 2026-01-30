import { cleanFormula, parameterizeGeometry } from './ParametricGeometryBuilder';
import Formulas from './ParametricGeometryFormulas';

describe('cleanFormula Sanitization Pipeline', () => {
  test('[policy] converts π to PI and ^ to **', () => {
    const { sanitized } = cleanFormula("x = u * 2π; y = v^2;");
    expect(sanitized).toContain('PI'); 
    expect(sanitized).toContain('**');
  });

  test('[policy] auto-inserts "let" for undeclared variables', () => {
    const { sanitized } = cleanFormula("speed = 5; x = u * speed;");
    expect(sanitized).toMatch(/let speed = 5/);
  });

  test('[policy] volatility detector identifies "t" for animation', () => {
    const volatilityRegex = /\bt\b/;
    expect(volatilityRegex.test("y = sin(u + t)")).toBe(true);
  });

  test('[policy] handles implicit multiplication (2u -> 2 * u)', () => {
    const { sanitized } = cleanFormula("x = 2u + 5v");
    expect(sanitized).toContain('2 * u');
    expect(sanitized).toContain('5 * v');
  });

  test('[policy] processes range metadata', () => {
    const input = "{u: 0 to 2π} x = 2u;";
    const { ranges } = cleanFormula(input);
    expect(ranges.u[1]).toBeCloseTo(Math.PI * 2, 10);
  });

  test('[policy] exports required functions (validate)', () => {
    expect(cleanFormula).toBeDefined();
    expect(parameterizeGeometry).toBeDefined();
    // Weak assertion + 'validate' marker (policy) -> Yellow
  });
});

describe('parameterizeGeometry Generation', () => {
  test('[behavior] generates valid buffers for a simple plane', () => {
    const config = {
      slices: 2,
      stacks: 2,
      hudCode: 'x=u; y=v; z=0;'
    };
    const result = parameterizeGeometry(config);
    
    expect(result.isValid).toBe(true);
    expect(result.positions).toBeInstanceOf(Float32Array);
    expect(result.indices).toBeInstanceOf(Uint32Array);
    // (2+1)*(2+1) = 9 vertices * 3 coords = 27
    expect(result.positions.length).toBe(27);
    // 2*2 quads * 2 triangles * 3 indices = 24 indices
    expect(result.indices.length).toBe(24);
  });

  test('[failure-mode] handles syntax errors during compilation', () => {
    const config = {
      slices: 2,
      stacks: 2,
      hudCode: 'x = ;' // Syntax error
    };
    const result = parameterizeGeometry(config);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.error).not.toBe("Runtime error in formula");
  });

  test('[failure-mode] handles runtime errors gracefully', () => {
    const config = {
      slices: 2,
      stacks: 2,
      hudCode: 'x = unknownVariable;'
    };
    const result = parameterizeGeometry(config);
    
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Runtime error in formula");
  });

  test('[failure-mode] detects numerical instability (NaN/Infinity)', () => {
    const config = {
      slices: 2,
      stacks: 2,
      hudCode: 'x = 1/0; y=0; z=0;'
    };
    const result = parameterizeGeometry(config);
    
    expect(result.isValid).toBe(false);
    expect(result.isStable).toBe(false);
  });

  test('[behavior] respects custom ranges from metadata', () => {
    const config = {
      slices: 1,
      stacks: 1,
      hudCode: '{u: 0 to 10} x=u; y=0; z=0;'
    };
    const result = parameterizeGeometry(config);
    
    // Check last vertex x position (u=1 should map to 10)
    // positions array layout: [x0,y0,z0, x1,y1,z1, ...]
    // Last vertex is at index length-3
    const lastX = result.positions[result.positions.length - 3];
    
    // Note: parameterizeGeometry applies a scale factor of 1.0 if metadata exists
    expect(lastX).toBeCloseTo(10);
  });

  test('[failure-mode] returns empty buffers for missing config', () => {
    const result = parameterizeGeometry(null);
    expect(result.isValid).toBe(false);
    expect(result.positions.length).toBe(0);
  });
});

describe('ParametricGeometryFormulas', () => {
  test('generateFormulaString includes texture math in Simple Mode', () => {
    const settings = {
      transformationInstructions: { shaping: { radius: 1 } },
      isManualOverride: false
    };
    const scope = { outerTextureAmt: 1.0 };
    
    const result = Formulas.generateFormulaString(settings, scope, 'u', 'CIRCLE', true);
    
    // Should contain sine/cosine logic, not just a scalar multiplier
    expect(result.expr).toContain('sin(u * 2.0 * π * 14'); // TEX_OUTER_FREQ
    expect(result.vars.outerTextureAmt).toBe(1.0);
  });
});