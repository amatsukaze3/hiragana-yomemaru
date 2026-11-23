"""しらべる用：1もじの 声の もとを 2もじめ（タ・マ・パ・ー）ごとに VOICEVOX で つくって raw/ に のこす"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import make_kana as mk
from vv import synth
import make_voices
mk.SID = make_voices.speaker_id(make_voices.MAIN)
out = os.path.join(HERE, 'raw')
os.makedirs(out, exist_ok=True)
for it in json.load(open(os.path.join(HERE, 'kana.json'), encoding='utf-8')):
    k = chr(ord(it['char']) + 0x60)
    if k == 'ヲ':
        continue
    for c in ('タ', 'マ', 'パ', 'ー'):
        q = mk.build_query(k, (c,))
        if not q:
            print('skip', k, c); continue
        wav = synth({a: b for a, b in q.items() if not a.startswith('_')}, mk.SID)
        open(os.path.join(out, f'{k}_{c}.wav'), 'wb').write(wav)
        json.dump(q, open(os.path.join(out, f'{k}_{c}.json'), 'w', encoding='utf-8'), ensure_ascii=False)
        print(k, c, flush=True)
