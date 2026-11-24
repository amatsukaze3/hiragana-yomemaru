// テスト台を node 用に まとめる：node shared/judge/test/build.mjs run（または ios_mock・ios_switch・vt・dump）→ node /tmp/judge_<名前>.mjs
// esbuild は どれかの アプリの node_modules の ものを つかう（romaji/source で npm install して おく）
import { build } from '../../../romaji/source/node_modules/esbuild/lib/main.js'
import { fileURLToPath } from 'node:url'
const here = fileURLToPath(new URL('.', import.meta.url))
const name = process.argv[2] ?? 'run'
await build({
  entryPoints: [here + name + '.ts'], bundle: true, platform: 'node', format: 'esm', outfile: `/tmp/judge_${name}.mjs`, logLevel: 'error',
  loader: { '.webp': 'empty', '.mp3': 'empty' }, define: { 'import.meta.env': '{}' },
})
