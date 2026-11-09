import json,sys,urllib.request,io
from PIL import Image, ImageDraw
op=urllib.request.build_opener(); op.addheaders=[("User-Agent","khelaghor-asset-search/1.0")]; urllib.request.install_opener(op)
uids=sys.argv[2:]; tiles=[]; meta={}
for u in uids:
    try: m=json.load(urllib.request.urlopen('https://api.sketchfab.com/v3/models/'+u))
    except Exception as e: print('skip',u,e); continue
    meta[u]=dict(name=m['name'],user=m['user']['username'],userName=m['user'].get('displayName'),lic=(m.get('license') or {}).get('label'),faces=m.get('faceCount'),url=m.get('viewerUrl'))
    th=sorted(m['thumbnails']['images'],key=lambda i:abs(i['width']-320))[0]['url']
    im=Image.open(io.BytesIO(urllib.request.urlopen(th).read())).convert('RGB').resize((320,180))
    d=ImageDraw.Draw(im); d.rectangle((0,0,320,16),fill=(0,0,0)); d.text((3,2),(u[:6]+' '+m['name'])[:48],fill=(255,255,0)); tiles.append(im)
W=Image.new('RGB',(320*4,180*((len(tiles)+3)//4)))
for i,t in enumerate(tiles): W.paste(t,((i%4)*320,(i//4)*180))
W.save(sys.argv[1]); json.dump(meta,open(sys.argv[1]+'.json','w'),ensure_ascii=False,indent=1)
