import * as browser from 'webextension-polyfill';

import type { PiniaPluginContext, StateTree } from 'pinia';

import pick from './pick';
import { createBrowserStorage } from './utils';

export interface PersistedStateOptions {
  /**
   * Storage key to use.
   * @default $store.id
   */
  key?: string;

  /**
   * Where to store persisted state.
   * @default 'local'
   */
  storageType?: 'local' | 'sync' | 'managed';

  /**
   * Dot-notation paths to partially save state.
   * @default undefined
   */
  paths?: Array<string>;

  /**
   * Hook called before state is hydrated from storage.
   * @default undefined
   */
  beforeRestore?: (context: PiniaPluginContext) => void;

  /**
   * Hook called after state is hydrated from storage.
   * @default undefined
   */
  afterRestore?: (context: PiniaPluginContext) => void;
}

export type PersistedStateFactoryOptions = Pick<
  PersistedStateOptions,
  'storageType' | 'afterRestore' | 'beforeRestore'
>;

declare module 'pinia' {
  export interface DefineStoreOptionsBase<S extends StateTree, Store> {
    /**
     * Persist store in storage.
     * @docs https://github.com/ohmree/pinia-plugin-webext-storage.
     */
    persist?: boolean | PersistedStateOptions;
  }

  export interface PiniaCustomProperties {
    /**
     * Save the store to `browser.storage`.
     * NOTE: this is the only way to perform Pinia -> `browser.storage` sync.
     * Syncing in the other direction is performed automatically.
     */
    $save(): Promise<void>;
  }
}

export function createWebextStorage(
  factoryOptions: PersistedStateFactoryOptions = {},
) {
  return async function (context: PiniaPluginContext): Promise<void> {
    const {
      options: { persist },
      store,
    } = context;

    if (!persist) {
      return;
    }

    const {
      storageType = factoryOptions.storageType ?? 'local',
      beforeRestore = factoryOptions.beforeRestore ?? null,
      afterRestore = factoryOptions.afterRestore ?? null,
      key = store.$id,
      paths = null,
    } = typeof persist != 'boolean' ? persist : {};

    const storage = createBrowserStorage(storageType);
    beforeRestore?.(context);

    try {
      const fromStorage = await storage.getItem(key);
      if (fromStorage != null) {
        store.$patch(fromStorage);
      }
    } catch (_error) {}

    afterRestore?.(context);
    function onChanged(
      changes: Record<string, browser.Storage.StorageChange>,
      areaName: string,
    ) {
      if (areaName !== storageType || !Object.hasOwn(changes, key)) {
        return;
      }

      store.$patch(changes[key].newValue);
    }
    browser.storage.onChanged.addListener(onChanged);

    store.$save = async () => {
      try {
        const toStore = Array.isArray(paths)
          ? pick(store.$state, paths)
          : store.$state;
        browser.storage.onChanged.removeListener(onChanged);
        // HACK: we might want to find a better way of deeply unwrapping a reactive object.
        await storage.setItem(key, JSON.parse(JSON.stringify(toStore)));
        browser.storage.onChanged.addListener(onChanged);
      } catch (_error) {}
    };

    const originalDispose = store.$dispose;
    store.$dispose = () => {
      browser.storage.onChanged.removeListener(onChanged);
      originalDispose();
    };
  };
}

export default createWebextStorage();
