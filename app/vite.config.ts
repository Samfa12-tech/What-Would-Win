import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

function minifyCreatureRoster(): Plugin {
  return {
    name: 'minify-creature-roster',
    generateBundle(_options, bundle) {
      for (const item of Object.values(bundle)) {
        if (item.type !== 'asset' || !item.fileName.startsWith('assets/creatures-') || !item.fileName.endsWith('.json')) continue
        const source = typeof item.source === 'string' ? item.source : new TextDecoder().decode(item.source)
        item.source = JSON.stringify(JSON.parse(source))
      }
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), minifyCreatureRoster()],
  build: {
    manifest: true,
    chunkSizeWarningLimit: 950,
  },
  test: {
    environment: 'node',
    include: ['src/test/**/*.test.ts'],
  },
})
