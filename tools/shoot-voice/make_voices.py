"""
よめ丸シューティングの ずんだもん音声を つくる。

VOICEVOX エンジン（http://127.0.0.1:50021）が うごいている状態で:
    python3 tools/shoot-voice/make_voices.py
すると、lines.json の セリフを ずんだもん（ノーマル, speaker=3）で よみあげて、
source/src/assets/voice/shoot/<名前>.mp3 に 保存する（24kHz・モノラル・96kbps。もとの音声と おなじ形式）。
ffmpeg が 必要です。

クレジット「VOICEVOX:ずんだもん」の 表記が 必要です（メニュー画面の下に 表示しています）。
"""

import json
import os
import subprocess
import sys
import tempfile
import time
import urllib.parse
import urllib.request

ENGINE = os.environ.get('VOICEVOX_URL', 'http://127.0.0.1:50021')
SPEAKER = int(os.environ.get('VOICEVOX_SPEAKER', '3'))  # ずんだもん ノーマル
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', '..', 'source', 'src', 'assets', 'voice', 'shoot'))


def post(path: str, body: bytes | None = None, ctype: str = 'application/json') -> bytes:
    req = urllib.request.Request(ENGINE + path, data=body or b'', method='POST', headers={'Content-Type': ctype})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def wait_engine():
    for _ in range(120):
        try:
            with urllib.request.urlopen(ENGINE + '/version', timeout=5) as r:
                print('VOICEVOX engine', r.read().decode())
                return
        except Exception:
            time.sleep(2)
    sys.exit('VOICEVOX エンジンに つながりません: ' + ENGINE)


def main():
    wait_engine()
    lines: dict[str, str] = json.load(open(os.path.join(HERE, 'lines.json'), encoding='utf-8'))
    os.makedirs(OUT, exist_ok=True)
    for name, text in lines.items():
        q = json.loads(post(f'/audio_query?speaker={SPEAKER}&text=' + urllib.parse.quote(text)))
        # こどもに ききとりやすいよう、すこし ゆっくり・まえうしろの むおんを みじかく
        q['speedScale'] = 0.95
        q['prePhonemeLength'] = 0.05
        q['postPhonemeLength'] = 0.1
        wav = post(f'/synthesis?speaker={SPEAKER}', json.dumps(q).encode())
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            f.write(wav)
            tmp = f.name
        dst = os.path.join(OUT, name + '.mp3')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ar', '24000', '-ac', '1', '-b:a', '96k', dst], check=True)
        os.unlink(tmp)
        print(name, text)
    print(len(lines), 'files ->', OUT)


if __name__ == '__main__':
    main()
