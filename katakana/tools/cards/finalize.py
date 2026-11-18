import json, os, sys
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi
SRCDIR = sys.argv[1] if len(sys.argv) > 1 else 'clean_a'
OUT = 'final'; os.makedirs(OUT, exist_ok=True)
meta = json.load(open(f'{SRCDIR}/letters.json'))
CW, CH = 1000, 760
PAD = 0.045
pos = {}
for k, lb in sorted(meta.items()):
    p = f'fix/{k}.png' if os.path.exists(f'fix/{k}.png') else f'{SRCDIR}/{k}.png'
    b = cv2.imread(p)
    mask = cv2.imread(f'{SRCDIR}/{k}_mask.png', 0)
    H, W = mask.shape
    # 文字の あった ところの うすい かげを まっしろに
    if k != 'no':
        near = cv2.dilate(mask, np.ones((15, 15), np.uint8)) > 0
        mx = b.max(2).astype(int); mn = b.min(2).astype(int)
        b[near & (mn > 212) & ((mx - mn) < 20)] = 255
    if k == 'ki':
        hsv = cv2.cvtColor(b, cv2.COLOR_BGR2HSV)
        g = (hsv[..., 1] > 40) & (hsv[..., 0] > 30) & (hsv[..., 0] < 90)
        lab, n = ndi.label(g); sz = ndi.sum(g, lab, range(1, n + 1))
        keep = ndi.binary_fill_holes(lab == (np.argmax(sz) + 1))
        keep = cv2.dilate(keep.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
        b[~keep] = 255
    # 絵の はんい（白でない ところ。右下の 透かしは のぞく）
    d = 255 - b.min(2).astype(int)
    ink = d > 28
    ink[int(H * 0.93):, int(W * 0.85):] = False
    lab, n = ndi.label(ink); sz = ndi.sum(ink, lab, range(1, n + 1))
    ink = np.isin(lab, [i + 1 for i in range(n) if sz[i] > 60])
    ys, xs = np.where(ink)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    bw, bh = x1 - x0, y1 - y0
    s = min(CW * (1 - 2 * PAD) / bw, CH * (1 - 2 * PAD) / bh)
    crop = cv2.cvtColor(b[y0:y1, x0:x1], cv2.COLOR_BGR2RGB)
    im = Image.fromarray(crop).resize((round(bw * s), round(bh * s)), Image.LANCZOS)
    card = Image.new('RGB', (CW, CH), 'white')
    ox, oy = (CW - im.width) // 2, (CH - im.height) // 2
    card.paste(im, (ox, oy))
    lx = ((lb[0] + lb[2]) / 2 - x0) * s + ox
    ly = ((lb[1] + lb[3]) / 2 - y0) * s + oy
    pos[k] = {'cx': round(lx / CW * 100, 1), 'cy': round(ly / CH * 100, 1), 'h': round((lb[3] - lb[1]) * s / CH * 100, 1)}
    card.resize((800, 608), Image.LANCZOS).save(f'{OUT}/{k}.webp', quality=88, method=6)
    card.save(f'{OUT}/{k}_full.png')
json.dump(pos, open(f'{OUT}/pos.json', 'w'), indent=0)
print(len(pos))
