# ローマ字フローラちゃん

ひらがなが よめる子が、ローマ字（a〜n の 46もじ）を よめるように なる 音読支援アプリです。「カタカナはなちゃん」の ソースを もとに しています。

## うごかしかた
```
npm install
npm run dev          # 開発サーバー（スマホからは https が必要：マイク利用のため）
npm run build:single # dist-single/index.html の 1 ファイル版 → リポジトリの romaji/index.html に置く
npm run build:single:shoot # dist-single-shoot/shooting.html（シューティングだけ）→ リポジトリの romaji/shooting/index.html に置く
```

## はなちゃんとの ちがい
- アプリの 中の 文字の キーは はなちゃんと おなじ カタカナ（音声判定・きろく・1もじの こえを そのまま つかうため）。画面には ローマ字を だす（`src/lib/romaji.ts`）
- つづり方：はじめは 令和7年 内閣告示「ローマ字のつづり方」（ヘボン式が もと：shi・chi・tsu・fu）。カード とうろく 画面で 訓令式（si・ti・tu・hu）・りょうほう に かえられる
  - のばす音は かなの とおりに 母音字を ならべる（koori・soujiki）。カタカナの「ー」だけ ¯（herikoputā）
  - 「を」は 1もじの カードでは wo、ことばの 中では o
- 文字：Andika（よみかきを ならう 子むけ。a が 手書きと おなじ 形）。`@fontsource/andika` を 1ファイルに うめこむ
- 「もじ だけ」の カード と なぞり書きは 英語の 4本線（3本目が 赤）。書きはじめは 文字ごと（`src/lib/fourLines.ts` の LETTER_STROKES）で、ka なら k → a の じゅん
- カード絵：ひらがなよめ丸の 線画（かめ・きつね …）。絵の 下に ことばの ローマ字（kame かめ）
- ステップ1は もじの あとに ことばも よむ（デイジーちゃんと おなじ）
- マスコット：フローラちゃん（イギリスから きた はなちゃんの 親友。`src/assets/flora.webp`）。色は むらさき
- 端末に保存する きろくは `flora:` で始まるキー。カード画像も `flora:card:ア`

## こえ
- `romaji/tools/voice/`（VOICEVOX:小夜/SAYO ／ じゃままるくんは VOICEVOX:黒沢冴白）。`romaji-voice-gen` ブランチに push すると Actions が つくる
- ぜんぶ つくりなおすと `src/data/voiceCredit.json` も かわり、ホーム画面と シューティングの クレジット表記が 自動で かわる（`romaji/terms.html` の 下の 表記は 手で なおす）

## クレジット
VOICEVOX の 表記が 必要です（ホーム画面とシューティングのメニューに表示しています）。消さないでください。
