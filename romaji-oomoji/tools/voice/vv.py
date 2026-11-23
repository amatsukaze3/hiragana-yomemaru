import json, urllib.request, urllib.parse
ENGINE = 'http://127.0.0.1:50021'
def post(path, body=None):
    req = urllib.request.Request(ENGINE + path, data=body or b'', method='POST', headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=300) as r:
        return r.read()
def query(text, sid):
    return json.loads(post(f'/audio_query?speaker={sid}&text=' + urllib.parse.quote(text)))
def synth(q, sid):
    return post(f'/synthesis?speaker={sid}', json.dumps(q).encode())
