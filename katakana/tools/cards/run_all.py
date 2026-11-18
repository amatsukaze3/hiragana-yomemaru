import sys, json, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, cv2
from PIL import Image
from pipeline import letter_core, inpaint_chunks
from lamarun import inpaint_region
mode = sys.argv[1]
OUT = f'/home/claude/work/cards/clean_{mode}'
os.makedirs(OUT, exist_ok=True)
keys = [f[:-4] for f in sorted(os.listdir('src')) if f.endswith('.png')]
meta = {}
for k in keys:
    if os.path.exists(f"{OUT}/{k}.png"):
        meta[k] = json.load(open(f"{OUT}/letters.json")).get(k) if os.path.exists(f"{OUT}/letters.json") else None
        if meta[k]: continue
    a = np.array(Image.open(f'src/{k}.png').convert('RGB'))
    core = letter_core(a, k)
    ys, xs = np.where(core)
    lb = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
    mask = cv2.dilate(core.astype(np.uint8) * 255, np.ones((9, 9), np.uint8))
    bgr = cv2.cvtColor(a, cv2.COLOR_RGB2BGR)
    t = time.time()
    if mode == 'a':
        out = inpaint_region(bgr, mask, lb)
    else:
        out, _ = inpaint_chunks(bgr, mask)
    cv2.imwrite(f'{OUT}/{k}.png', out)
    cv2.imwrite(f'{OUT}/{k}_mask.png', mask)
    meta[k] = lb
    json.dump(meta, open(f'{OUT}/letters.json', 'w'))
    print(k, lb, round(time.time() - t, 1), flush=True)
