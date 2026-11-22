import soundfile as sf, numpy as np, os, sys, glob
src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
for f in glob.glob(src + '/*.flac'):
    x, sr = sf.read(f, dtype='float32'); assert sr == 48000
    if x.ndim > 1: x = x.mean(1)
    x.astype('<f4').tofile(os.path.join(dst, os.path.basename(f)[:-5] + '.f32'))
print(len(glob.glob(dst + '/*.f32')))
