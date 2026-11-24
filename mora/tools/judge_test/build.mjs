// テスト台を node で うごく 1ファイルに する：node build.mjs vv.ts → vv.mjs
import { build } from '../../source/node_modules/esbuild/lib/main.js'
const entry = process.argv[2] ?? 'vv.ts'
await build({
  entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: entry.replace(/\.ts$/, '.mjs'), logLevel: 'error',
  loader: { '.webp': 'empty', '.mp3': 'empty', '.png': 'empty' },
  define: { 'import.meta.env': '{}', 'import.meta.glob': 'globalThis.__glob' }, banner: { js: 'globalThis.__glob = () => ({});' },
  plugins: [{ name: 'stub', setup(b) { b.onResolve({ filter: /^\.\/audio$/ }, () => ({ path: new URL('./audio_stub.ts', import.meta.url).pathname })) } }],
})
