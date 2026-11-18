import numpy as np, cv2
from scipy import ndimage as ndi

def letter_mask(a, dark_thr=110, sat_thr=45):
    """a: HxWx3 uint8 RGB. returns (core_mask, bbox) of the black letter"""
    H, W = a.shape[:2]
    mx = a.max(2).astype(int); mn = a.min(2).astype(int)
    dark = (mx < dark_thr) & ((mx - mn) < sat_thr)
    dark[int(H*0.93):, int(W*0.85):] = False  # watermark
    lab, n = ndi.label(dark)
    if n == 0: return None, None
    sizes = ndi.sum(dark, lab, range(1, n+1))
    objs = ndi.find_objects(lab)
    big = [i for i in range(n) if sizes[i] > 1500]
    x0 = min(objs[i][1].start for i in big); x1 = max(objs[i][1].stop for i in big)
    y0 = min(objs[i][0].start for i in big); y1 = max(objs[i][0].stop for i in big)
    m = 12
    keep = np.zeros(n + 1, bool)
    for i in range(n):
        sl = objs[i]
        if sizes[i] < 15: continue
        if sl[1].stop > x0 - m and sl[1].start < x1 + m and sl[0].stop > y0 - m and sl[0].start < y1 + m:
            keep[i + 1] = True
    core = keep[lab]
    ys, xs = np.where(core)
    return core, (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
