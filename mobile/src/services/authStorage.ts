import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Updated keys for Learnova rebrand with migration support
const ACCESS_TOKEN_KEY = 'learnova.access_token';
const REFRESH_TOKEN_KEY = 'learnova.refresh_token';
const LEGACY_ACCESS_TOKEN_KEY = 'nexora.access_token';
const LEGACY_REFRESH_TOKEN_KEY = 'nexora.refresh_token';

const getWebStorage = () => {
  if (Platform.OS !== 'web' || typeof globalThis.localStorage === 'undefined') return null;
  return globalThis.localStorage;
};

/**
 * Migrate legacy Nexora tokens to Learnova keys
 */
const migrateLegacyTokens = async () => {
  const storage = getWebStorage();
  
  if (storage) {
    // Web storage migration
    const legacyAccess = storage.getItem(LEGACY_ACCESS_TOKEN_KEY);
    const legacyRefresh = storage.getItem(LEGACY_REFRESH_TOKEN_KEY);
    
    if (legacyAccess) {
      storage.setItem(ACCESS_TOKEN_KEY, legacyAccess);
      storage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    }
    if (legacyRefresh) {
      storage.setItem(REFRESH_TOKEN_KEY, legacyRefresh);
      storage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
    }
  } else {
    // SecureStore migration
    try {
      const legacyAccess = await SecureStore.getItemAsync(LEGACY_ACCESS_TOKEN_KEY);
      const legacyRefresh = await SecureStore.getItemAsync(LEGACY_REFRESH_TOKEN_KEY);
      
      if (legacyAccess) {
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, legacyAccess);
        await SecureStore.deleteItemAsync(LEGACY_ACCESS_TOKEN_KEY);
      }
      if (legacyRefresh) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, legacyRefresh);
        await SecureStore.deleteItemAsync(LEGACY_REFRESH_TOKEN_KEY);
      }
    } catch (error) {
      // Migration failed, tokens will be lost - user will need to login again
      console.warn('Token migration failed:', error);
    }
  }
};

export const getAccessToken = async () => {
  // Attempt migration on first access
  await migrateLegacyTokens();
  
  const storage = getWebStorage();
  return storage
    ? Promise.resolve(storage.getItem(ACCESS_TOKEN_KEY))
    : SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
};

export const saveAccessToken = async (token: string) => {
  const storage = getWebStorage();
  if (storage) {
    storage.setItem(ACCESS_TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
};

export const clearAccessToken = async () => {
  const storage = getWebStorage();
  if (storage) {
    storage.removeItem(ACCESS_TOKEN_KEY);
    storage.removeItem(LEGACY_ACCESS_TOKEN_KEY); // Clean up legacy too
    return;
  }
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(LEGACY_ACCESS_TOKEN_KEY);
  } catch (error: unknown) {
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.removeItem(ACCESS_TOKEN_KEY);
      globalThis.localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
      return;
    }
    throw error;
  }
};

export const getRefreshToken = async () => {
  // Migration happens during getAccessToken call
  const storage = getWebStorage();
  return storage
    ? Promise.resolve(storage.getItem(REFRESH_TOKEN_KEY))
    : SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
};

export const saveRefreshToken = async (token: string) => {
  const storage = getWebStorage();
  if (storage) {
    storage.setItem(REFRESH_TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
};

export const clearRefreshToken = async () => {
  const storage = getWebStorage();
  if (storage) {
    storage.removeItem(REFRESH_TOKEN_KEY);
    storage.removeItem(LEGACY_REFRESH_TOKEN_KEY); // Clean up legacy too
    return;
  }
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  try {
    await SecureStore.deleteItemAsync(LEGACY_REFRESH_TOKEN_KEY);
  } catch {
    // Ignore if legacy doesn't exist
  }
};

export const saveAuthTokens = async (accessToken: string, refreshToken: string) => {
  await Promise.all([saveAccessToken(accessToken), saveRefreshToken(refreshToken)]);
};

export const clearAuthTokens = async () => {
  await Promise.all([clearAccessToken(), clearRefreshToken()]);
};
