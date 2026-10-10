import AsyncStorage from '@react-native-async-storage/async-storage';

/** Every persisted key lives here so nothing collides or gets forgotten. */
export const STORAGE_KEYS = {
  guestId: 'voyagr_guest_id',
} as const;

type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export const storage = {
  get: (key: StorageKey) => AsyncStorage.getItem(key),
  set: (key: StorageKey, value: string) => AsyncStorage.setItem(key, value),
  remove: (key: StorageKey) => AsyncStorage.removeItem(key),
};
