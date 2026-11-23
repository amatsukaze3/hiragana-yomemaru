"""
かな 1もじの こえ（ローマ字フローラちゃん用。デイジーちゃんの make_kana.py を そのまま つかう）
- 声は make_voices.py の MAIN（小夜/SAYO）。SID と 高さ（P0＝330Hz）は make_voices.py が いれる
- VOICEVOX には カタカナで わたす（ひらがなも おなじ よみ）
- 「カタ」のように 2もじの ことばを よませ、1もじめ だけを きりだす（1もじだけ よませると 息っぽくなるため）
  2もじめは「タ」（「マ」だと 母音の おわりが はなに ぬけて あ段が きこえづらい。「ー」だと 声が 息だけに なる もじが あった）。
  「エ」は「エパ」。1もじめの よみが かわる（「ヘー」→「エー」）ときや 2つの ことばに わかれるときは ほかの もじで
- 弱い 子音（m・n・h・y など）は VOICEVOX で すこし ながめに よませる
- 無声の 子音（k・s・t・h など）は もとの 音を そのまま つかい、音量を あげる（破裂音 k・t は 2.4ばい）。
  母音（母音だけの もじ・m・n・y・r・w は 出だしから）は WORLD で つくりなおし、
  子音から 母音への うつりかわり（母音の はじめ 0.06びょう）は そのまま、そのあとの 母音は 安定部の 平均の 形で 一定に のばして、約0.37びょうに そろえる
- 息まじりの 成分（aperiodicity）は 0.4ばいに へらして、はっきりした 声に する
- 声の高さは 46もじ おなじ 350Hz。出だしの「すべりあがり」は おさえ、おわり すこし さがる 言い切りの 形（こまかい ゆれは のこさない）
- まえの 無音は 0.08びょう（みじかいと iPad などで 鳴りはじめが きれて 破裂音が きこえない）
- ファイルは 24kHz モノラル 96kbps、ラウドネス -16.5 LUFS
- しらべるとき：raw_candidates.py で VOICEVOX の もとの 音を raw/ に のこし、RAW_DIR=raw RAW_USE=1 で 加工だけ ためせる
"""
import io, json, math, os, subprocess, sys, tempfile
import numpy as np, soundfile as sf, pyworld as pw, pyloudnorm as pyln
from scipy.ndimage import uniform_filter1d
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vv import query, synth

SID = int(os.environ.get('SID', '2'))  # 四国めたん ノーマル
SR = 24000
FP = 5.0  # WORLD の フレーム（ミリ秒）
# 声の高さ（Hz）。46もじ ぜんぶ おなじ 高さに そろえる（文字ごとに かえると「う」だけ ひくく きこえたため）
P0 = float(os.environ.get('P0', '350'))
TOTAL = 0.49
LEAD = 0.08  # まえの 無音。みじかいと iPad などで 鳴りはじめが きれて「か」「た」の 破裂音が きこえなくなる
VOICED = 0.37  # 子音＋母音 の ながさ

# 子音を のばす わりあい（m・n・h・y・w などの 弱い 子音は、みじかいと 母音だけに きこえるため）
CONS_SCALE = {'k': 1.3, 't': 1.3, 'p': 1.3, 'm': 1.9, 'n': 1.9, 'h': 1.8, 'y': 1.7, 'w': 1.7, 'r': 1.4, 'N': 1.0,
              's': 1.25, 'sh': 1.25, 'ts': 1.2, 'ch': 1.2, 'f': 1.5, 'z': 1.2, 'j': 1.2}
# 無声の 子音（もとの 音を そのまま つかう ところ）の 音量を あげる わりあい。破裂音（k・t）は 母音に くらべて とても 小さいため
PRE_GAIN = {'k': 2.4, 't': 2.4, 'p': 2.2, 'ch': 1.7, 'ts': 1.7, 's': 1.3, 'sh': 1.3, 'h': 1.8, 'f': 1.8}
# 無声の 子音（もとの 音を そのまま つかう）
UNVOICED = {'k', 't', 'p', 's', 'sh', 'h', 'f', 'ch', 'ts'}
# 息まじりの 成分（aperiodicity）を この わりあいに へらす
AP_SCALE = float(os.environ.get('AP_SCALE', '0.4'))
KEEP = 0.06   # 母音の はじめ（子音からの うつりかわり）は もとの 音を この ながさだけ のこす
XFADE = 0.03  # もとの 音 → のばした 母音 の つなぎめ


CARRIERS = ('タ', 'マ', 'パ', 'ガ', 'コ', 'ー')
# 「エタ」の「エ」は 息まじりに なりやすいので「エパ」を さきに ためす
CARRIER_FIRST = {'エ': ('パ',)}


