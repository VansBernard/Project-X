import { describe, expect, it } from 'vitest';
import { normalizeApiBaseUrl } from './api';

describe('normalizeApiBaseUrl', () => {
  it('rewrites the stale Render host to the active API URL', () => {
    expect(normalizeApiBaseUrl('https://project-x-api.onrender.com')).toBe('https://project-x-api-kwty.onrender.com');
    expect(normalizeApiBaseUrl('https://project-x-api.onrender.com/api/v1')).toBe('https://project-x-api-kwty.onrender.com');
  });

  it('keeps the active API host when already correct', () => {
    expect(normalizeApiBaseUrl('https://project-x-api-kwty.onrender.com/api/v1')).toBe('https://project-x-api-kwty.onrender.com');
  });
});
