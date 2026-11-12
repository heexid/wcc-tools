import json,sys,re
d=json.load(open(sys.argv[1]))
rows=[];stats={'passed':0,'failed':0,'skipped':0}
def walk(s):
  for sp in s.get('specs',[]):
    for t in sp['tests']:
      r=t['results'][-1]; st=r['status']; stats[st if st in stats else 'failed']+=1
      ann={a['type']:a.get('description','') for a in t.get('annotations',[])+r.get('annotations',[])}
      if st not in('passed','skipped'):
        err=re.sub(r'\x1b\[[0-9;]*m','',(r.get('error') or {}).get('message',''))[:110].replace('\n',' ')
        rows.append(f"{sp['title'][:58]:58} {ann.get('G2','')[:36]:36} G3 {ann.get('G3','') or err}")
  for c in s.get('suites',[]): walk(c)
for s in d['suites']: walk(s)
print(stats); print('\n'.join(rows))
