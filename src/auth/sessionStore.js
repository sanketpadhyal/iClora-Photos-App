import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SESSION_KEY = 'iclora.auth.session.v1';
const PERMISSIONS_KEY = 'iclora.permissions.accepted.v2';
const CONFIRMED_KEY = 'iclora.account.confirmed.v1';
const PROFILE_CACHE_KEY = 'iclora.profile.cache.v1';
const PROTOCOL_ACCEPTED_KEY = 'iclora.protocol.accepted.v1';

let memorySession = null;
let memoryPermissions = false;
let memoryConfirmed = false;
let memoryProfileCache = null;
let memoryProtocolAccepted = false;

function getWebStorage() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  return window.localStorage;
}

function shouldUseSecureStore() {
  return Platform.OS !== 'web';
}

export async function saveAuthSession(session) {
  const value = JSON.stringify({
    ok: true,
    uid: session?.uid || '',
    email: session?.email || '',
    name: session?.name || '',
    sessionToken: session?.sessionToken || '',
    sessionExpiresAt: session?.sessionExpiresAt || 0,
    savedAt: Date.now(),
  });

  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem(SESSION_KEY, value);
    return;
  }
  if (shouldUseSecureStore()) {
    memorySession = value;
    await SecureStore.setItemAsync(SESSION_KEY, value);
    return;
  }
  memorySession = value;
}

export async function readAuthSession() {
  const webStorage = getWebStorage();
  let value = webStorage ? webStorage.getItem(SESSION_KEY) : memorySession;
  if (!value && shouldUseSecureStore()) {
    value = await SecureStore.getItemAsync(SESSION_KEY);
    memorySession = value;
  }
  if (!value) return null;

  try {
    const session = JSON.parse(value);
    if (!session?.ok || !session?.sessionToken) return null;
    if (session.sessionExpiresAt && session.sessionExpiresAt <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function savePermissionsAccepted() {
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem(PERMISSIONS_KEY, 'true');
    return;
  }
  if (shouldUseSecureStore()) {
    memoryPermissions = true;
    await SecureStore.setItemAsync(PERMISSIONS_KEY, 'true');
    return;
  }
  memoryPermissions = true;
}

export async function readPermissionsAccepted() {
  const webStorage = getWebStorage();
  if (webStorage) {
    const value = webStorage.getItem(PERMISSIONS_KEY);
    return value === 'true';
  }
  if (shouldUseSecureStore()) {
    const value = await SecureStore.getItemAsync(PERMISSIONS_KEY);
    memoryPermissions = value === 'true';
    return memoryPermissions;
  }
  return memoryPermissions;
}

export async function saveAccountConfirmed() {
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem(CONFIRMED_KEY, 'true');
    return;
  }
  if (shouldUseSecureStore()) {
    memoryConfirmed = true;
    await SecureStore.setItemAsync(CONFIRMED_KEY, 'true');
    return;
  }
  memoryConfirmed = true;
}

export async function readAccountConfirmed() {
  const webStorage = getWebStorage();
  if (webStorage) {
    const value = webStorage.getItem(CONFIRMED_KEY);
    return value === 'true';
  }
  if (shouldUseSecureStore()) {
    const value = await SecureStore.getItemAsync(CONFIRMED_KEY);
    memoryConfirmed = value === 'true';
    return memoryConfirmed;
  }
  return memoryConfirmed;
}

export async function saveProtocolAccepted() {
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem(PROTOCOL_ACCEPTED_KEY, 'true');
    return;
  }
  if (shouldUseSecureStore()) {
    memoryProtocolAccepted = true;
    await SecureStore.setItemAsync(PROTOCOL_ACCEPTED_KEY, 'true');
    return;
  }
  memoryProtocolAccepted = true;
}

export async function readProtocolAccepted() {
  const webStorage = getWebStorage();
  if (webStorage) {
    const value = webStorage.getItem(PROTOCOL_ACCEPTED_KEY);
    return value === 'true';
  }
  if (shouldUseSecureStore()) {
    const value = await SecureStore.getItemAsync(PROTOCOL_ACCEPTED_KEY);
    memoryProtocolAccepted = value === 'true';
    return memoryProtocolAccepted;
  }
  return memoryProtocolAccepted;
}

