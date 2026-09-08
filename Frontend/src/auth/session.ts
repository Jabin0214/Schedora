export const TOKEN_KEY = 'schedora_token';
export const USERNAME_KEY = 'schedora_username';
export const SESSION_EXPIRED_EVENT = 'schedora:session-expired';

type SessionStorage = Pick<Storage, 'getItem' | 'removeItem'>;
type ClearableSessionStorage = Pick<Storage, 'removeItem'>;
type SessionEventTarget = Pick<EventTarget, 'dispatchEvent'>;

export const clearSession = (
  storage: ClearableSessionStorage = window.localStorage,
) => {
  storage.removeItem(TOKEN_KEY);
  storage.removeItem(USERNAME_KEY);
};

export const expireSession = (
  storage: ClearableSessionStorage = window.localStorage,
  eventTarget: SessionEventTarget = window,
) => {
  clearSession(storage);
  eventTarget.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
};

export const expireSessionIfCurrent = (
  failedToken: string | null,
  storage: SessionStorage = window.localStorage,
  eventTarget: SessionEventTarget = window,
) => {
  if (!failedToken || storage.getItem(TOKEN_KEY) !== failedToken) {
    return false;
  }

  expireSession(storage, eventTarget);
  return true;
};
