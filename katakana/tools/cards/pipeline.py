import sys, json, os, time
import numpy as np, cv2
from scipy import ndimage as ndi
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lamarun import lama

SRC = '/home/claude/work/cards/src'
OUT = '/home/claude/work/cards/clean'
os.makedirs(OUT, exist_ok=True)

def letter_core(a, key):
    H, W = a.shape[:2]
    mx = a.max(2).astype(int); mn = a.min(2).astype(int)
    dark = (mx < 110) & ((mx - mn) < 45)
    dark[int(H * 0.93):, int(W * 0.85):] = False
    lab, n = ndi.label(dark)
    sizes = ndi.sum(dark, lab, range(1, n + 1))
    objs = ndi.find_objects(lab)
    cand = [i for i in range(n) if sizes[i] > 1500]
    # 絵の黒い大きな輪（ルーレットの ふち など）は 文字ではない：外枠が 画像の半分より大きいものは のぞく
    def wide(i):
        sl = objs[i]
        return (sl[1].stop - sl[1].start) > W * 0.42 and (sl[0].stop - sl[0].start) > H * 0.75
    big = [i for i in cand if not wide(i)]
    x0 = min(objs[i][1].start for i in big); x1 = max(objs[i][1].stop for i in big)
    y0 = min(objs[i][0].start for i in big); y1 = max(objs[i][0].stop for i in big)
    m = 12
    keep = np.zeros(n + 1, bool)
    for i in range(n):
        sl = objs[i]
        if sizes[i] < 15 or wide(i): continue
        if sl[1].stop > x0 - m and sl[1].start < x1 + m and sl[0].stop > y0 - m and sl[0].start < y1 + m:
            # 小さな黒い点（目など）が 文字の外枠の はしに あるときは、文字に くっついていない 小さいものは のぞく
            if sizes[i] < 400 and not (sl[1].start >= x0 and sl[1].stop <= x1 and sl[0].start >= y0 and sl[0].stop <= y1):
                continue
            keep[i + 1] = True
    core = keep[lab]
    return core

def crop_box(cx, cy, S):
    return cx - S // 2, cy - S // 2

def inpaint_chunks(bgr, mask, tile=230, S=512):
    """mask を こまかい かたまりに わけて、まわりの 512x512（原寸）を見せながら 1つずつ うめる"""
    H, W = mask.shape
    pad = S
    big = cv2.copyMakeBorder(bgr, pad, pad, pad, pad, cv2.BORDER_REPLICATE)
    bm = cv2.copyMakeBorder(mask, pad, pad, pad, pad, cv2.BORDER_CONSTANT, value=0)
    remaining = bm > 0
    calls = 0
    while remaining.any():
        ys, xs = np.where(remaining)
        # いちばん上・左の あたりから、tile x tile の かたまりを とる
        y0 = ys.min(); 
        row = remaining[y0:y0 + tile]
        rx = np.where(row.any(0))[0]
        x0 = rx.min()
        chunk = np.zeros_like(remaining)
        chunk[y0:y0 + tile, x0:x0 + tile] = remaining[y0:y0 + tile, x0:x0 + tile]
        cy_, cx_ = np.mean(np.where(chunk), axis=1).astype(int)
        X0, Y0 = cx_ - S // 2, cy_ - S // 2
        crop = big[Y0:Y0 + S, X0:X0 + S].copy()
        # この かたまり と、まだ うめていない ところ を ぜんぶ マスクに する（のこりの 黒は 見せない）
        cm = (remaining[Y0:Y0 + S, X0:X0 + S]).astype(np.uint8) * 255
        res = lama(crop, cm)
        upd = chunk[Y0:Y0 + S, X0:X0 + S]
        soft = cv2.GaussianBlur(upd.astype(np.float32), (0, 0), 1.0)
        soft = np.maximum(soft, upd.astype(np.float32))[..., None]
        big[Y0:Y0 + S, X0:X0 + S] = (res * soft + crop * (1 - soft)).astype(np.uint8)
        remaining &= ~chunk
        calls += 1
    return big[pad:pad + H, pad:pad + W], calls

def process(key):
    a = np.array(Image.open(f'{SRC}/{key}.png').convert('RGB'))
    core = letter_core(a, key)
    ys, xs = np.where(core)
    lb = [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]
    mask = cv2.dilate(core.astype(np.uint8) * 255, np.ones((9, 9), np.uint8))
    bgr = cv2.cvtColor(a, cv2.COLOR_RGB2BGR)
    t = time.time()
    out, calls = inpaint_chunks(bgr, mask)
    cv2.imwrite(f'{OUT}/{key}.png', out)
    print(key, lb, calls, round(time.time() - t, 1), flush=True)
    return lb

if __name__ == '__main__':
    keys = sys.argv[1:]
    meta = {}
    if os.path.exists(f'{OUT}/letters.json'):
        meta = json.load(open(f'{OUT}/letters.json'))
    for k in keys:
        meta[k] = process(k)
        json.dump(meta, open(f'{OUT}/letters.json', 'w'))
