"""
ホ（ホットケーキ）だけは、文字の下の 線が こみいっていて AI の うめかたでは きれいに ならないので、
ホットケーキの 線（いちばん下の ふちに あわせた だ円）を 計算して かきなおす。シロップは けして、バターは LaMa の けっかを つかう。
（finalize.py は fix/<もじ>.png が あれば それを つかう）
"""
import sys
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, '.')
from pipeline import letter_core

a = np.array(Image.open('src/ho.png').convert('RGB'))
bgr = cv2.cvtColor(a, cv2.COLOR_RGB2BGR); A = cv2.imread('clean_a/ho.png')
H, W = bgr.shape[:2]
B_, G_, R_ = [bgr[..., i].astype(int) for i in range(3)]
brown = (R_ > 140) & (R_ - B_ > 60) & (G_ < 170)
core = letter_core(a, 'ho'); mask = cv2.dilate(core.astype(np.uint8) * 255, np.ones((15, 15), np.uint8)) > 0
col = np.median(bgr[brown & ~mask], axis=0)
f = lambda x, yc, B, xc, A_: yc + B * np.sqrt(np.clip(1 - ((x - xc) / A_) ** 2, 0, None))
P = [510.97856178, 180.89636685, 691.25042465, 400.53263771]  # いちばん下の ふち（curve_fit で もとめた）
X = np.arange(W); base = f(X, *P)
yy, xx = np.mgrid[0:H, 0:W]
xc, yc, ax, by = 691, 219, 373, 139  # 上の 面の だ円
top_inner = yc - (by - 21) * np.sqrt(np.clip(1 - ((X - xc) / (ax - 21)) ** 2, 0, None))
inside = (xx >= 400) & (xx <= 992) & (yy > top_inner[None, :]) & (yy < base[None, :] - 21)
butter = (xx >= 583) & (xx <= 800) & (yy >= 40) & (yy <= 238)
canvas = bgr.copy(); canvas[mask] = 255; canvas[inside & ~butter] = 255; canvas[butter] = A[butter]
layer = np.zeros((H, W), np.uint8)
for off in [112.1, 224.8, 332.9]:  # 下の ふちから 3まいぶんの さかいめ（左右の 見えている 線から はかった）
    pts = np.array([[x, base[x] - off] for x in range(300, 1090)], np.float32)
    cv2.polylines(layer, [np.round(pts * 16).astype(np.int32)], False, 255, thickness=38, lineType=cv2.LINE_AA, shift=4)
alpha = ((layer.astype(np.float32) / 255) * ((inside | mask) & ~butter))[..., None]
cv2.imwrite('fix/ho.png', (canvas * (1 - alpha) + col * alpha).astype(np.uint8))
