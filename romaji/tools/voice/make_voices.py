"""
ローマ字フローラちゃん の こえを つくる（VOICEVOX:小夜/SAYO ／ じゃままるくんは VOICEVOX:黒沢冴白）
フローラちゃんは イギリスから きた 子なので、セリフは 日本語に ときどき 英語（ワンダフル！ ブリリアント！）。

VOICEVOX エンジン（http://127.0.0.1:50021）が うごいている状態で:
    python3 romaji/tools/voice/make_voices.py            # ぜんぶ
    python3 romaji/tools/voice/make_voices.py kana       # ひらがな 1もじ だけ
    python3 romaji/tools/voice/make_voices.py lines      # セリフ だけ
- ひらがな 1もじ（46こ）… make_kana.py（「カマ」の 1もじめを きりだし、WORLD で 母音を のばす）
    → romaji/source/src/assets/voice/<ローマ字>.mp3（「を」は「お」と おなじ こえ）
- セリフ … lines.json
    → pass5・clear10・reg_guide・retry_register・assess_* は src/assets/voice/
    → w_・s_・sh_・bt_・jm_ は src/assets/voice/shoot/
すべて 24kHz・モノラル・96kbps。ffmpeg・pyworld・pyloudnorm・soundfile が 必要です。

クレジット「VOICEVOX:小夜/SAYO」「VOICEVOX:黒沢冴白」の 表記が 必要です。
ぜんぶ つくりなおすと src/data/voiceCredit.json も かきかえるので、ホーム画面と シューティングの メニューの 表記は 自動で かわります（terms.html の 下の 表記は 手で なおす）。
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


MAIN = os.environ.get('MAIN', '小夜/SAYO')


def speaker(name: str) -> dict:
    with urllib.request.urlopen(ENGINE + '/speakers', timeout=60) as r:
        sps = json.loads(r.read())
    # 「小夜/SAYO」は エンジンの 版で 表記が ちがうことが あるので、/ の まえ（小夜）でも さがす
    for sp in sps:
        if sp['name'] == name:
            return sp
    for sp in sps:
        if sp['name'].split('/')[0] == name.split('/')[0]:
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
    with open(os.path.join(HERE, f"terms_{name.replace('/', '_')}.md"), 'w', encoding='utf-8') as f:
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


# ほめことば・かけごえ は すこし はやく（高さ・抑揚を あげると 小夜/SAYO は かすれたので、はやさだけ）
CHEER = {'pass5', 'clear10', 'assess_r1', 'assess_r2', 'assess_r3', 'assess_r4', 'sh_start', 'sh_resume', 'sh_over', 'sh_record',
         'sh_complete', 'sh_miss', 'sh_saved', 'sh_gold', 'bt_intro', 'bt_test', 'bt_perfect', 'bt_win'}


def is_cheer(name: str) -> bool:
    return name in CHEER or name.startswith('s_')


# 1もじの 声の 高さ（Hz）。小夜/SAYO は 350Hz だと かすれた（ふだんの 話し声は 約290〜310Hz）。330Hz で いちばん すんだ 声に なった（2026-11-23）
KANA_P0 = float(os.environ.get('KANA_P0', '330'))
# フローラちゃんの セリフ：すこし 高め（+0.03）・抑揚 1.2。ほめことばで 高さを +0.07・抑揚 1.55 に すると かすれたので、はやさだけ かえる
MAIN_PITCH = 0.03
MAIN_INTONATION = 1.2
# 息まじりの 成分を この わりあいに へらして（WORLD で つくりなおす）、すんだ 声に する
LINE_AP_SCALE = 0.5
# 高さを ならす はば（フレーム。1フレーム 5ms）
F0_SMOOTH = 6


def world_clean(x: np.ndarray) -> np.ndarray:
    """かすれ・ガラガラを へらす：高さの とび（まわりの 中央値から 12% いじょう）を なおして すこし なめらかにし、息まじりを へらす"""
    import pyworld as pw
    f0, t = pw.harvest(x, SR, f0_floor=150, f0_ceil=700, frame_period=5.0)
    sp = pw.cheaptrick(x, f0, t, SR)
    ap = pw.d4c(x, f0, t, SR)
    v = f0 > 0
    lf = np.where(v, np.log(np.maximum(f0, 1)), np.nan)
    g = f0.copy()
    for i in np.where(v)[0]:
        m = np.nanmedian(lf[max(0, i - 6):i + 7])
        if abs(lf[i] - m) > 0.12:
            g[i] = np.exp(m)
    # 高さの こまかい ゆれを ±30ms で ならす（2026-11-23 ユーザーが ためし音声 C を えらんだ。±10ms だと 揺れが のこった。
    # 声の 形まで ならすと 機械っぽく なったので、ならすのは 高さ だけ）
    g2 = g.copy()
    for i in np.where(v)[0]:
        w = g[max(0, i - F0_SMOOTH):i + F0_SMOOTH + 1]
        g2[i] = w[w > 0].mean()
    ap[v] = ap[v] * LINE_AP_SCALE
    y = pw.synthesize(g2, sp, ap, SR, 5.0)
    return y[:len(x)]


def line(text: str, sid: int, dst: str, cheer: bool = False, main: bool = False):
    q = query(text, sid)
    q['outputSamplingRate'] = SR
    # こどもに ききとりやすいよう、すこし ゆっくり・まえうしろの むおんを みじかく
    q['speedScale'] = 0.97
    if main:
        q['pitchScale'] = MAIN_PITCH
        q['intonationScale'] = MAIN_INTONATION
        if cheer:
            q['speedScale'] = 1.02
    q['prePhonemeLength'] = 0.05
    q['postPhonemeLength'] = 0.1
    x, sr = sf.read(io.BytesIO(synth(q, sid)))
    assert sr == SR
    x = x.astype(np.float64)
    if main:
        x = world_clean(x)
    to_mp3(x, dst, -16.0)


def kana_all():
    import make_kana as mk
    mk.SID = speaker_id(MAIN)
    mk.P0 = KANA_P0
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
        line(text, sid, os.path.join(folder, name + '.mp3'), cheer=sid == main and is_cheer(name), main=sid == main)
        print(name, sid, text, flush=True)


if __name__ == '__main__':
    for n in (MAIN, '黒沢冴白'):
        save_terms(n)
    what = sys.argv[1] if len(sys.argv) > 1 else 'all'
    if what in ('all', 'kana'):
        kana_all()
    if what in ('all', 'lines'):
        lines_all()
    if what == 'all':
        # 画面の クレジット表記を こえに あわせる
        cred = os.path.normpath(os.path.join(HERE, '..', '..', 'source', 'src', 'data', 'voiceCredit.json'))
        json.dump({'main': MAIN, 'jama': '黒沢冴白'}, open(cred, 'w', encoding='utf-8'), ensure_ascii=False)
