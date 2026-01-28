import Ajv from 'ajv';
import schema from './guidance.schema.json' with { type: 'json' };
import registryData from './guidance.registry.json' with { type: 'json' };

export function loadGuidanceRegistry() {
  // [cite: 2026-01-27] FIX: Use static imports for Playwright/Vite compatibility
  const registry = registryData;

  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);
  const valid = validate(registry);

  if (!valid) {
    console.error('❌ GUIDANCE_REGISTRY schema violation');
    console.error(validate.errors);
    throw new Error('Invalid GUIDANCE_REGISTRY');
  }

  return registry;
}