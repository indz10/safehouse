# ferma la compilazione se lo stile usa colori/misure con nomi non definiti (es. var(--red) senza --red)
import re,sys
s=open('app.html',encoding='utf-8').read()
used=set(re.findall(r'var\(\s*(--[a-zA-Z0-9-]+)\s*\)',s));defined=set(re.findall(r'(--[a-zA-Z0-9-]+)\s*:',s))
miss=sorted(u for u in used if u not in defined)
if miss: print('STILE: nomi non definiti',miss);sys.exit(1)
print('stile ok')
