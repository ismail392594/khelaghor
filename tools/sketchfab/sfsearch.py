import json,sys,urllib.request,urllib.parse,os
op=urllib.request.build_opener(); op.addheaders=[("User-Agent","khelaghor-asset-search/1.0")]; urllib.request.install_opener(op)
qs=sys.argv[1:]; out=[]
for q in qs:
    u="https://api.sketchfab.com/v3/search?"+urllib.parse.urlencode({"type":"models","q":q,"downloadable":"true","count":12,"sort_by":"-likeCount"})
    d=json.load(urllib.request.urlopen(u))
    for m in d.get('results',[]):
        lic=(m.get('license') or {}).get('label','')
        if lic not in ('CC Attribution','CC0 Public Domain'): continue
        th=sorted(m['thumbnails']['images'],key=lambda i:abs(i['width']-256))[0]['url']
        out.append(dict(q=q,uid=m['uid'],name=m['name'],lic=lic,faces=m.get('faceCount'),user=m['user']['username'],th=th))
json.dump(out,open('cands.json','w'),ensure_ascii=False,indent=0)
for o in out: print(o['uid'][:8],o['q'][:14],'|',o['name'][:40],'|',o['faces'],'|',o['user'])
