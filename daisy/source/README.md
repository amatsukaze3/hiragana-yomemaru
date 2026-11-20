# カタカナはなちゃん

カタカナ（ア行〜ワ行・46文字）が読めない子の、音読支援アプリです。「ひらがなよめ丸」と同じしくみで動きます。

## うごかしかた
```
npm install
npm run dev          # 開発サーバー（スマホからは https が必要：マイク利用のため）
npm run build:single # dist-single/index.html の 1 ファイル版 → リポジトリの katakana/index.html に置く
npm run build:single:shoot # dist-single-shoot/shooting.html（シューティングだけ）→ リポジトリの katakana/shooting/index.html に置く
```

## ひらがなよめ丸との ちがい
- 文字・絵・画数・書きはじめ：`src/data/kana.ts`（`katakana/tools/cards/gen_kana_ts.py` で作成）
- カード絵：`src/assets/cards/`（いただいたPDFのカードから、黒い文字を消した線画。文字はアプリが重ねる）
- こえ：VOICEVOX:東北ずん子（`katakana/tools/voice/make_voices.py`）。じゃままるくんは VOICEVOX:黒沢冴白
- マスコット：はなちゃん（`src/assets/hanachan.webp`）
- 端末に保存する きろくは `hanachan:` で始まるキー（ひらがなよめ丸の きろくとは まざりません）
- 登録したフォント（UDデジタル教科書体 NK-B）は、ひらがなよめ丸と共通です（同じ IndexedDB）

## クレジット
VOICEVOX:東北ずん子／VOICEVOX:黒沢冴白 の表記が必要です（ホーム画面とシューティングのメニューに表示しています）。消さないでください。
