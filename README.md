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

こえ：VOICEVOX:ずんだもん／VOICEVOX:黒沢冴白（ひらがなじゃままるくん）

## カタカナはなちゃん（`katakana/`）

ひらがなよめ丸と同じしくみで、カタカナ（ア行〜ワ行・46文字）を読めるようにするアプリです。

公開ページ：https://amatsukaze3.github.io/hiragana-yomemaru/katakana/

- `katakana/index.html` … 公開用（1ファイルで動きます）
- `katakana/shooting/index.html` … はなちゃんシューティング だけの ページ（https://amatsukaze3.github.io/hiragana-yomemaru/katakana/shooting/ 。`npm run build:single:shoot` → `dist-single-shoot/shooting.html` をここに）
- `katakana/source/` … ソース（`npm install` → `npm run build:single` → `dist-single/index.html` を `katakana/index.html` に）
- `katakana/tools/voice/` … こえ（VOICEVOX:東北ずん子、じゃままるくんは VOICEVOX:黒沢冴白）の セリフと 生成スクリプト
- `katakana/tools/cards/` … カード絵（いただいたPDFから文字を消した線画）の 作りかた
- 端末に保存するきろくは `hanachan:` で始まるキーなので、ひらがなよめ丸のきろくとは まざりません

こえ：VOICEVOX:東北ずん子／VOICEVOX:黒沢冴白（カタカナはなちゃん）

## ひらがなデイジーちゃん（`daisy/`）

英語だけを話す子むけの ひらがなアプリです（画面は英語、カードの絵は カタカナはなちゃん と同じ）。

公開ページ：https://amatsukaze3.github.io/hiragana-yomemaru/daisy/

- `daisy/index.html` … 公開用（1ファイルで動きます）
- `daisy/shooting/index.html` … デイジーちゃんシューティング だけの ページ（https://amatsukaze3.github.io/hiragana-yomemaru/daisy/shooting/）
- `daisy/source/` … ソース（`npm install` → `npm run build:single` → `dist-single/index.html` を `daisy/index.html` に）
- `daisy/tools/voice/` … こえ（VOICEVOX:四国めたん、じゃままるくんは VOICEVOX:黒沢冴白）の セリフと 生成スクリプト
- 端末に保存するきろくは `daisy:` で始まるキーなので、ほかの アプリの きろくとは まざりません

こえ：VOICEVOX:四国めたん／VOICEVOX:黒沢冴白（ひらがなデイジーちゃん）

## ローマ字フローラちゃん（`romaji/`）

ひらがなが よめる子が、ローマ字（a〜n の 46もじ）を よめるように なる アプリです。カタカナはなちゃん の しくみを そのまま つかい、画面に ローマ字を だします（音声判定は かなの 音で おこなう）。

公開ページ：https://amatsukaze3.github.io/hiragana-yomemaru/romaji/

- `romaji/index.html` … 公開用（1ファイルで動きます）
- `romaji/shooting/index.html` … フローラちゃんシューティング だけの ページ（`npm run build:single:shoot` → `dist-single-shoot/shooting.html` をここに）
- `romaji/source/` … ソース（`npm install` → `npm run build:single` → `dist-single/index.html` を `romaji/index.html` に）
  - つづり方は `src/lib/romaji.ts`（あたらしい ローマ字（令和7年 内閣告示）／訓令式／りょうほう。カード とうろく の 画面で えらべる）
  - 4本線と なぞり書きの 書きはじめは `src/lib/fourLines.ts`（文字は Andika）
- `romaji/tools/voice/` … こえ（VOICEVOX:小夜/SAYO、じゃままるくんは VOICEVOX:黒沢冴白）の セリフと 生成スクリプト。`romaji-voice-gen` ブランチに push すると Actions（`.github/workflows/romaji-voice.yml`）で つくる
- 端末に保存するきろくは `flora:` で始まるキーなので、ほかの アプリの きろくとは まざりません

こえ：VOICEVOX:小夜/SAYO／VOICEVOX:黒沢冴白（ローマ字フローラちゃん）
