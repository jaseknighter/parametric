import registry from './guidance.registry.json' with { type: 'json' };

export const GUIDANCE_REGISTRY = registry;

// Freeze to prevent runtime mutation
Object.freeze(GUIDANCE_REGISTRY);
