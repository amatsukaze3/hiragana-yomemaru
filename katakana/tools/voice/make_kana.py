"""
カタカナ 1もじの こえ（VOICEVOX:東北ずん子 ノーマル）
- 「カマ」のように 2もじの ことばを よませ、1もじめ だけを きりだす（1もじだけ よませると 息っぽくなるため）
- 弱い 子音（m・n・h・y など）は VOICEVOX で すこし ながめに よませる
- 子音と、子音から 母音への うつりかわり（母音の はじめ 0.06びょう）は もとの 音を そのまま つかい、
  そのあとの 母音だけ WORLD で 安定した ところを のばして、子音＋母音 を 約0.37びょうに そろえる
- 声の高さは「はじめ P0 → おわり すこし さがる」言い切りの 形（もとの こまかい ゆれは はんぶん のこす）
- ファイルは 無音こみで 0.49びょう、24kHz モノラル 96kbps、ラウドネス -16.5 LUFS
"""
import io, math, os, subprocess, sys, tempfile
import numpy as np, soundfile as sf, pyworld as pw, pyloudnorm as pyln
from scipy.ndimage import uniform_filter1d
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vv import query, synth

SID = 107  # 東北ずん子 ノーマル
SR = 24000
FP = 5.0  # WORLD の フレーム（ミリ秒）
P0 = float(os.environ.get('P0', '345'))
TOTAL = 0.49
LEAD = 0.03
VOICED = 0.37  # 子音＋母音 の ながさ

# 子音を のばす わりあい（m・n・h・y・w などの 弱い 子音は、みじかいと 母音だけに きこえるため）
CONS_SCALE = {'m': 1.9, 'n': 1.9, 'h': 1.8, 'y': 1.7, 'w': 1.7, 'r': 1.4, 'N': 1.0,
              's': 1.25, 'sh': 1.25, 'ts': 1.2, 'ch': 1.2, 'f': 1.5, 'z': 1.2, 'j': 1.2}
KEEP = 0.06   # 母音の はじめ（子音からの うつりかわり）は もとの 音を この ながさだけ のこす
XFADE = 0.03  # もとの 音 → のばした 母音 の つなぎめ


