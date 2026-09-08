import { describe, expect, it, vi } from 'vitest';
import {
  clearSession,
  expireSession,
  expireSessionIfCurrent,
  SESSION_EXPIRED_EVENT,
  TOKEN_KEY,
  USERNAME_KEY,
} from './session';

describe('session', () => {
  it('clears both persisted values', () => {
    const removeItem = vi.fn();

    clearSession({ removeItem });

    expect(removeItem.mock.calls).toEqual([[TOKEN_KEY], [USERNAME_KEY]]);
  });

  it('notifies the application when a session expires', () => {
    const dispatchEvent = vi.fn();

    expireSession({ removeItem: vi.fn() }, { dispatchEvent });

    expect(dispatchEvent).toHaveBeenCalledOnce();
    expect(dispatchEvent.mock.calls[0][0]).toMatchObject({ type: SESSION_EXPIRED_EVENT });
  });

  it('does not expire a newer session when an old request fails', () => {
    const storage = {
      getItem: vi.fn(() => 'new-token'),
      removeItem: vi.fn(),
    };
    const dispatchEvent = vi.fn();

    expect(expireSessionIfCurrent('old-token', storage, { dispatchEvent })).toBe(false);
    expect(storage.removeItem).not.toHaveBeenCalled();
    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it('expires the current session once even when repeated 401 responses arrive', () => {
    let token: string | null = 'current-token';
    const storage = {
      getItem: vi.fn(() => token),
      removeItem: vi.fn((key: string) => {
        if (key === TOKEN_KEY) token = null;
      }),
    };
    const dispatchEvent = vi.fn();

    expect(expireSessionIfCurrent('current-token', storage, { dispatchEvent })).toBe(true);
    expect(expireSessionIfCurrent('current-token', storage, { dispatchEvent })).toBe(false);
    expect(dispatchEvent).toHaveBeenCalledOnce();
  });
});
