# ひらがなよめ丸

幼児〜小学校低学年向けの、ひらがな（あ行〜わ行・46文字）の学習アプリです。ホーム画面で行をえらんで使います。

- ① おぼえる（5つのステップ）
- ② チャレンジ おんどく（10問タイムアタック・マイク判定）
- おまけ：よめ丸シューティング（46文字ぜんぶ「よめたよ」になると ホームに出ます）
  - おちてくる ひらがなカードを 声で よんで GET。カードの絵の ことばを あつめると スタンプ（46こで コンプリート）
  - 単体の公開ページ：https://amatsukaze3.github.io/yomemaru-shooting/

公開ページ：https://amatsukaze3.github.io/hiragana-yomemaru/

- `index.html` … 公開用（1ファイルで動きます）
- `source/` … React 19 / TypeScript / Tailwind CSS のソース（`npm install` → `npm run build:single`）
  - シューティングは `source/src/shooting/`。単体版は `npm run build:single:shoot`（→ `dist-single-shoot/shooting.html` を yomemaru-shooting リポジトリの `index.html` に）
- `tools/shoot-voice/` … シューティングの ずんだもん音声の セリフと 生成スクリプト（VOICEVOX が うごいている状態で `python3 tools/shoot-voice/make_voices.py`。GitHub では `voice-gen` ブランチに push すると Actions で生成）

こえ：VOICEVOX:ずんだもん
