import { withSelfHealing } from './selfHealingWrapper';

describe('selfHealingWrapper', () => {
  beforeAll(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('[behavior] returns result directly if action succeeds', async () => {
    const action = jest.fn().mockResolvedValue('success');
    const healing = jest.fn();
    const result = await withSelfHealing(action, healing);
    expect(result).toBe('success');
    expect(healing).not.toHaveBeenCalled();
  });

  test('[failure-mode] executes healing and retries if action fails initially', async () => {
    const action = jest.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('recovered');
    const healing = jest.fn().mockResolvedValue(true);
    
    const result = await withSelfHealing(action, healing);
    
    expect(healing).toHaveBeenCalled();
    expect(action).toHaveBeenCalledTimes(2);
    expect(result).toBe('recovered');
  });

  test('[failure-mode] throws if retry fails', async () => {
    const action = jest.fn().mockRejectedValue(new Error('persistent fail'));
    const healing = jest.fn().mockResolvedValue(true);
    
    await expect(withSelfHealing(action, healing)).rejects.toThrow('persistent fail');
  });
});