def build_query(kana, carriers=None):
    """VOICEVOX に よませる 2もじの ことばの query（「カタ」など）"""
    # 2もじめは「タ」（「マ」だと 母音の おわりが はなに ぬけて、あ段が きこえづらかった）。
    # 2つの ことばに わかれたり、1もじめの よみが かわる（「ヘタ」→「エタ」など）ときは ほかの もじで
    carriers = carriers or (CARRIER_FIRST.get(kana, ()) + CARRIERS)
    for carrier in carriers:
        q = query(kana + carrier, SID)
        mo = q['accent_phrases'][0]['moras']
        if len(mo) >= 2 and mo[0]['text'] == kana:
            break
    else:
        return None
    q['_long_v'] = carrier == 'ー'
    q['_carrier'] = carrier
    q['outputSamplingRate'] = SR
    q['prePhonemeLength'] = 0.1
    q['postPhonemeLength'] = 0.1
    ap0 = q['accent_phrases'][0]
    ap0['accent'] = 1
    m0, m1 = ap0['moras'][0], ap0['moras'][1]
    # 「フマ」の「フ」のように 母音が 無声化（大文字の U など）すると 息だけに なるので、声を だす 母音に もどす
    for m in (m0, m1):
        if m['vowel'] in ('A', 'I', 'U', 'E', 'O'):
            m['vowel'] = m['vowel'].lower()
    c = m0.get('consonant')
    if c and m0['consonant_length']:
        m0['consonant_length'] *= CONS_SCALE.get(c, 1.0)
    m0['vowel_length'] = 0.32  # 母音を ながめに よませて、のばす もとに なる 安定部を ながく とる
    m0['pitch'] = math.log(P0)
    m1['pitch'] = math.log(P0 if q['_long_v'] else P0 * 0.97)
    return q


