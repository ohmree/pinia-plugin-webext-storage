import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'pinia-plugin-persistedstate',
  description: '🍍 Configurable persistence and rehydration of Pinia stores.',

  themeConfig: {
    repo: 'prazdevs/pinia-plugin-persistedstate',
    docsDir: 'docs',
    lastUpdated: 'Last updated',

    nav: [
      {
        text: 'Release Notes',
        link: 'https://github.com/prazdevs/pinia-plugin-persistedstate/releases'
      }
    ]
  }
})
