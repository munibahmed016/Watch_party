import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  accessToken: 'wp.accessToken',
  refreshToken: 'wp.refreshToken',
  user: 'wp.user',
} as const;

export type StoredUser = {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  isVerified: boolean;
  phoneNumber: string | null;
};

export const tokenStorage = {
  getAccessToken: () => AsyncStorage.getItem(KEYS.accessToken),
  getRefreshToken: () => AsyncStorage.getItem(KEYS.refreshToken),
  setTokens: (a: string, r: string) =>
    AsyncStorage.multiSet([[KEYS.accessToken, a], [KEYS.refreshToken, r]]),
  clear: () =>
    AsyncStorage.multiRemove([KEYS.accessToken, KEYS.refreshToken, KEYS.user]),
};

export const userStorage = {
  async get(): Promise<StoredUser | null> {
    const raw = await AsyncStorage.getItem(KEYS.user);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredUser;
    } catch {
      return null;
    }
  },
  set: (user: StoredUser) => AsyncStorage.setItem(KEYS.user, JSON.stringify(user)),
  clear: () => AsyncStorage.removeItem(KEYS.user),
};
