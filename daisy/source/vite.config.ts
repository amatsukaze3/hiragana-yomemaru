import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build:single`        … ひらがなデイジーちゃん（dist-single/index.html → リポジトリの daisy/index.html）
// `npm run build:single:shoot`  … デイジーちゃんシューティング だけの ページ（dist-single-shoot/shooting.html → リポジトリの daisy/shooting/index.html）
const single = process.env.SINGLE === '1'
const app = process.env.APP === 'shoot' ? 'shoot' : 'main'

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(single ? [viteSingleFile()] : [])],
  build: {
    assetsInlineLimit: single ? 100_000_000 : 4096,
    outDir: single ? (app === 'shoot' ? 'dist-single-shoot' : 'dist-single') : 'dist',
    rollupOptions: {
      input: single
        ? resolve(__dirname, app === 'shoot' ? 'shooting.html' : 'index.html')
        : { main: resolve(__dirname, 'index.html'), shooting: resolve(__dirname, 'shooting.html') },
    },
  },
})
