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


def get(path: str) -> bytes:
    with urllib.request.urlopen(ENGINE + path, timeout=60) as r:
        return r.read()


def find_style(speakers: list, name: str, style: str | None) -> tuple[int, dict]:
    """キャラクター名（とスタイル名）から speaker（スタイル）ID を さがす"""
    for sp in speakers:
        if sp['name'] == name:
            styles = sp['styles']
            st = next((x for x in styles if style and x['name'] == style), styles[0])
            return st['id'], sp
    names = ', '.join(s['name'] for s in speakers)
    sys.exit(f'キャラクター「{name}」が このエンジンに ありません。つかえる キャラクター: {names}')


def main():
    wait_engine()
    # lines.json の あたいは 文字列（ずんだもん）か {"text": ..., "speaker": "キャラクター名", "style": "スタイル名"}
    lines: dict = json.load(open(os.path.join(HERE, 'lines.json'), encoding='utf-8'))
    speakers = json.loads(get('/speakers'))
    os.makedirs(OUT, exist_ok=True)
    used: dict[str, dict] = {}
    for name, item in lines.items():
        if isinstance(item, str):
            text, sid = item, SPEAKER
        else:
            text = item['text']
            sid, sp = find_style(speakers, item['speaker'], item.get('style'))
            used[sp['name']] = sp
        q = json.loads(post(f'/audio_query?speaker={sid}&text=' + urllib.parse.quote(text)))
        # こどもに ききとりやすいよう、すこし ゆっくり・まえうしろの むおんを みじかく
        q['speedScale'] = 0.95
        q['prePhonemeLength'] = 0.05
        q['postPhonemeLength'] = 0.1
        wav = post(f'/synthesis?speaker={sid}', json.dumps(q).encode())
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
            f.write(wav)
            tmp = f.name
        dst = os.path.join(OUT, name + '.mp3')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ar', '24000', '-ac', '1', '-b:a', '96k', dst], check=True)
        os.unlink(tmp)
        print(name, sid, text)
    # ずんだもん いがいの キャラクターの 利用規約を のこす（クレジット表記などの 確認用）
    for nm, sp in used.items():
        info = json.loads(get('/speaker_info?speaker_uuid=' + sp['speaker_uuid']))
        with open(os.path.join(HERE, f'terms_{sp["speaker_uuid"][:8]}.md'), 'w', encoding='utf-8') as f:
            f.write(f'# {nm} の 利用規約（VOICEVOX エンジン {get("/version").decode()} の speaker_info より）\n\n')
            f.write('スタイル: ' + ', '.join(f"{x['name']}({x['id']})" for x in sp['styles']) + '\n\n')
            f.write(info.get('policy', ''))
        print('terms saved for', nm)
    print(len(lines), 'files ->', OUT)


if __name__ == '__main__':
    main()
