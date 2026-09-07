import { afterEach, describe, expect, it, vi } from 'vitest';
import { SESSION_EXPIRED_EVENT, TOKEN_KEY } from './auth/session';

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

const createBrowserGlobals = () => {
  const storage = new MemoryStorage();
  const eventTarget = new EventTarget() as EventTarget & { localStorage: MemoryStorage };
  eventTarget.localStorage = storage;
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', eventTarget);
  return { storage, eventTarget };
};

describe('API authentication interceptor', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('expires the session when the current token receives a 401', async () => {
    const { storage, eventTarget } = createBrowserGlobals();
    storage.setItem(TOKEN_KEY, 'current-token');
    const expired = vi.fn();
    eventTarget.addEventListener(SESSION_EXPIRED_EVENT, expired);
    const { default: api } = await import('./api');

    await expect(api.get('/test', {
      adapter: async (config) => Promise.reject({ config, response: { status: 401 } }),
    })).rejects.toMatchObject({ response: { status: 401 } });

    expect(storage.getItem(TOKEN_KEY)).toBeNull();
    expect(expired).toHaveBeenCalledOnce();
  });

  it('preserves a newer login when an older request later receives a 401', async () => {
    const { storage, eventTarget } = createBrowserGlobals();
    storage.setItem(TOKEN_KEY, 'old-token');
    const expired = vi.fn();
    eventTarget.addEventListener(SESSION_EXPIRED_EVENT, expired);
    const { default: api } = await import('./api');

    await expect(api.get('/test', {
      adapter: async (config) => {
        storage.setItem(TOKEN_KEY, 'new-token');
        return Promise.reject({ config, response: { status: 401 } });
      },
    })).rejects.toMatchObject({ response: { status: 401 } });

    expect(storage.getItem(TOKEN_KEY)).toBe('new-token');
    expect(expired).not.toHaveBeenCalled();
  });
});
