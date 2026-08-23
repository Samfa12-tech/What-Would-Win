import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

function minifyStructuredDataAssets(): Plugin {
  return {
    name: 'minify-structured-data-assets',
    generateBundle(_options, bundle) {
      for (const item of Object.values(bundle)) {
        if (item.type !== 'asset' || !/^assets\/(?:creatures|complex-profile-overrides)-.+\.json$/.test(item.fileName)) continue
        const source = typeof item.source === 'string' ? item.source : new TextDecoder().decode(item.source)
        item.source = JSON.stringify(JSON.parse(source))
      }
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), minifyStructuredDataAssets()],
  build: {
    manifest: true,
    chunkSizeWarningLimit: 950,
  },
  test: {
    environment: 'node',
    include: ['src/test/**/*.test.ts'],
  },
})
