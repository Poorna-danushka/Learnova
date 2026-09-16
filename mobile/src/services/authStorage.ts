import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'nexora.access_token';
const REFRESH_TOKEN_KEY = 'nexora.refresh_token';

const getWebStorage = () => {
  if (Platform.OS !== 'web' || typeof globalThis.localStorage === 'undefined') return null;
  return globalThis.localStorage;
};

export const getAccessToken = () => {
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
    return;
  }
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  } catch (error: unknown) {
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.removeItem(ACCESS_TOKEN_KEY);
      return;
    }
    throw error;
  }
};

export const getRefreshToken = () => {
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
    return;
  }
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
};

export const saveAuthTokens = async (accessToken: string, refreshToken: string) => {
  await Promise.all([saveAccessToken(accessToken), saveRefreshToken(refreshToken)]);
};

export const clearAuthTokens = async () => {
  await Promise.all([clearAccessToken(), clearRefreshToken()]);
};
