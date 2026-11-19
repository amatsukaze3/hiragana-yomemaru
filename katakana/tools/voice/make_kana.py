"""
カタカナ 1もじの こえ（VOICEVOX:東北ずん子 ノーマル）
- 「カマ」のように 2もじの ことばを よませ、1もじめ だけを きりだす（1もじだけ よませると 息っぽくなるため）
- 弱い 子音（m・n・h・y など）は VOICEVOX で すこし ながめに よませる
- 無声の 子音（k・s・h など）は もとの 音を そのまま つかう。有声の ところ（m・n・y の 子音と 母音）は WORLD で つくりなおし、
  子音から 母音への うつりかわり（母音の はじめ 0.06びょう）は そのまま、そのあとの 母音だけ 安定部を のばして、子音＋母音 を 約0.37びょうに そろえる
- 出だしの 声の 高さの「すべりあがり」は おさえる（m・n・y を ながく すると ゆれて きこえるため）
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
    m0['vowel_length'] = 0.32  # 母音を ながめに よませて、のばす もとに なる 安定部を ながく とる
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
    # 有声に なる ところ（m・n・y などは 子音から、k・s・h などは 母音から）
    j_keep = int(round((t_v0 + KEEP) * 1000 / FP))
    vf = [j for j in range(int(on / hop), j_keep) if f0[j] > 0]
    jv = vf[0] if vf else j_keep
    # のばす 母音：安定部を いったりきたり
    need = max(8, int(round((VOICED - (jv * hop - on) / SR) * 1000 / FP)) - (j_keep - jv))
    seq, i, d = [], 0, 1
    while len(seq) < need:
        seq.append(stable[i])
        if not 0 <= i + d < len(stable): d = -d
        i += d
    frames = list(range(jv, j_keep)) + seq
    nh = j_keep - jv
    sp2 = np.exp(uniform_filter1d(np.log(sp[frames] + 1e-12), 3, axis=0))
    sp2[nh:] = np.exp(uniform_filter1d(np.log(sp[seq] + 1e-12), 5, axis=0))
    ap2 = ap[frames]
    f0o = f0[frames]
    # 高さ：出だしの「すべりあがり」を おさえて（P0 の 0.93〜1.02 ばいに）、母音は はじめ P0 → おわり すこし さがる
    head_f0 = np.clip(np.where(f0o[:nh] > 0, f0o[:nh], P0), P0 * 0.93, P0 * 1.02)
    head_f0 = uniform_filter1d(head_f0, 5) if nh >= 5 else head_f0
    r = np.linspace(0, 1, len(seq))
    tail_f0 = P0 * (1.0 - 0.08 * (np.clip(r - 0.5, 0, None) / 0.5) ** 1.5)
    sm = uniform_filter1d(np.where(f0[seq] > 0, f0[seq], P0), 5)
    tail_f0 = tail_f0 + 0.3 * uniform_filter1d(np.where(f0[seq] > 0, f0[seq] - sm, 0), 3)
    f0n = uniform_filter1d(np.concatenate([head_f0, tail_f0]), 3)
    if nh:
        f0n[:nh] = np.maximum(f0n[:nh], head_f0 * 0.98)
    z = pw.synthesize(np.ascontiguousarray(f0n), np.ascontiguousarray(sp2), np.ascontiguousarray(ap2), SR, frame_period=FP)
    # 無声の 子音（k・s・h など）は もとの 音を そのまま つかい、有声に なる ところで つなぐ
    pre = y[on:jv * hop]
    xf = min(int(0.008 * SR), len(pre))
    if len(pre) > 0:
        k = np.linspace(0, 1, xf)
        ref = pre[-xf:] if xf else pre
        joined = np.concatenate([pre[:len(pre) - xf], pre[len(pre) - xf:] * (1 - k) + z[:xf] * k, z[xf:]])
    else:
        joined = z
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
