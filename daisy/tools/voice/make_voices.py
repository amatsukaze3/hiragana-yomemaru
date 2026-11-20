"""
ひらがなデイジーちゃん の こえを つくる（VOICEVOX:四国めたん ／ じゃままるくんは VOICEVOX:黒沢冴白）
英語しか はなせない子むけ なので、セリフは カタカナで かいた 英語（lines.json）。ひらがな・ことばは 日本語の よみ。

VOICEVOX エンジン（http://127.0.0.1:50021）が うごいている状態で:
    python3 daisy/tools/voice/make_voices.py            # ぜんぶ
    python3 daisy/tools/voice/make_voices.py kana       # ひらがな 1もじ だけ
    python3 daisy/tools/voice/make_voices.py lines      # セリフ だけ
- ひらがな 1もじ（46こ）… make_kana.py（「カマ」の 1もじめを きりだし、WORLD で 母音を のばす）
    → daisy/source/src/assets/voice/<ローマ字>.mp3（「を」は「お」と おなじ こえ）
- セリフ … lines.json
    → pass5・clear10・reg_guide・retry_register・assess_* は src/assets/voice/
    → w_・s_・sh_・bt_・jm_ は src/assets/voice/shoot/
すべて 24kHz・モノラル・96kbps。ffmpeg・pyworld・pyloudnorm・soundfile が 必要です。

クレジット「VOICEVOX:四国めたん」「VOICEVOX:黒沢冴白」の 表記が 必要です（ホーム画面と シューティングの メニューに 表示しています）。
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

SR = 24000
VOICE = os.path.normpath(os.path.join(HERE, '..', '..', 'source', 'src', 'assets', 'voice'))
SHOOT = os.path.join(VOICE, 'shoot')


MAIN = '四国めたん'


def speaker(name: str) -> dict:
    with urllib.request.urlopen(ENGINE + '/speakers', timeout=60) as r:
        for sp in json.loads(r.read()):
            if sp['name'] == name:
                return sp
    sys.exit(f'キャラクター「{name}」が このエンジンに ありません')


def speaker_id(name: str) -> int:
    styles = speaker(name)['styles']
    return next((s['id'] for s in styles if s['name'] == 'ノーマル'), styles[0]['id'])


def save_terms(name: str):
    """利用規約を tools/voice/terms_<なまえ>.md に のこす"""
    sp = speaker(name)
    with urllib.request.urlopen(ENGINE + '/speaker_info?speaker_uuid=' + sp['speaker_uuid'], timeout=60) as r:
        policy = json.loads(r.read())['policy']
    with urllib.request.urlopen(ENGINE + '/version', timeout=60) as r:
        ver = r.read().decode()
    with open(os.path.join(HERE, f'terms_{name}.md'), 'w', encoding='utf-8') as f:
        f.write(f'# {name} の 利用規約（VOICEVOX エンジン {ver} の speaker_info より）\n\n' + policy + '\n')


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


# ほめことば・かけごえ は テンション たかく、あかるく（声を すこし たかく・抑揚を おおきく・すこし はやく）
CHEER = {'pass5', 'clear10', 'assess_r1', 'assess_r2', 'assess_r3', 'assess_r4', 'sh_start', 'sh_resume', 'sh_over', 'sh_record',
         'sh_complete', 'sh_miss', 'sh_saved', 'sh_gold', 'bt_intro', 'bt_test', 'bt_perfect', 'bt_win'}


def is_cheer(name: str) -> bool:
    return name in CHEER or name.startswith('s_')


def line(text: str, sid: int, dst: str, cheer: bool = False):
    q = query(text, sid)
    q['outputSamplingRate'] = SR
    # こどもに ききとりやすいよう、すこし ゆっくり・まえうしろの むおんを みじかく
    q['speedScale'] = 0.95
    if cheer:
        q['speedScale'] = 1.03
        q['pitchScale'] = 0.07
        q['intonationScale'] = 1.55
        q['volumeScale'] = 1.1
    q['prePhonemeLength'] = 0.05
    q['postPhonemeLength'] = 0.1
    x, sr = sf.read(io.BytesIO(synth(q, sid)))
    assert sr == SR
    to_mp3(x.astype(np.float64), dst, -16.0)


def kana_all():
    import make_kana as mk
    mk.SID = speaker_id(MAIN)
    items = json.load(open(os.path.join(HERE, 'kana.json'), encoding='utf-8'))
    os.makedirs(VOICE, exist_ok=True)
    for it in items:
        dst = os.path.join(VOICE, it['romaji'] + '.mp3')
        if it['char'] == 'を' or (os.environ.get('SKIP_EXISTING') and os.path.exists(dst)):
            continue
        make_kana(it['char'], dst)
        print(it['char'], it['romaji'], flush=True)
    # 「を」は「お」と おなじ よみ
    shutil.copyfile(os.path.join(VOICE, 'o.mp3'), os.path.join(VOICE, 'wo.mp3'))


def lines_all():
    lines: dict = json.load(open(os.path.join(HERE, 'lines.json'), encoding='utf-8'))
    os.makedirs(SHOOT, exist_ok=True)
    ids: dict[str, int] = {}
    main = speaker_id(MAIN)
    for name, item in lines.items():
        text, sid = (item, main) if isinstance(item, str) else (item['text'], ids.setdefault(item['speaker'], speaker_id(item['speaker'])))
        folder = SHOOT if name.split('_')[0] in ('w', 's', 'sh', 'bt', 'jm') else VOICE
        if os.environ.get('ONLY') and name not in os.environ['ONLY'].split(','):
            continue
        line(text, sid, os.path.join(folder, name + '.mp3'), cheer=sid == main and is_cheer(name))
        print(name, sid, text, flush=True)


if __name__ == '__main__':
    for n in (MAIN, '黒沢冴白'):
        save_terms(n)
    what = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if what in ('all', 'kana'):
        kana_all()
    if what in ('all', 'lines'):
        lines_all()
