import merge from 'lodash.merge';
import { Ref, ref } from 'vue-demi';
import * as browser from 'webextension-polyfill';

import type { PiniaPlugin, PiniaPluginContext } from 'pinia';

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
    readonly $ready: Ref<boolean>;
  }
}

export function createWebextStorage(
  factoryOptions: PersistedStateFactoryOptions = {},
): PiniaPlugin {
  const plugin: PiniaPlugin = (context) => {
    const {
      options: { persist },
      store,
    } = context;

    if (!persist) {
      return {};
    }

    const $ready = ref(false);

    const {
      storageType = factoryOptions.storageType ?? 'local',
      beforeRestore = factoryOptions.beforeRestore ?? null,
      afterRestore = factoryOptions.afterRestore ?? null,
      key = store.$id,
    } = typeof persist != 'boolean' ? persist : {};

    const storage = createBrowserStorage(storageType);
    beforeRestore?.(context);

    (async () => {
      try {
        const fromStorage = await storage.getItem(key);
        if (fromStorage != null) {
          store.$patch(fromStorage);
        }
        $ready.value = true;
        afterRestore?.(context);
      } catch (_error) {}
    })();

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

    const $save = async () => {
      try {
        const toStore = JSON.parse(JSON.stringify(store.$state));
        merge(toStore, await storage.getItem(key));
        browser.storage.onChanged.removeListener(onChanged);
        // HACK: we might want to find a better way of deeply unwrapping a reactive object.
        await storage.setItem(key, toStore);
        browser.storage.onChanged.addListener(onChanged);
      } catch (_error) {}
    };

    const $dispose = () => {
      browser.storage.onChanged.removeListener(onChanged);
      store.$dispose();
    };
    return { $save, $dispose, $ready };
  };
  return plugin;
}

export default createWebextStorage();
