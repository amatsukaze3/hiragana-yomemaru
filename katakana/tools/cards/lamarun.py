import os
import numpy as np, cv2
# https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models/inpainting_lama/inpainting_lama_2025jan.onnx
net = cv2.dnn.readNetFromONNX(os.environ.get('LAMA_ONNX', 'inpainting_lama_2025jan.onnx'))

def lama(img_bgr, mask):
    """img_bgr: SxS uint8, mask: SxS uint8 (255 = fill). returns SxS uint8 BGR"""
    S = img_bgr.shape[0]
    ib = cv2.dnn.blobFromImage(img_bgr, 1/255.0, (512, 512), (0, 0, 0), False, False)
    mb = cv2.dnn.blobFromImage(mask, 1.0, (512, 512), (0,), False, False)
    mb = (mb > 0).astype(np.float32)
    net.setInput(ib, 'image'); net.setInput(mb, 'mask')
    out = net.forward()[0].transpose(1, 2, 0)
    out = np.clip(out, 0, 255).astype(np.uint8)
    return cv2.resize(out, (S, S), interpolation=cv2.INTER_CUBIC)

def inpaint_region(bgr, mask, bb, margin=70):
    H, W = mask.shape
    x0, y0, x1, y1 = bb
    cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    S = max(x1 - x0, y1 - y0) + 2 * margin
    X0, Y0 = cx - S // 2, cy - S // 2
    big = cv2.copyMakeBorder(bgr, S, S, S, S, cv2.BORDER_CONSTANT, value=(255, 255, 255))
    bm = cv2.copyMakeBorder(mask, S, S, S, S, cv2.BORDER_CONSTANT, value=0)
    crop = big[Y0 + S:Y0 + 2 * S, X0 + S:X0 + 2 * S].copy()
    cm = bm[Y0 + S:Y0 + 2 * S, X0 + S:X0 + 2 * S].copy()
    res = lama(crop, cm)
    soft = cv2.GaussianBlur(cm.astype(np.float32) / 255, (0, 0), 1.2)
    soft = np.maximum(soft, (cm > 0).astype(np.float32))[..., None]
    comp = (res * soft + crop * (1 - soft)).astype(np.uint8)
    big[Y0 + S:Y0 + 2 * S, X0 + S:X0 + 2 * S] = comp
    return big[S:S + H, S:S + W]
