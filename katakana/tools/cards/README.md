# カード絵の つくりかた

いただいた PDF（行ごとの カード集）の 絵のページから、黒い文字を けして、文字なしの 線画に します。文字は アプリが UDデジタル教科書体 NK-B で かさねます。

1. `pdfimages -png` で 絵の ページ（1・3・5…ページめ）を とりだして `src/<ローマ字>.png` に する
2. `python3 run_all.py a` … 黒い文字を みつけて（`pipeline.py` の `letter_core`）、AI の 画像うめ（LaMa。OpenCV zoo の `inpainting_lama_2025jan.onnx`）で うめる
   - 文字の まわりに 白い ふちが ある カード（ラ・リ・ヤ）は、マスクを 大きく して うめなおした
   - ホ（ホットケーキ）は `fix_ho.py` で 線を 計算して かきなおした
3. `python3 finalize.py clean_a` … 文字の あとの うすい かげを 白に、絵を 1000×760 の まんなかに おいて `final/<ローマ字>.webp`（800×608）と、文字の いち `pos.json` を つくる
4. `python3 gen_kana_ts.py kana.json pos.json ../../source/src/data/kana.ts` … 文字データを つくる（画数・書きはじめの いちも ここ）
