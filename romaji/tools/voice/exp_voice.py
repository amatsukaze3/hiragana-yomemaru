"""しらべる用：小夜/SAYO の セリフを いくつかの 設定で つくり、1もじの もとの 音を raw/ に のこす"""
import io, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import soundfile as sf, numpy as np
from vv import query, synth
import make_voices as mv
import make_kana as mk
OUT = os.path.join(HERE, 'exp'); os.makedirs(OUT, exist_ok=True)
sid = mv.speaker_id('小夜/SAYO')
mk.SID = sid
TEXTS = {'pass5': 'ワンダフル！ ごうかく！ よく できたね！', 'sh_start': 'レッツ ゴー！ カードを よんで、ゲットしよう！',
         'reg_guide': 'わたしの こえを、そっくり まねしてね。', 'w_ka': 'かめ', 'bt_s3': 'わたしの あとに つづけて よんでね！'}
VARS = {'cur_cheer': dict(speedScale=1.03, pitchScale=0.07, intonationScale=1.55, volumeScale=1.1),
        'cur_plain': dict(speedScale=0.95),
        'p0_i10': dict(speedScale=0.97, pitchScale=0.0, intonationScale=1.0),
        'p0_i12': dict(speedScale=0.97, pitchScale=0.0, intonationScale=1.2),
        'p3_i12': dict(speedScale=0.97, pitchScale=0.03, intonationScale=1.2),
        'm3_i12': dict(speedScale=0.97, pitchScale=-0.03, intonationScale=1.2),
        'p5_i13': dict(speedScale=1.0, pitchScale=0.05, intonationScale=1.3)}
for name, text in TEXTS.items():
    q0 = query(text, sid)
    for vn, v in VARS.items():
        q = dict(q0, **v, outputSamplingRate=24000, prePhonemeLength=0.05, postPhonemeLength=0.1)
        x, sr = sf.read(io.BytesIO(synth(q, sid)))
        sf.write(os.path.join(OUT, f'{name}__{vn}.wav'), x.astype(np.float32), sr)
    print(name, flush=True)
# 1もじの もとの 音
raw = os.path.join(HERE, 'raw'); os.makedirs(raw, exist_ok=True)
for p0 in (300, 330):
    mk.P0 = float(p0)
    for it in json.load(open(os.path.join(HERE, 'kana.json'), encoding='utf-8')):
        k = chr(ord(it['char']) + 0x60)
        if k == 'ヲ': continue
        q = mk.build_query(k)
        if not q: continue
        wav = synth({a: b for a, b in q.items() if not a.startswith('_')}, sid)
        open(os.path.join(raw, f'{k}{p0}_{q["_carrier"]}.wav'), 'wb').write(wav)
        json.dump(q, open(os.path.join(raw, f'{k}{p0}_{q["_carrier"]}.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    print('kana', p0, flush=True)