def make(kana, out_mp3, debug=False):
    kana = ''.join(chr(ord(c) + 0x60) if 'ぁ' <= c <= 'ゖ' else c for c in kana)  # ひらがな → カタカナ
    # RAW_DIR を 指定すると VOICEVOX の もとの 音を のこす。RAW_USE も 指定すると、のこした 音で 加工だけ ためす（VOICEVOX なし）
    raw_dir = os.environ.get('RAW_DIR')
    raw = os.path.join(raw_dir, kana + os.environ.get('RAW_TAG', '')) if raw_dir else None
    if raw and os.environ.get('RAW_USE'):
        # のこした 候補（raw/カ_タ.wav など）から、ほんばんと おなじ じゅんで えらぶ
        for cr in CARRIER_FIRST.get(kana, ()) + CARRIERS:
            if os.path.exists(f'{raw}_{cr}.wav'):
                raw = f'{raw}_{cr}'
                break
        x, sr = sf.read(raw + '.wav')
        q = json.load(open(raw + '.json', encoding='utf-8'))
    else:
        q = build_query(kana)
        wav = synth({k: v for k, v in q.items() if not k.startswith('_')}, SID)
        x, sr = sf.read(io.BytesIO(wav))
        if raw:
            os.makedirs(raw_dir, exist_ok=True)
            open(raw + '.wav', 'wb').write(wav)
            json.dump(q, open(raw + '.json', 'w', encoding='utf-8'), ensure_ascii=False)
    long_v = q.get('_long_v', False)
    m0 = q['accent_phrases'][0]['moras'][0]
    c = m0.get('consonant')
    cons = m0['consonant_length'] or 0.0
    assert sr == SR
    t_v0 = 0.1 + cons                 # 母音の はじまり（よてい）
    t_v1 = t_v0 + m0['vowel_length']  # 母音の おわり
    y = x[:int(t_v1 * SR)].astype(np.float64)
    hop = int(SR * FP / 1000)
    # 声の 出はじめ（まえの 無音は のぞく）
    env = np.array([np.sqrt(np.mean(y[i:i + hop] ** 2)) for i in range(0, len(y) - hop, hop)])
    # 無声の 子音は 小さな 破裂・こすれる 音から。母音だけ・有声の 子音は、出だしの 息だけの ところを のぞいて 声が たちあがる ところから
    on = int(np.argmax(env > (0.004 if c in UNVOICED else 0.06) * max(env.max(), 1e-9))) * hop
    on = max(0, on - int(0.01 * SR))
    f0, t = pw.harvest(y, SR, f0_floor=150, f0_ceil=700, frame_period=FP)
    sp = pw.cheaptrick(y, f0, t, SR)
    ap = pw.d4c(y, f0, t, SR)
    fv0 = int(round(t_v0 * 1000 / FP))
    rms = np.array([np.sqrt(np.mean(y[j * hop:j * hop + hop] ** 2)) if j * hop < len(y) else 0 for j in range(len(f0))])
    # 母音の 安定した ところ：声が しっかり 出ている いちばん ながい ところ（おわりの 35ms は つぎの もじへの うつりかわりなので のぞく）
    # 「エ」のように 息まじりで 声の 高さが とれない ところが おおいときは、音の 大きさ だけで えらぶ
    jv = fv0 if c in UNVOICED else int(on / hop)  # WORLD で つくりなおす ところの はじめ（下を 参照）
    j_keep = max(int(round((t_v0 + KEEP) * 1000 / FP)), jv + int(KEEP * 1000 / FP))
    lo, hi = j_keep - 2, len(f0) - 7
    loud = rms[lo:hi] >= 0.6 * rms[lo:hi].max()
    ok = loud & (f0[lo:hi] > 0) if (f0[lo:hi] > 0).mean() >= 0.7 else loud
    best, cur = (0, 0), None
    for j, o in enumerate(list(ok) + [False]):
        if o and cur is None: cur = j
        if not o and cur is not None:
            if j - cur > best[1] - best[0]: best = (cur, j)
            cur = None
    stable = list(range(lo + best[0], lo + best[1]))
    if len(stable) < 4:
        stable = list(range(lo, hi))
    # WORLD で つくりなおす ところ：無声の 子音（k・s・t・h など）は 母音から、それ いがい（母音だけ・m・n・y・r・w）は 出だしから
    need = max(8, int(round((VOICED - (jv * hop - on) / SR) * 1000 / FP)) - (j_keep - jv))
    seq = [stable[min(i, len(stable) - 1)] for i in range(need)]
    frames = list(range(jv, j_keep)) + seq
    nh = j_keep - jv
    sp2 = np.exp(uniform_filter1d(np.log(sp[frames] + 1e-12), 3, axis=0))
    # のばす 母音の 声の 形（スペクトル）は 安定部の 平均に だんだん ちかづけて 一定に する
    # （安定部を いったりきたり するだけだと 形が ゆれて、「え」などが ふるえて きこえたため）
    lsp_mean = np.log(sp[stable] + 1e-12).mean(axis=0)
    lap_mean = ap[stable].mean(axis=0)
    w = np.clip(np.arange(len(seq)) / 8.0, 0, 1)[:, None]
    sp2[nh:] = np.exp((1 - w) * np.log(sp[seq] + 1e-12) + w * lsp_mean)
    # 子音から 母音への うつりかわりの ところが 小さく（息っぽく）なって、母音の まえで 音が へこむ もじ（「ひ」など）があるので、
    # 声の 形（うつりかわり）は そのままに、大きさだけ 安定部に そろえる（小さいときだけ。さいだい 4ばい）
    v_from = max(0, fv0 - jv)
    if nh > v_from:
        e_mean = np.exp(lsp_mean).sum()
        e_head = sp2[v_from:nh].sum(axis=1)
        sp2[v_from:nh] *= np.clip(e_mean / np.maximum(e_head, 1e-12), 1.0, 16.0)[:, None]
    ap2 = ap[frames].copy()
    ap2[nh:] = (1 - w) * ap[seq] + w * lap_mean
    # 息まじりの 成分を へらして、はっきりした 声に する（あ段・「え」が 息っぽく きこえづらかったため）
    ap2[v_from:] = np.minimum(ap2[v_from:] * AP_SCALE, 0.999)
    # 高さ：46もじ おなじ P0。出だしは P0 の 0.97〜1.02 ばい、母音は はじめ P0 → おわり すこし さがる（こまかい ゆれは のこさない）
    f0o = f0[frames]
    head_f0 = np.clip(np.where(f0o[:nh] > 0, f0o[:nh], P0), P0 * 0.97, P0 * 1.02)
    head_f0 = uniform_filter1d(head_f0, 5) if nh >= 5 else head_f0
    r = np.linspace(0, 1, len(seq))
    tail_f0 = P0 * (1.0 - 0.08 * (np.clip(r - 0.5, 0, None) / 0.5) ** 1.5)
    f0n = uniform_filter1d(np.concatenate([head_f0, tail_f0]), 5)
    z = pw.synthesize(np.ascontiguousarray(f0n), np.ascontiguousarray(sp2), np.ascontiguousarray(ap2), SR, frame_period=FP)
    # 無声の 子音（k・s・h など）は もとの 音を そのまま つかい、有声に なる ところで つなぐ
    pre = y[on:jv * hop] * PRE_GAIN.get(c or '', 1.0)
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