export async function saveCachedProfile(profile) {
  memoryProfileCache = profile;
  const value = JSON.stringify(profile);
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem(PROFILE_CACHE_KEY, value);
    return;
  }
  if (shouldUseSecureStore()) {
    await SecureStore.setItemAsync(PROFILE_CACHE_KEY, value);
    return;
  }
}

export async function readCachedProfile() {
  if (memoryProfileCache) return memoryProfileCache;
  const webStorage = getWebStorage();
  const value = webStorage ? webStorage.getItem(PROFILE_CACHE_KEY) : null;
  if (!value && shouldUseSecureStore()) {
    try {
      const stored = await SecureStore.getItemAsync(PROFILE_CACHE_KEY);
      if (stored) {
        memoryProfileCache = JSON.parse(stored);
        return memoryProfileCache;
      }
      return null;
    } catch {
      return null;
    }
  }
  if (value) {
    try {
      memoryProfileCache = JSON.parse(value);
      return memoryProfileCache;
    } catch {
      return null;
    }
  }
  return null;
}

export async function clearAuthSession() {
  memorySession = null;
  memoryPermissions = false;
  memoryConfirmed = false;
  memoryProfileCache = null;
  memoryProtocolAccepted = false;

  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.removeItem(SESSION_KEY);
    webStorage.removeItem(PERMISSIONS_KEY);
    webStorage.removeItem(CONFIRMED_KEY);
    webStorage.removeItem(PROFILE_CACHE_KEY);
    webStorage.removeItem(PROTOCOL_ACCEPTED_KEY);
    return;
  }
  if (shouldUseSecureStore()) {
    await SecureStore.deleteItemAsync(SESSION_KEY);
    await SecureStore.deleteItemAsync(PERMISSIONS_KEY);
    await SecureStore.deleteItemAsync(CONFIRMED_KEY);
    await SecureStore.deleteItemAsync(PROFILE_CACHE_KEY);
    await SecureStore.deleteItemAsync(PROTOCOL_ACCEPTED_KEY);
  }
}

export async function savePendingSelections(selections) {
  const value = JSON.stringify(selections || []);
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem('iclora.pending.selections.v1', value);
    return;
  }
  if (shouldUseSecureStore()) {
    await SecureStore.setItemAsync('iclora.pending.selections.v1', value);
  }
}

export async function readPendingSelections() {
  const webStorage = getWebStorage();
  const value = webStorage ? webStorage.getItem('iclora.pending.selections.v1') : null;
  if (!value && shouldUseSecureStore()) {
    try {
      const stored = await SecureStore.getItemAsync('iclora.pending.selections.v1');
      if (stored) return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  if (value) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}

export async function clearPendingSelections() {
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.removeItem('iclora.pending.selections.v1');
    return;
  }
  if (shouldUseSecureStore()) {
    await SecureStore.deleteItemAsync('iclora.pending.selections.v1');
  }
}

export async function saveOngoingUpload(uploadState) {
  const value = JSON.stringify(uploadState || null);
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem('iclora.ongoing.upload.v1', value);
    return;
  }
  if (shouldUseSecureStore()) {
    await SecureStore.setItemAsync('iclora.ongoing.upload.v1', value);
  }
}

export async function readOngoingUpload() {
  const webStorage = getWebStorage();
  const value = webStorage ? webStorage.getItem('iclora.ongoing.upload.v1') : null;
  if (!value && shouldUseSecureStore()) {
    try {
      const stored = await SecureStore.getItemAsync('iclora.ongoing.upload.v1');
      if (stored) return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  if (value) {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
}

export async function clearOngoingUpload() {
  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.removeItem('iclora.ongoing.upload.v1');
    return;
  }
  if (shouldUseSecureStore()) {
    await SecureStore.deleteItemAsync('iclora.ongoing.upload.v1');
  }
}

