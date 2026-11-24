# ローマ字フローラちゃん おおもじ

ローマ字の 大文字（A〜N の 46もじ：A I U E O / KA KI KU KE KO …）を よめるように なる 音読支援アプリです。
すこし お姉さんに なった フローラちゃん（めがね・せいふく）が おしえて くれます。
「ローマ字フローラちゃん」（`romaji/`。小文字）の ソースを そのまま コピーして、表示を 大文字に しています（判定・きろく・声の しくみは おなじ）。

## うごかしかた
```
npm install
npm run dev          # 開発サーバー（スマホからは https が必要：マイク利用のため）
npm run build:single # dist-single/index.html の 1 ファイル版 → リポジトリの romaji-oomoji/index.html に置く
npm run build:single:shoot # dist-single-shoot/shooting.html（シューティングだけ）→ リポジトリの romaji-oomoji/shooting/index.html に置く
```

## ローマ字フローラちゃん（小文字）との ちがい
- 画面に だす ローマ字は ぜんぶ 大文字（`src/lib/romaji.ts` の up。中の つくりかたは 小文字の まま、さいごに 大文字に する）
  - KA・SHI・CHI・TSU・FU・N、ことばは KAMERA・KĒKI・SANDOICCHI・PAN O TABERU
  - つづり方の きりかえ（あたらしい ローマ字／訓令式／りょうほう）は そのまま（SI・TI・TU・HU）
- カード絵：カタカナはなちゃん・ひらがなデイジーちゃんと おなじ 線画（アイス・インコ・ウクレレ …）。絵の 中に 大文字、下に「KAMERA カメラ」
  - ことばは `src/data/kana.ts` の word（ひらがな。ローマ字に する もと）と kana（カードの 下に だす ふつうの 書きかた）
  - を の カードは「パンを たべる」（PAN O TABERU。カードの 文字は WO）
  - 大文字は 2〜3もじ ならぶので、絵の 線と かさなっても よめるように 文字に 白い ふち
- 文字：Andika の 大文字の I を セリフ（上下の よこぼう）の ない 1本の たて線に した AndikaRoma（`src/assets/fonts/`。`romaji-oomoji/tools/font/mkfont.py` で つくる）。のばす 音の Ā Ē Ī Ō Ū も ふくむ
- 4本線：① の 線を 大文字の 高さに した（大文字が ① 〜 ③ に ちょうど おさまる）
- なぞり書き：大文字の 書きじゅん（`src/lib/fourLines.ts` の LETTER_STROKES）
  - A 3画・E 4画・F 3画・H 3画・K 3画・M 4画・N 3画・R 2画・T 2画・Y 3画、I・U・O・S・C・W は 1画
  - 画数が 6を こえる（ME は 8画）ので、①〜⑩ まで。6画より おおい ときは バッジを ちいさく
- マスコット：すこし お姉さんに なった フローラちゃん（`src/assets/flora.webp`。いただいた 絵から 切りぬき）。色は あお（紺の せいふくに あわせて）
- 端末に保存する きろくは `flora2:` で始まるキー（小文字の フローラちゃんの `flora:` とは まざらない）。カード画像は `flora2:card:ア`

## こえ
- 1もじの 声・セリフは フローラちゃん（小文字）と おなじ（VOICEVOX:小夜/SAYO ／ じゃままるくんは VOICEVOX:黒沢冴白）
- カードの ことば（w_・s_：「アイス」「アイスの スタンプ、ゲット！」）だけ あたらしく つくった。ことばを かえる ときは `romaji-oomoji/tools/voice/lines.json` を なおして `romaji-oomoji-voice-gen` ブランチに push すると、Actions（`.github/workflows/romaji-oomoji-voice.yml`）が `ONLY='w_*,s_*'` で つくって その ブランチに コミットする → `src/assets/voice/shoot/` の w_・s_ を とりこんで build

## クレジット
VOICEVOX の 表記が 必要です（ホーム画面とシューティングのメニューに表示しています）。消さないでください。
