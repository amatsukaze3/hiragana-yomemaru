"""
スペシャルモーラの ずんだもんの セリフを つくる（Actions の mora-voice で うごかす）。
lines.json の { "名前": "セリフ" }（あいだを あけない：空白は VOICEVOX が 間（ま）に する） を VOICEVOX:ずんだもん（ノーマル）で よみあげて、
mora/source/src/assets/voice/<名前>.mp3 に 保存する（24kHz・モノラル・96kbps・-16 LUFS。ほかの セリフと おなじ）。
"""
import json, os, subprocess, tempfile, urllib.parse, urllib.request
ENGINE = 'http://127.0.0.1:50021'
SPEAKER = 3  # ずんだもん ノーマル
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', '..', 'source', 'src', 'assets', 'voice'))

def post(path, body=None):
    req = urllib.request.Request(ENGINE + path, data=body or b'', method='POST', headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()

for name, text in json.load(open(os.path.join(HERE, 'lines.json'), encoding='utf-8')).items():
    q = json.loads(post(f'/audio_query?speaker={SPEAKER}&text=' + urllib.parse.quote(text)))
    q['outputSamplingRate'] = 24000
    q['prePhonemeLength'] = 0.1
    q['postPhonemeLength'] = 0.15
    wav = post(f'/synthesis?speaker={SPEAKER}', json.dumps(q).encode())
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        f.write(wav)
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', f.name, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '24000', '-ac', '1', '-b:a', '96k', os.path.join(OUT, name + '.mp3')], check=True)
    print(name, text, flush=True)
