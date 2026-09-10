import { describe, expect, it, vi, beforeEach } from 'vitest';
import { apiClient } from './api';

describe('apiClient.confirmDealerSignup', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('stores auth tokens from the nested signup confirmation response payload', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 201,
      statusText: 'Created',
      json: async () => ({
        data: {
          auth: {
            accessToken: 'access-123',
            refreshToken: 'refresh-456',
            expiresInSeconds: 3600,
            sessionId: 'session-789',
          },
        },
      }),
    } as Response);

    const result = await apiClient.confirmDealerSignup('signup-token');

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/dealers/signup/confirm'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ token: 'signup-token' }),
      }),
    );
    expect(result).toEqual({
      auth: {
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        expiresInSeconds: 3600,
        sessionId: 'session-789',
      },
    });
    expect(localStorage.getItem('accessToken')).toBe('access-123');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-456');
  });
});
