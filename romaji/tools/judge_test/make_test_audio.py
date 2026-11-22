"""
判定テスト用の 音声を VOICEVOX で つくる（Actions の judge-test-audio で うごかす）
- いろいろな 声 × 46もじ（ア〜ン）と あいうえお（どれも 1もじ だけ）
- ふつうの 声と、こどもに ちかづけた 声（すこし 高く・はやく）
- 48kHz モノラル FLAC、まえ 0.5びょう・うしろ 0.5びょう の しずかな ところ つき
→ romaji/tools/judge_test/audio/<声>_<v>_<ローマ字>.flac
"""
import io, json, os, sys, urllib.parse, urllib.request
import numpy as np, soundfile as sf

ENGINE = 'http://127.0.0.1:50021'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'audio')
os.makedirs(OUT, exist_ok=True)

def post(path, body=None):
    req = urllib.request.Request(ENGINE + path, data=body or b'', method='POST', headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read()

WANT = ['ずんだもん', '四国めたん', '春日部つむぎ', '雨晴はう', '冥鳴ひまり', '小夜/SAYO', '東北ずん子', '白上虎太郎', '玄野武宏', 'もち子さん', '九州そら', '中国うさぎ', 'WhiteCUL', '東北きりたん']
with urllib.request.urlopen(ENGINE + '/speakers', timeout=60) as r:
    sps = json.loads(r.read())
voices = []
for i, name in enumerate(WANT):
    sp = next((s for s in sps if s['name'] == name or s['name'].split('/')[0] == name.split('/')[0]), None)
    if not sp:
        print('skip', name); continue
    sid = next((s['id'] for s in sp['styles'] if s['name'] == 'ノーマル'), sp['styles'][0]['id'])
    voices.append((f'v{i:02d}', sid, name))
json.dump([{'tag': t, 'id': s, 'name': n} for t, s, n in voices], open(os.path.join(HERE, 'voices.json'), 'w'), ensure_ascii=False, indent=1)

KANA = 'ア イ ウ エ オ カ キ ク ケ コ サ シ ス セ ソ タ チ ツ テ ト ナ ニ ヌ ネ ノ ハ ヒ フ ヘ ホ マ ミ ム メ モ ヤ ユ ヨ ラ リ ル レ ロ ワ ン'.split()
ROMA = 'a i u e o ka ki ku ke ko sa shi su se so ta chi tsu te to na ni nu ne no ha hi fu he ho ma mi mu me mo ya yu yo ra ri ru re ro wa n'.split()
VARS = {'n': dict(pitch=0.0, speed=1.0), 'k': dict(pitch=0.09, speed=1.12)}

for tag, sid, name in voices:
    for k, r in zip(KANA, ROMA):
        q = json.loads(post(f'/audio_query?speaker={sid}&text=' + urllib.parse.quote(k)))
        for ap in q['accent_phrases']:
            for m in ap['moras']:
                if m['vowel'] in 'AIUEO':  # むせい化 しない
                    m['vowel'] = m['vowel'].lower()
                if m['vowel'] != 'N':
                    m['vowel_length'] = max(m['vowel_length'], 0.26)
                m['pitch'] = m['pitch'] or 5.6
        q['outputSamplingRate'] = 48000
        q['prePhonemeLength'] = 0.5
        q['postPhonemeLength'] = 0.5
        for vn, v in VARS.items():
            qq = dict(q, pitchScale=v['pitch'], speedScale=v['speed'])
            x, sr = sf.read(io.BytesIO(post(f'/synthesis?speaker={sid}', json.dumps(qq).encode())))
            sf.write(os.path.join(OUT, f'{tag}{vn}_{r}.flac'), x.astype(np.float32), sr, format='FLAC', subtype='PCM_16')
        print(tag, name, k, flush=True)
