"""
カタカナはなちゃん の こえを つくる（VOICEVOX:東北ずん子 ／ じゃままるくんは VOICEVOX:黒沢冴白）

VOICEVOX エンジン（http://127.0.0.1:50021）が うごいている状態で:
    python3 katakana/tools/voice/make_voices.py            # ぜんぶ
    python3 katakana/tools/voice/make_voices.py kana       # カタカナ 1もじ だけ
    python3 katakana/tools/voice/make_voices.py lines      # セリフ だけ
- カタカナ 1もじ（46こ）… make_kana.py（「カマ」の 1もじめを きりだし、WORLD で 母音を のばす）
    → katakana/source/src/assets/voice/<ローマ字>.mp3（「ヲ」は「オ」と おなじ こえ）
- セリフ … lines.json
    → pass5・clear10・reg_guide・retry_register・assess_* は src/assets/voice/
    → w_・s_・sh_・bt_・jm_ は src/assets/voice/shoot/
すべて 24kHz・モノラル・96kbps。ffmpeg・pyworld・pyloudnorm・soundfile が 必要です。

クレジット「VOICEVOX:東北ずん子」「VOICEVOX:黒沢冴白」の 表記が 必要です（ホーム画面と シューティングの メニューに 表示しています）。
"""

import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.request

import numpy as np
import pyloudnorm as pyln
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from make_kana import make as make_kana  # noqa: E402
from vv import ENGINE, query, synth  # noqa: E402

ZUNKO = 107  # 東北ずん子 ノーマル
SR = 24000
VOICE = os.path.normpath(os.path.join(HERE, '..', '..', 'source', 'src', 'assets', 'voice'))
SHOOT = os.path.join(VOICE, 'shoot')


def speaker_id(name: str) -> int:
    with urllib.request.urlopen(ENGINE + '/speakers', timeout=60) as r:
        for sp in json.loads(r.read()):
            if sp['name'] == name:
                return sp['styles'][0]['id']
    sys.exit(f'キャラクター「{name}」が このエンジンに ありません')


def to_mp3(x: np.ndarray, dst: str, lufs: float):
    meter = pyln.Meter(SR, block_size=0.2)
    x = pyln.normalize.loudness(x, meter.integrated_loudness(x), lufs)
    pk = np.abs(x).max()
    if pk > 0.89:
        x = x * (0.89 / pk)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        sf.write(f.name, x, SR)
        tmp = f.name
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ar', str(SR), '-ac', '1', '-b:a', '96k', dst], check=True)
    os.unlink(tmp)


def line(text: str, sid: int, dst: str):
    q = query(text, sid)
    q['outputSamplingRate'] = SR
    # こどもに ききとりやすいよう、すこし ゆっくり・まえうしろの むおんを みじかく
    q['speedScale'] = 0.95
    q['prePhonemeLength'] = 0.05
    q['postPhonemeLength'] = 0.1
    x, sr = sf.read(io.BytesIO(synth(q, sid)))
    assert sr == SR
    to_mp3(x.astype(np.float64), dst, -16.0)


def kana_all():
    items = json.load(open(os.path.join(HERE, 'kana.json'), encoding='utf-8'))
    os.makedirs(VOICE, exist_ok=True)
    for it in items:
        dst = os.path.join(VOICE, it['romaji'] + '.mp3')
        if it['char'] == 'ヲ' or (os.environ.get('SKIP_EXISTING') and os.path.exists(dst)):
            continue
        make_kana(it['char'], dst)
        print(it['char'], it['romaji'], flush=True)
    # 「ヲ」は「オ」と おなじ よみ
    shutil.copyfile(os.path.join(VOICE, 'o.mp3'), os.path.join(VOICE, 'wo.mp3'))


def lines_all():
    lines: dict = json.load(open(os.path.join(HERE, 'lines.json'), encoding='utf-8'))
    os.makedirs(SHOOT, exist_ok=True)
    ids: dict[str, int] = {}
    for name, item in lines.items():
        text, sid = (item, ZUNKO) if isinstance(item, str) else (item['text'], ids.setdefault(item['speaker'], speaker_id(item['speaker'])))
        folder = SHOOT if name.split('_')[0] in ('w', 's', 'sh', 'bt', 'jm') else VOICE
        line(text, sid, os.path.join(folder, name + '.mp3'))
        print(name, sid, text, flush=True)


if __name__ == '__main__':
    what = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if what in ('all', 'kana'):
        kana_all()
    if what in ('all', 'lines'):
        lines_all()
