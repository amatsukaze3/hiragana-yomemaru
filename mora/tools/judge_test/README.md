# スペシャルモーラ 判定テスト台

1つの 音の カードの 周波数解析（iPhone・iPad で こえの とうろく が ある とき。`source/src/lib/voice.ts` の acousticMatches、
にごりは `voicing.ts`）を、VOICEVOX の 声で しらべる。

## 音
- 濁音・半濁音・拗音：`mora-test-audio-gen` ブランチの `mora/tools/judge_test/audio/`（Actions の mora-test-audio が `make_test_audio.py` で つくる。14人 × ふつう(n)・こどもふう(k)）
- 清音・あいうえお：`judge-test-audio` ブランチの `romaji/tools/judge_test/audio/`
- どちらも 48kHz モノラル の f32（`ffmpeg -i x.flac -f f32le -ac 1 -ar 48000 f32/x.f32`）に して `f32/` に おく

## うごかしかた
```
cd mora/source && npm install && cd ../tools/judge_test
node build.mjs vv.ts && node vv.mjs
```

## 2026-11-24 の けっか（vv.ts、こえの とうろく が できた 20の 声、まわりの音 -50dB）
| | 合格 |
|---|---|
| 正しい が行 / ざ行 / だ行 / ば行 / ぱ行 | 59% / 83% / 58% / 60% / 88% |
| 正しい 拗音（にごらない）/ 拗音（にごる） | 91% / 61% |
| か→が / さ→ざ / た→だ / は→ば / ぱ→ば | 38% / 25% / 47% / 47% / 57% |
| きゃ→ぎゃ / しゃ→じゃ / ぴゃ→びゃ | 15% / 15% / 30% |
| 母音だけ→が行 / ちがう母音（が行・きゃ行） | 35% / 17%・32% |

- 破裂する 音（が・だ・ば行）の にごりの さかいは、iPad で 合格しなかった 女の子の「がぎぐげご」「かきくけこ」
  （声の 高さ 450〜500Hz、1音 0.1〜0.2びょう）に あわせた。その子の 音は 大きさ・まわりの音・タイミングを かえた
  15とおり すべてで が行・きゃ行 8こが 合格、か行 5こが 不合格。VOICEVOX の 声では ほとんど 見わけられない（上の表）。
  その子の 録音は 個人の 声なので リポジトリには 入れていない
