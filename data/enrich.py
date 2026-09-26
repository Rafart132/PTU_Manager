import os,json,fitz,re
from pathlib import Path
p=Path(__file__).parent;data=json.loads((p/'catalog.json').read_text());pdf=fitz.open(os.environ['PTU_CORE_PDF'])
# Capture techniques without prerequisites are separately granted options.
t=pdf[78].get_text()
names=['Capture Skills','Curve Ball','Devitalizing Throw','Fast Pitch','Snare','Tools of the Trade','Catch Combo','False Strike','Relentless Pursuit']
brief=['Obtienes una mejora de habilidad para Acrobacias, Atletismo, Sigilo, Supervivencia, Astucia o Percepción. Máximo dos veces.','Al impactar con una Poké Ball puedes causar daño de Struggle antes de resolver sus funciones.','Cuando un Pokémon escapa de tu Poké Ball, gasta PA para aplicar uno de tres debilitamientos.','Lanza una Poké Ball inmediatamente con prioridad avanzada, pagando 1 PA.','Resta 10 a las tiradas de captura contra Pokémon atraídos por cebo o retenidos por ciertas herramientas.','Obtienes bonos con Poké Balls, redes, lazos, cañas y señuelos.']
for i,name in enumerate(names[:6]):
 body=t.split(name,1)[1].split(names[i+1],1)[0].strip();id=re.sub('[^a-z0-9]+','-',name.lower()).strip('-')
 data.append(dict(id=id,name=name,label=name,summary=brief[i],summaryLanguage='es',kind='reference',group='Capture Specialist',tags='',requirements='None',usage=body.split('Effect:')[0] if 'Effect:' in body else '',effect=body,page=79))
# Remove extraction examples and verify identity.
assert len(set(e['id'] for e in data))==len(data)
(p/'catalog.json').write_text(json.dumps(data,ensure_ascii=False))
