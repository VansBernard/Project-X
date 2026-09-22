import { describe, expect, it, beforeEach, vi } from 'vitest';
import { apiClient } from './api';

describe('apiClient auth state notifications', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('dispatches an auth update event when tokens are stored', () => {
    const listener = vi.fn();
    window.addEventListener('auth:tokens-updated', listener);

    (apiClient as any).setTokens('access-token', 'refresh-token');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('accessToken')).toBe('access-token');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-token');
  });
});
