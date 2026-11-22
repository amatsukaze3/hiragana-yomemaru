// テスト台を node 用に まとめる：node build.mjs run（または dump）→ node /tmp/judge_<名前>.mjs
import { build } from '../../source/node_modules/esbuild/lib/main.js'
import { fileURLToPath } from 'node:url'
const here = fileURLToPath(new URL('.', import.meta.url))
const name = process.argv[2] ?? 'run'
await build({
  entryPoints: [here + name + '.ts'], bundle: true, platform: 'node', format: 'esm', outfile: `/tmp/judge_${name}.mjs`, logLevel: 'error',
  loader: { '.webp': 'empty', '.mp3': 'empty' }, define: { 'import.meta.env': '{}' },
  plugins: [{ name: 'stub', setup(b) { b.onResolve({ filter: /^\.\/audio$/ }, () => ({ path: here + 'audio_stub.ts' })) } }],
})
