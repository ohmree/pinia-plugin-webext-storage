import * as browser from 'webextension-polyfill';

import type {
  PiniaPluginContext,
  StateTree,
  SubscriptionCallbackMutation,
} from 'pinia';

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
      if (fromStorage) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        store.$patch(fromStorage as any);
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

    store.$subscribe(
      async (
        _mutation: SubscriptionCallbackMutation<StateTree>,
        state: StateTree,
      ) => {
        try {
          const toStore = Array.isArray(paths) ? pick(state, paths) : state;
          browser.storage.onChanged.removeListener(onChanged);
          await storage.setItem(key, { ...toStore });
          browser.storage.onChanged.addListener(onChanged);
        } catch (_error) {}
      },
      { detached: true },
    );
    const originalDispose = store.$dispose;
    store.$dispose = () => {
      browser.storage.onChanged.removeListener(onChanged);
      originalDispose();
    };
  };
}

export default createWebextStorage();
