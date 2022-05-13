<p align="center">
  <img alt="" src="https://i.imgur.com/prUNzrf.png">
</p>

<p align="center">
  <i>Artwork from <a href="https://pinia.vuejs.org/">Pinia</a></i>
</p>

<h1 align="center">pinia-plugin-webext-storage</h1>
<p align="center">Persistence and rehydration of Pinia stores, backed by `browser.storage`.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/pinia-plugin-webext-storage"><img alt="npm" src="https://img.shields.io/github/package-json/v/ohmree/pinia-plugin-webext-storage?style=flat&color=orange" /></a>
  <a href="https://github.com/ohmree/pinia-plugin-webext-storage/tree/HEAD/LICENSE.md"><img alt="License" src="https://img.shields.io/github/license/ohmree/pinia-plugin-webext-storage?style=flat&color=blue" /></a>
</p>

## ✨ Features

- Persist Pinia stores to the WebExtension storage.
- Configurable per Pinia store.
- Still compatible with Vue 2 and 3.
- No external dependencies apart from [`webextension-polyfill`](https://github.com/mozilla/webextension-polyfill) (only needed if you target non-mozilla browsers).
- A bit larger than the original [`pinia-plugin-persistedstate`](https://github.com/prazdevs/pinia-plugin-persistedstate/), but still super small (<1.5kB).

## ⚙️ Installing

1. Install with your favorite package manager:

   - **pnpm** : `pnpm i pinia-plugin-webext-storage`
   - npm : `npm i pinia-plugin-webext-storage`
   - yarn : `yarn add pinia-plugin-webext-storage`

2. Add the plugin to pinia:

```ts
import { createPinia } from 'pinia';
import piniaPluginWebextStorage from 'pinia-plugin-webext-storage';

const pinia = createPinia();
pinia.use(piniaPluginWebextStorage);
```

## 🚀 Usage

You just need to add the `persist` option to the store you want to be persisted as follows:

```ts
import { defineStore } from 'pinia';

//* using option store syntax
export const useStore = defineStore('main', {
  state: () => {
    return {
      someState: 'hello pinia',
    };
  },
  persist: true,
});

//* or using setup store syntax
export const useStore = defineStore(
  'main',
  () => {
    const someState = ref('hello pinia');
    return { someState };
  },
  {
    persist: true,
  },
);
```

In case you want to configure how the data should be persisted, `persist` can take options:

- `key: string` : Key to use in storage (defaults to the current store id).
- `storageType: 'local' | 'sync' | 'managed'` : The storage area to sync the store with (defaults to `'local'`)
- `paths: Array<string>` : Array of dot-notation paths to partially persist the state, `[]` means no state is persisted (defaults to `undefined` and persists the whole state).
- `beforeRestore: (context) => void` : Hook executed (if set) _before_ restoring the state from local storage.
- `afterRestore: (context) => void` : Hook executed (if set) _after_ restoring the state from local storage.

> The context passed to the hooks is the `PiniaPluginContext`. It exposes properties such as the current store. More infos [here](https://pinia.vuejs.org/core-concepts/plugins.html#introduction).

```ts
import { defineStore } from 'pinia';

export const useStore = defineStore('main', {
  state: () => {
    return {
      someState: 'hello pinia',
      nested: {
        data: 'nested pinia',
      },
    };
  },
  persist: {
    key: 'store-key',
    storageType: 'sync',
    paths: ['nested.data'],
    beforeRestore: (context) => {
      console.log('Before hydration...');
    },
    afterRestore: (context) => {
      console.log('After hydration...');
    },
  },
});
```

The config above will only persist the `nested.data` property in `browser.storage.sync` under `store-key`.

It will also execute the `beforeRestore` and `afterRestore` hooks respectively _before_ and _after_ hydration.

## 🔧 Factory function configuration

Need to override default options? You can import and use `createWebextStorage(options)`:

```ts
import { createPinia } from 'pinia';
import { createWebextStorage } from 'pinia-plugin-webext-storage;
const pinia = createPinia();
pinia.use(
  createWebextStorage({
    storageType: 'sync',
    beforeRestore: () => {},
    afterRestore: () => {},
  }),
);
```

The options passed will be used in any store declaring `persist: true`. You can still override these defaults with per-store options.

## ⚠️ Limitations

### **References do not persist**

Beware of the following:

```js
const a = {
  1: 'one',
  2: 'two',
  ...
}
const b = a

// Before hydration 'a' and 'b'
// point to the same object:
a === b -> true

// After hydration (page reload)
// 'a' and 'b' are different objects
// with the same content:
a === b -> false
```

As a consequence, reactivity between `a` and `b` is lost.

To get around this you can exclude either `a` or `b` from persisting and use the `afterRestore` hook to populate them after hydration. That way `a` and `b` have the same reference again and reactivity is restored after page reload.

### **Non primitive types are not persisted**

Due to serialization (`JSON.stringify`/`JSON.parse`) needed to persist in storage, non primitive typed data such as `Date` are no rehydrated as `Date` but as `string` instead.

To get around this you can use the `afterRestore` hook to reformat the data as needed.

## 📝 License

Copyright © 2022 [ohmree](https://github.com/ohmree).  
Copyright © 2022 [Sacha Bouillez](https://github.com/prazdevs).  
This project is under the [MIT](https://github.com/ohmree/pinia-plugin-webext-storage/blob/main/LICENSE.md) license.
