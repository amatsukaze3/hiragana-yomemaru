"""
カタカナ 1もじの こえ（VOICEVOX:東北ずん子 ノーマル）
- 「カマ」のように 2もじの ことばを よませ、1もじめ だけを きりだす（1もじだけ よませると 息っぽくなるため）
- WORLD で 母音の 安定した ところを のばし、子音＋母音 を 約0.37びょうに そろえる（子音は そのまま）
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
    cons = m0['consonant_length'] or 0.0
    m0['vowel_length'] = 0.17
    m0['pitch'] = math.log(P0)
    m1['pitch'] = math.log(P0 * 0.9)
    x, sr = sf.read(io.BytesIO(synth(q, SID)))
    assert sr == SR
    t_v0 = 0.1 + cons                 # 母音の はじまり
    t_v1 = t_v0 + m0['vowel_length']  # 母音の おわり
    y = x[:int(t_v1 * SR)].astype(np.float64)
    f0, t = pw.harvest(y, SR, f0_floor=150, f0_ceil=700, frame_period=FP)
    sp = pw.cheaptrick(y, f0, t, SR)
    ap = pw.d4c(y, f0, t, SR)
    fv0 = int(round(t_v0 * 1000 / FP))
    # 母音の 安定した ところ：声が しっかり 出ている（いちばん大きい声の 6わり いじょう）いちばん ながい ところ
    # （おわりの 35ms は つぎの「マ」への うつりかわりなので つかわない）
    hop = int(SR * FP / 1000)
    rms = np.array([np.sqrt(np.mean(y[j * hop:j * hop + hop] ** 2)) if j * hop < len(y) else 0 for j in range(len(f0))])
    lo, hi = fv0 + (3 if cons > 0 else 0), len(f0) - 7
    ok = (f0[lo:hi] > 0) & (rms[lo:hi] >= 0.6 * rms[lo:hi].max())
    best, cur = (0, 0), None
    for j, o in enumerate(list(ok) + [False]):
        if o and cur is None: cur = j
        if not o and cur is not None:
            if j - cur > best[1] - best[0]: best = (cur, j)
            cur = None
    s0, s1 = lo + best[0], lo + best[1]
    stable = list(range(s0, s1))
    # 子音（と 母音の 出だし）＋ 安定部を いったりきたり して のばした もの。母音だけの もじは 安定部から はじめる
    head = list(range(max(0, fv0 - int(cons * 1000 / FP) - 4), s0)) if cons > 0 else []
    need = int(round((VOICED - (len(head) * FP / 1000)) * 1000 / FP))
    seq, i, d = [], 0, 1
    while len(seq) < need:
        seq.append(stable[i])
        if not 0 <= i + d < len(stable): d = -d
        i += d
    frames = head + seq
    sp2 = np.exp(uniform_filter1d(np.log(sp[frames] + 1e-12), 3, axis=0))
    ap2 = ap[frames]
    f0o = f0[frames]
    v = f0o > 0
    f0n = np.zeros_like(f0o)
    if v.sum() > 5:
        sm = f0o.copy(); sm[v] = uniform_filter1d(f0o[v], 9)
        jit = np.zeros_like(f0o); jit[v] = f0o[v] - sm[v]
        idx = np.where(v)[0]; a, b = idx[0], idx[-1]
        r = np.linspace(0, 1, b - a + 1)
        shape = 1.0 - 0.08 * (np.clip(r - 0.55, 0, None) / 0.45) ** 1.5
        tgt = np.zeros_like(f0o); tgt[a:b + 1] = P0 * shape
        f0n = np.where(v, tgt + 0.5 * jit, 0)
        # 有声の ところは とぎれさせない（いったりきたりで まじった 0 を うめる）
        f0n[a:b + 1] = np.where(f0n[a:b + 1] > 0, f0n[a:b + 1], tgt[a:b + 1])
    z = pw.synthesize(np.ascontiguousarray(f0n), np.ascontiguousarray(sp2), np.ascontiguousarray(ap2), SR, frame_period=FP)
    # 子音は もとの 音を つかう（母音の はじまりで つなぐ）
    if cons > 0 and head:
        orig = y[int(head[0] * FP / 1000 * SR):int(t_v0 * SR)]
        n = len(orig); xf = min(120, n)
        k = np.linspace(0, 1, xf)
        z[:n - xf] = orig[:n - xf]
        z[n - xf:n] = orig[n - xf:n] * (1 - k) + z[n - xf:n] * k
    else:
        # 母音だけの もじ：声が しっかり 出る ところから（みじかい フェードイン）
        fi = int(0.012 * SR)
        z[:fi] *= np.linspace(0, 1, fi)
    fade = int(0.05 * SR)
    z[-fade:] *= np.linspace(1, 0, fade) ** 1.5
    out = np.zeros(max(int(TOTAL * SR), int(LEAD * SR) + len(z) + int(0.04 * SR)))
    out[int(LEAD * SR):int(LEAD * SR) + len(z)] = z
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
