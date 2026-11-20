# ひらがなデイジーちゃん（Hiragana Daisy）

英語だけを話す子が、ひらがな（あ行〜わ行・46文字）を読めるようになるための音読支援アプリです。
「ひらがなよめ丸」「カタカナはなちゃん」と同じしくみで動きます（このソースは カタカナはなちゃん を もとにした 別コピー）。

## うごかしかた
```
npm install
npm run dev          # 開発サーバー（スマホからは https が必要：マイク利用のため）
npm run build:single # dist-single/index.html の 1 ファイル版 → リポジトリの daisy/index.html に置く
npm run build:single:shoot # dist-single-shoot/shooting.html（シューティングだけ）→ リポジトリの daisy/shooting/index.html に置く
```

## ほかの アプリとの ちがい
- 画面のことば：子どもが見るところは英語。先生用（Settings の中・せんせいヘルプの暗証番号・まちがいログ・アセスメントの記録表）は日本語のまま
- 文字：ひらがな 46文字。カードの絵は カタカナはなちゃん と同じ（外来語なので 英語圏の子にも わかりやすい）。カードの下に「あいす ice cream」のように ひらがなと英語を出す
- 書き順の書きはじめ：ひらがなよめ丸の値（あ行だけ 字形の外枠に あわせて なおした）
- 「おぼえる」ステップ1：もじの あとに 絵の ことば（「あ … アイス」）も よむ
- こえ：VOICEVOX:四国めたん（ノーマル）。セリフは カタカナで書いた 英語（「グッジョブ！」など）、ひらがな・ことばは日本語の よみ（`daisy/tools/voice/`）。じゃままるくんは VOICEVOX:黒沢冴白
- マスコット：デイジーちゃん（よめまるくんの ガールフレンド。`src/assets/daisy.webp`）。色は ピンク
- 端末に保存する きろくは `daisy:` で始まるキー。カード画像は `daisy:card:あ`（ひらがなよめ丸の カードとは まざりません）。登録したフォントは共通

## 声を つくりなおす
- VOICEVOX エンジンが うごいている所で `python3 daisy/tools/voice/make_voices.py`（`kana` / `lines` だけも可）
- GitHub では `daisy-voice-gen` ブランチに push すると Actions（`.github/workflows/daisy-voice.yml`）で つくって、そのブランチに コミットします

## クレジット
VOICEVOX:四国めたん／VOICEVOX:黒沢冴白 の表記が必要です（ホーム画面とシューティングのメニューに表示しています）。消さないでください。