def make(kana, out_mp3, debug=False):
    # 「ネマ」のように 2つの ことばに わかれて しまうときは、ほかの 2もじめで ためす
    for carrier in ('マ', 'タ', 'ガ', 'コ'):
        q = query(kana + carrier, SID)
        if len(q['accent_phrases'][0]['moras']) >= 2:
            break
    q['outputSamplingRate'] = SR
    q['prePhonemeLength'] = 0.1
    q['postPhonemeLength'] = 0.1
    ap0 = q['accent_phrases'][0]
    ap0['accent'] = 1
    m0, m1 = ap0['moras'][0], ap0['moras'][1]
    c = m0.get('consonant')
    if c and m0['consonant_length']:
        m0['consonant_length'] *= CONS_SCALE.get(c, 1.0)
    cons = m0['consonant_length'] or 0.0
    m0['vowel_length'] = 0.2
    m0['pitch'] = math.log(P0)
    m1['pitch'] = math.log(P0 * 0.97)
    x, sr = sf.read(io.BytesIO(synth(q, SID)))
    assert sr == SR
    t_v0 = 0.1 + cons                 # 母音の はじまり（よてい）
    t_v1 = t_v0 + m0['vowel_length']  # 母音の おわり
    y = x[:int(t_v1 * SR)].astype(np.float64)
    hop = int(SR * FP / 1000)
    # 声の 出はじめ（まえの 無音は のぞく）
    env = np.array([np.sqrt(np.mean(y[i:i + hop] ** 2)) for i in range(0, len(y) - hop, hop)])
    on = int(np.argmax(env > 0.004 * max(env.max(), 1e-9))) * hop
    on = max(0, on - int(0.01 * SR))
    f0, t = pw.harvest(y, SR, f0_floor=150, f0_ceil=700, frame_period=FP)
    sp = pw.cheaptrick(y, f0, t, SR)
    ap = pw.d4c(y, f0, t, SR)
    fv0 = int(round(t_v0 * 1000 / FP))
    rms = np.array([np.sqrt(np.mean(y[j * hop:j * hop + hop] ** 2)) if j * hop < len(y) else 0 for j in range(len(f0))])
    # 母音の 安定した ところ：声が しっかり 出ている いちばん ながい ところ（おわりの 35ms は つぎの もじへの うつりかわりなので のぞく）
    lo, hi = fv0 + int(KEEP * 1000 / FP) - 2, len(f0) - 7
    ok = (f0[lo:hi] > 0) & (rms[lo:hi] >= 0.6 * rms[lo:hi].max())
    best, cur = (0, 0), None
    for j, o in enumerate(list(ok) + [False]):
        if o and cur is None: cur = j
        if not o and cur is not None:
            if j - cur > best[1] - best[0]: best = (cur, j)
            cur = None
    stable = list(range(lo + best[0], lo + best[1]))
    if len(stable) < 4:
        stable = list(range(lo, hi))
    # もとの 音：出はじめ 〜 母音の はじめ KEEP びょう（子音と うつりかわりは そのまま）
    t_keep = t_v0 + KEEP
    head = y[on:int(t_keep * SR)]
    # のばす 母音：安定部を いったりきたり（つなぎめの ぶんも ふくめて つくる）
    tail_sec = VOICED - len(head) / SR + XFADE + 0.012
    need = max(8, int(round(tail_sec * 1000 / FP)))
    seq, i, d = [], 0, 1
    while len(seq) < need:
        seq.append(stable[i])
        if not 0 <= i + d < len(stable): d = -d
        i += d
    sp2 = np.exp(uniform_filter1d(np.log(sp[seq] + 1e-12), 3, axis=0))
    ap2 = ap[seq]
    f0o = f0[seq]
    sm = uniform_filter1d(np.where(f0o > 0, f0o, P0), 9)
    jit = np.where(f0o > 0, f0o - sm, 0)
    r = np.linspace(0, 1, len(seq))
    shape = 1.0 - 0.08 * (np.clip(r - 0.5, 0, None) / 0.5) ** 1.5
    # つなぎめの 高さを もとの 音に あわせる
    j0 = int(t_keep * 1000 / FP)
    p_start = f0[j0] if 0 <= j0 < len(f0) and f0[j0] > 0 else P0
    tgt = P0 * shape + (p_start - P0) * np.clip(1 - r * 6, 0, 1)
    f0n = tgt + 0.5 * jit
    z = pw.synthesize(np.ascontiguousarray(f0n), np.ascontiguousarray(sp2), np.ascontiguousarray(ap2), SR, frame_period=FP)
    xf = int(XFADE * SR)
    k = np.linspace(0, 1, xf)
    # つなぎめで 波が うちけしあわないよう、いちばん よく かさなる ずらしかたを さがす（1周期ぶん）
    ref = head[-xf:]
    period = int(SR / max(p_start, 150)) + 2
    shift = max(range(period), key=lambda s_: float(np.dot(ref, z[s_:s_ + xf])))
    z = z[shift:]
    # 大きさを もとの 音の おわりに あわせる
    g = np.sqrt(np.mean(head[-xf:] ** 2)) / max(np.sqrt(np.mean(z[:xf] ** 2)), 1e-9)
    z = z * g
    joined = np.concatenate([head[:-xf], head[-xf:] * (1 - k) + z[:xf] * k, z[xf:]])
    fi = int(0.006 * SR)
    joined[:fi] *= np.linspace(0, 1, fi)
    fade = int(0.05 * SR)
    joined[-fade:] *= np.linspace(1, 0, fade) ** 1.5
    out = np.zeros(max(int(TOTAL * SR), int(LEAD * SR) + len(joined) + int(0.04 * SR)))
    out[int(LEAD * SR):int(LEAD * SR) + len(joined)] = joined
    meter = pyln.Meter(SR, block_size=0.2)
    out = pyln.normalize.loudness(out, meter.integrated_loudness(out), -16.5)
    pk = np.abs(out).max()
    if pk > 0.89: out *= 0.89 / pk
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        sf.write(f.name, out, SR); tmp = f.name
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ar', str(SR), '-ac', '1', '-b:a', '96k', out_mp3], check=True)
    if debug: sf.write(out_mp3.replace('.mp3', '.wav'), out, SR)
    os.unlink(tmp)
    return out
