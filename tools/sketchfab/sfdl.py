import json,urllib.request,os,sys
op=urllib.request.build_opener(); op.addheaders=[("User-Agent","khelaghor-asset-fetch/1.0")]; urllib.request.install_opener(op)
fleet=json.load(open('fleet.json')); meta={}
for k,u in fleet.items():
    m=json.load(urllib.request.urlopen('https://api.sketchfab.com/v3/models/'+u))
    meta[k]=dict(uid=u,name=m['name'],author=m['user'].get('displayName') or m['user']['username'],user=m['user']['username'],url=m['viewerUrl'],lic=(m.get('license') or {}).get('label'),faces=m.get('faceCount'))
    dst=f'raw/{k}.glb'
    if os.path.exists(dst): continue
    d=json.load(urllib.request.urlopen('https://api.sketchfab.com/v3/models/'+u+'/download'))
    if 'glb' not in d: print('no glb',k,list(d)); continue
    print(k, d['glb']['size']//1e6,'MB', flush=True)
    urllib.request.urlretrieve(d['glb']['url'], dst)
json.dump(meta,open('meta.json','w'),ensure_ascii=False,indent=1)
