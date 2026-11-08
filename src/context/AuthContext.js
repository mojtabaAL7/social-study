import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useLocalStorage } from '../hooks';
import { makeId } from './studyReducer';

/*
 * Front-end-only accounts, until a backend exists. Accounts and each person's study data
 * live in this browser's localStorage. Passwords are hashed before saving so they are not
 * stored as plain text, but this is NOT real security: replace this file with calls to an
 * auth server (the rest of the app only uses useAuth()).
 */

export const ACCOUNTS_KEY = 'social-study:accounts';
export const SESSION_KEY = 'social-study:session';
const LEGACY_DATA_KEY = 'social-study:data';
export const GUEST_ID = 'guest';

/** Where one person's study data is saved. */
export const dataKeyFor = (accountId) => `social-study:data:${accountId}`;

const AuthContext = createContext(null);

const normaliseEmail = (email) => email.trim().toLowerCase();

async function hashPassword(email, password) {
  const input = `social-study:${normaliseEmail(email)}:${password}`;
  const subtle = typeof window !== 'undefined' && window.crypto && window.crypto.subtle;
  if (subtle && window.TextEncoder) {
    const digest = await subtle.digest('SHA-256', new TextEncoder().encode(input));
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback where Web Crypto is unavailable (old browsers, test environments).
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) hash = (hash * 33) ^ input.charCodeAt(i);
  return `djb2-${(hash >>> 0).toString(16)}`;
}

function storage() {
  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
}

/** Data saved before accounts existed goes to the first person who signs in. */
function claimLegacyData(accountId) {
  const store = storage();
  if (!store) return;
  try {
    const legacy = store.getItem(LEGACY_DATA_KEY);
    if (legacy && !store.getItem(dataKeyFor(accountId))) store.setItem(dataKeyFor(accountId), legacy);
    if (legacy) store.removeItem(LEGACY_DATA_KEY);
  } catch (error) {
    // Storage blocked: nothing to move.
  }
}

/** Whether the guest on this device has saved anything worth bringing into a new account. */
export function guestHasData() {
  const store = storage();
  if (!store) return false;
  try {
    const raw = store.getItem(dataKeyFor(GUEST_ID));
    if (!raw) return false;
    const data = JSON.parse(raw);
    return ['courses', 'tasks', 'assignments', 'sessions'].some((k) => Array.isArray(data[k]) && data[k].length > 0);
  } catch (error) {
    return false;
  }
}

function copyGuestData(accountId) {
  const store = storage();
  if (!store) return;
  try {
    const raw = store.getItem(dataKeyFor(GUEST_ID));
    if (raw) {
      store.setItem(dataKeyFor(accountId), raw);
      store.removeItem(dataKeyFor(GUEST_ID));
    }
  } catch (error) {
    // Ignore: the new account simply starts empty.
  }
}

export function AuthProvider({ children }) {
  const [accounts, setAccounts] = useLocalStorage(ACCOUNTS_KEY, []);
  const [session, setSession] = useLocalStorage(SESSION_KEY, null);

  const register = useCallback(
    async ({ name, email, password, bringGuestData }) => {
      const cleanEmail = normaliseEmail(email);
      if (accounts.some((a) => a.email === cleanEmail)) {
        return { field: 'email', error: 'An account already uses this email. Log in instead.' };
      }
      const account = {
        id: makeId('u'),
        name: name.trim(),
        email: cleanEmail,
        passwordHash: await hashPassword(cleanEmail, password),
        createdAt: new Date().toISOString(),
      };
      if (bringGuestData) copyGuestData(account.id);
      else claimLegacyData(account.id);
      setAccounts((list) => [...list, account]);
      setSession({ kind: 'account', accountId: account.id });
      return { ok: true };
    },
    [accounts, setAccounts, setSession]
  );

  const login = useCallback(
    async ({ email, password }) => {
      const cleanEmail = normaliseEmail(email);
      const account = accounts.find((a) => a.email === cleanEmail);
      if (!account) return { field: 'email', error: 'No account uses this email. Check it, or create an account.' };
      if (account.passwordHash !== (await hashPassword(cleanEmail, password))) {
        return { field: 'password', error: 'That password does not match this account.' };
      }
      claimLegacyData(account.id);
      setSession({ kind: 'account', accountId: account.id });
      return { ok: true };
    },
    [accounts, setSession]
  );

  const continueAsGuest = useCallback(
    (name) => {
      claimLegacyData(GUEST_ID);
      setSession({ kind: 'guest', name: name.trim() || 'Guest' });
    },
    [setSession]
  );

  // Where to send someone right after they sign out (for example straight to "Create account").
  // Kept in memory only; the signed-out redirect reads it so there is exactly one navigation.
  const [exitTo, setExitTo] = useState(null);
  const logout = useCallback(
    (to = '/welcome') => {
      setExitTo(to);
      setSession(null);
    },
    [setSession]
  );

  const current = useMemo(() => {
    if (!session) return null;
    if (session.kind === 'guest') return { id: GUEST_ID, name: session.name || 'Guest', isGuest: true };
    const account = accounts.find((a) => a.id === session.accountId);
    return account ? { id: account.id, name: account.name, email: account.email, isGuest: false } : null;
  }, [session, accounts]);

  const value = useMemo(
    () => ({ current, exitTo, register, login, continueAsGuest, logout }),
    [current, exitTo, register, login, continueAsGuest, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
