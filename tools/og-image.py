# খেলার ছবি থেকে হাবের কার্ডের ছবি (icons/shots/<key>.webp) আর শেয়ার ছবি (icons/og/<key>.jpg)
#   python3 tools/og-image.py <key> "<নাম>" "<এক লাইন>" "#রং" <shot.png> <og.png> <BalooDa2.ttf>
import sys
from PIL import Image, ImageDraw, ImageFont
key, name, line, col, shot, og, font = sys.argv[1:8]
Image.open(shot).convert('RGB').save(f'icons/shots/{key}.webp', 'WEBP', quality=72, method=6)
o = Image.open(og).convert('RGB'); d = ImageDraw.Draw(o, 'RGBA'); d.rectangle((0, 470, 1200, 630), fill=(5, 8, 16, 190))
f = ImageFont.truetype(font, 80); f.set_variation_by_name('ExtraBold'); f2 = ImageFont.truetype(font, 36); f2.set_variation_by_name('SemiBold')
c = tuple(int(col[i:i + 2], 16) for i in (1, 3, 5))
d.text((40, 470), name, font=f, fill=c); d.text((44, 575), line, font=f2, fill=(238, 242, 247))
o.save(f'icons/og/{key}.jpg', quality=82); print('ok', key)
