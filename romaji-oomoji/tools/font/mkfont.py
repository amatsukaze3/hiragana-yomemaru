"""
ローマ字フローラちゃん おおもじ の フォント（AndikaRoma）を つくる
- Andika 700（@fontsource/andika）の 大文字 I を、セリフ（上下の よこぼう）の ない 1本の たて線に する（小学校の 大文字と おなじ 形）
- I を つかう 合成文字（Ī など）も はばを あわせる
- latin（A〜Z など）と、のばす 音の Ā Ē Ī Ō Ū ā ē ī ō ū だけの ファイルを つくる
    cd romaji-oomoji/source && npm install && python3 ../tools/font/mkfont.py
    → src/assets/fonts/andika-oomoji-latin-700.woff2・andika-oomoji-macron-700.woff2
fontTools・brotli が 必要（pip install fonttools brotli）
"""
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.recordingPen import RecordingPen
import sys
import os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, '..', '..', 'source'))
base = os.path.join(SRC, 'node_modules', '@fontsource', 'andika', 'files') + os.sep
OUT = os.path.join(SRC, 'src', 'assets', 'fonts')
os.makedirs(OUT, exist_ok=True)
# H の たての線の ふとさ（x が いちばん ひだりの 点から 内がわの 点まで）
f0 = TTFont(base + 'andika-latin-700-normal.woff2')
coords = f0['glyf']['H'].getCoordinates(f0['glyf'])[0]
xs = sorted(set(round(x) for x, y in coords))
print('H xs', xs)
stem = 300  # 150 → 450（かどの まるみの 点を のぞく）
print('stem', stem)
LSB = 160
for fn, out in [('andika-latin-700-normal.woff2', 'andika-oomoji-latin-700.woff2'), ('andika-latin-ext-700-normal.woff2', 'andika-oomoji-latin-ext-700.woff2')]:
    out = os.path.join(OUT, out)
    f = TTFont(base + fn)
    glyf = f['glyf']
    pen = TTGlyphPen(None)
    pen.moveTo((LSB, 0)); pen.lineTo((LSB, 1460)); pen.lineTo((LSB + stem, 1460)); pen.lineTo((LSB + stem, 0)); pen.closePath()
    g = pen.glyph()
    glyf['I'] = g
    g.recalcBounds(glyf)
    adv = stem + 2 * LSB
    f['hmtx']['I'] = (adv, LSB)
    # 合成グリフ（Ī など）の はばも I に あわせる（I を つかう 合成は はば・位置を そろえる）
    old_adv = 1045
    for name in f.getGlyphOrder():
        gl = glyf[name]
        if gl.isComposite() and gl.components[0].glyphName == 'I':
            dx = (adv - old_adv) / 2
            for c in gl.components[1:]:
                c.x = round(c.x + dx)
            f['hmtx'][name] = (adv, LSB)
            gl.recalcBounds(glyf)
            print('fix', name)
    # ヒントの 命令は I では つかわない
    for t in ['hdmx', 'LTSH', 'VDMX']:
        if t in f: del f[t]
    f['name'].setName('AndikaRoma', 1, 3, 1, 0x409)
    f.flavor = 'woff2'
    f.save(out)
    print('saved', out)

# latin-ext は のばす 音の 文字だけに する（ほかは つかわない）
from fontTools import subset
ext = os.path.join(OUT, 'andika-oomoji-latin-ext-700.woff2')
opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']; opts.name_IDs = ['*']; opts.notdef_outline = True
f = TTFont(ext)
sub = subset.Subsetter(opts); sub.populate(unicodes=[ord(c) for c in 'ĀĒĪŌŪāēīōū']); sub.subset(f)
f.flavor = 'woff2'
f.save(os.path.join(OUT, 'andika-oomoji-macron-700.woff2'))
os.remove(ext)
print('saved macron')
