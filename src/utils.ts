import { storage } from 'webextension-polyfill';

export interface StorageLike<T = unknown> {
  getItem(key: string): Promise<T>;
  setItem(key: string, value: T): Promise<void>;
  // remove(key: string): Promisable<void>;
  // clear(): Promisable<void>;
  // addListener(key: string, listener: (newValue: T) => void): void;
  // removeListener(key: string, listener: (newValue: T) => void): void;
}

export function createBrowserStorage<T = unknown>(
  storageType: 'local' | 'sync' | 'managed',
): StorageLike<T> {
  const storageArea = storage[storageType];
  return {
    async getItem(key) {
      const values = await storageArea.get(key);
      return values[key];
    },
    async setItem(key, value) {
      await storageArea.set({ [key]: value });
    },
    // addListener(key, listener) {
    //   storage.onChanged.addListener((changes, areaName) => {
    //     if (areaName !== storageType || !Object.hasOwn(changes, key)) {
    //       return;
    //     }

    //     listener(changes[key].newValue);
    //   });
    // },
    // removeListener(key, listener) {
    //   storage.onChanged.removeListener(listener);
    // }
  };
}
