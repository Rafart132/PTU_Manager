import os,json,re,fitz
from pathlib import Path
root=Path(__file__).parent
raw=json.loads((root/'catalog-raw.json').read_text())
pdf=fitz.open(os.environ['PTU_CORE_PDF'])
# Class membership follows page ranges, not text extraction order.
classes=[x for x in raw if x['kind']=='class']
starts={x['name']:x['page'] for x in classes}; starts['Style Expert']=114
recipes={132,133,138}; recipe_names={'Restorative Science','Super Cures','Hyper Cures','Performance Enhancers','Focus Gem','Chakra Crystal','Rainbow Gem','Enhancers','Pester Balls (Disorient)','Pester Balls (Pain)','Pester Balls (Shut Down)'}
translations={
'Ace Trainer':('Entrenador experto','Entrena una estadística de cada Pokémon: su etapa habitual pasa a +1 hasta el descanso extendido.'),
'Capture Specialist':('Especialista en captura','Obtienes dos técnicas de captura que cumplan sus requisitos.'),
'Commander':('Comandante','Obtienes una de cinco órdenes avanzadas sin necesitar sus requisitos.'),
'Coordinator':('Coordinador','Tus Pokémon pueden repetir una tirada de exhibición o daño, con límites por concurso y escena.'),
'Hobbyist':('Aficionado','Obtienes tres ventajas de habilidad cuyos requisitos cumplas.'),
'Mentor':('Mentor','Enseña movimientos naturales a tus Pokémon usando puntos de tutor y dos habilidades de mentor.'),
'Cheerleader':('Animador','Tus efectos de apoyo conceden estados de ánimo que ayudan a tus aliados.'),
'Duelist':('Duelista','Marca a un enemigo; tu Pokémon aprovecha el ímpetu acumulado para mejorar precisión y evasión contra él.'),
'Enduring Soul':('Alma resistente','Permite aumentar la estadística HP de tus Pokémon al subir de nivel ignorando la relación de estadísticas base.'),
'Juggler':('Malabarista','Quick Switch cuesta solo 1 PA; los Pokémon que envías obtienen +10 de iniciativa durante esa ronda.'),
'Rider':('Jinete','Al montar un Pokémon con Agility Training, duplicas los beneficios de ese entrenamiento.'),
'Taskmaster':('Entrenador severo','Endurece a tus Pokémon mediante lesiones y concede beneficios según cuántas tengan.'),
'Trickster':('Embaucador','Tras cumplir el desencadenante, tu Pokémon puede usar una maniobra Dirty Trick o Manipulate como acción gratuita.'),
'Stat Ace':('Especialista en estadística','Refuerza una estadística base elegida de tus Pokémon y permite desarrollarla ignorando la relación base.'),
'Style Expert':('Experto en estilo','Tus Pokémon obtienen +2d6 en una estadística de concurso elegida; cuentan como dados de Pokochos.'),
'Type Ace':('Especialista de tipo','Enseña Last Chance o Type Strategist del tipo elegido a un Pokémon a cambio de puntos de tutor.'),
'Chef':('Cocinero','Desbloquea recetas para preparar alimentos y beneficios para el grupo.'),
'Chronicler':('Cronista','Registra Pokémon, personas, movimientos o lugares en archivos que conceden ventajas al consultarlos.'),
'Fashionista':('Estilista','Desbloquea recetas de accesorios, vestuario e incienso mediante sus rasgos.'),
'Researcher':('Investigador','Elige dos campos de investigación y recibe un rasgo de uno de esos campos cuyos requisitos cumplas.'),
'Survivalist':('Superviviente','Domina terrenos: obtiene Naturewalk y bonificaciones a habilidades en los entornos elegidos.'),
'Athlete':('Atleta','Tras una hora de ejercicio, entrena dos estadísticas propias distintas de HP: su etapa habitual es +1.'),
'Dancer':('Bailarín','Obtienes Spinning Dance u Own Tempo; tus rasgos posteriores desarrollan bailes y apoyo.'),
'Hunter':('Cazador','Obtienes Teamwork o Pack Hunt para luchar coordinadamente con tu Pokémon.'),
'Martial Artist':('Artista marcial','Elige un estilo que concede una habilidad y una mejora de estadística por cada rasgo de esta clase.'),
'Musician':('Músico','Usa canciones al actuar, bailar o realizar movimientos sónicos para afectar a aliados o enemigos.'),
'Provocateur':('Provocador','Aprendes Sweet Kiss y Taunt; especialidad en manipulación y movimientos sociales.'),
'Rogue':('Pícaro','Aprendes Feint Attack y Thief; especialidad en combate engañoso y juego sucio.'),
'Roughneck':('Matón','Reduce una etapa de combate del enemigo cuando se cumple el desencadenante de la clase.'),
'Tumbler':('Acróbata de combate','Obtienes Run Away; sus rasgos desarrollan movilidad y combate ágil.'),
'Aura Guardian':('Guardián del aura','Aprendes dos movimientos entre Detect, Vacuum Wave y Force Palm.'),
'Channeler':('Canalizador','Conecta con Pokémon para compartir intenciones, emociones e información a través del vínculo.'),
'Hex Maniac':('Hechicero de maldiciones','Obtienes Cursed Body u Omen; sus rasgos desarrollan maldiciones y debilitamientos.'),
'Ninja':('Ninja','Aprendes Double Team y Poison Powder; sus rasgos añaden ilusiones, venenos y trampas.'),
'Oracle':('Oráculo','Obtienes Pickup y accedes a una progresión de adivinación y percepción sobrenatural.'),
'Sage':('Sabio','Concede reducción de daño a un aliado durante una ronda completa.'),
'Telekinetic':('Telequinético','Obtienes la capacidad Telekinetic para manipular objetos a distancia.'),
'Telepath':('Telépata','Activa Telepathy durante la escena para comunicarte mentalmente.'),
'Warper':('Distorsionador','Obtienes Probability Control; sus rasgos desarrollan teletransporte y distorsión del espacio.'),
'Perseverance':('Perseverancia','Gasta 1 PA para evitar una lesión de tu Pokémon, una vez por escena y objetivo.'),
'Elite Trainer':('Entrenador de élite','Obtienes otro entrenamiento y puedes aplicar dos entrenamientos diferentes a cada Pokémon.'),
'Critical Moment':('Momento crítico','Triplica los beneficios de entrenamiento del objetivo hasta el final de tu próximo turno.'),
'Top Percentage':('Lo mejor de lo mejor','Concede puntos de tutor adicionales cuando tu Pokémon alcanza niveles múltiplos de 5, con límite por Pokémon.'),
'Signature Technique':('Técnica distintiva','Modifica un movimiento de tu Pokémon gastando puntos de tutor.'),
'Champ in the Making':('Futuro campeón','Ace Trainer puede entrenar dos estadísticas por Pokémon en lugar de una.'),
'Mobilize':('Movilizar','Un aliado no provoca ataques de oportunidad en su siguiente turno; una vez por encuentro y aliado.'),
'Leadership':('Liderazgo','Tus órdenes con objetivo pueden dirigirse a cualquier aliado, respetando las demás condiciones.'),
'Battle Conductor':('Director de batalla','Añade hasta dos aliados a una orden a voluntad; paga los costes de PA por cada objetivo.'),
'Tip the Scales':('Inclinar la balanza','Tus órdenes a voluntad afectan a todos los aliados a 10 metros al activar este rasgo.'),
'Scheme Twist':('Giro del plan','Añade hasta dos aliados a órdenes de frecuencia diaria o por escena.'),
'Dilettante':('Diletante','Cada rango concede una ventaja y un rasgo de listas concretas, con excepciones a los requisitos de habilidad.'),
'Dabbler':('Versátil','Mejora las recompensas de los hitos de nivel 5, 10, 20, 30 y 40, con efecto retroactivo.'),
'Look and Learn':('Observar y aprender','Aprende dos rasgos concretos de otras clases mediante sus listas y requisitos especiales.'),
'Lessons':('Lecciones','Desbloquea las lecciones de Mentor cuyos requisitos cumplas.'),
'Expand Horizons':('Ampliar horizontes','Concede 3 puntos de tutor a un Pokémon; solo una vez por Pokémon.'),
'Guidance':('Guía','Aumenta en uno el límite base de movimientos conocidos de tus Pokémon.'),
'Move Tutor':('Tutor de movimientos','Enseña un movimiento de la lista de tutor del Pokémon a cambio de 2 puntos de tutor.'),
'Egg Tutor':('Tutor de movimientos huevo','Enseña un movimiento huevo a cambio de 2 puntos de tutor, una vez por Pokémon.'),
'Lifelong Learning':('Aprendizaje permanente','Hasta cuatro movimientos de tus Pokémon pueden provenir de MT o tutor.'),
'Basic Skills':('Habilidades básicas','Sube una habilidad de Patético a Sin entrenar o de Sin entrenar a Novato.'),
'Adept Skills':('Habilidades competentes','Sube una habilidad de Novato a Competente.'),
'Expert Skills':('Habilidades expertas','Sube una habilidad de Competente a Experto.'),
'Master Skills':('Habilidades maestras','Sube una habilidad de Experto a Maestro.'),
'Skill Stunt':('Especialidad de habilidad','En una aplicación concreta de una habilidad, puedes tirar un dado menos y añadir +6; acuerda la especialidad con el director.'),
'Skill Enhancement':('Mejora de habilidades','Elige dos habilidades distintas: +2 a sus pruebas; no se acumula en una misma habilidad.'),
'Categoric Inclination':('Afinidad de categoría','Elige Cuerpo, Mente o Espíritu: +1 a las pruebas de todas las habilidades de esa categoría.'),
'Virtuoso':('Virtuoso','Una habilidad maestra cuenta como rango 8 para efectos que dependen del rango.'),
'Elemental Connection':('Conexión elemental','Elige un tipo elemental; concede afinidad y acceso a opciones relacionadas. Excluye Mystic Senses.'),
'Mystic Senses':('Sentidos místicos','Usa Intuition en lugar de Charm para mejorar la disposición de Pokémon. Excluye Elemental Connection.'),
'Basic Martial Arts':('Artes marciales básicas','Mejora los ataques Struggle desarmados según el rango de Combat.'),
'Swimmer':('Nadador','Mejora tu capacidad de nadar y desenvolverte bajo el agua.'),
'Acrobat':('Acróbata','Mejora tus saltos y maniobras acrobáticas según el texto del rasgo.'),
'Power Boost':('Potencia adicional','Aumenta en 2 tu capacidad Power.'),
'Throwing Masteries':('Maestría de lanzamiento','Aumenta en 2 metros el alcance para lanzar Poké Balls, armas y objetos pequeños.'),
'Quick Switch':('Cambio rápido','Gasta 2 PA para cambiar de Pokémon con una acción gratuita sin perder el turno de Pokémon.'),
'Agility Training':('Entrenamiento ágil','El Pokémon gana +1 a movimiento y +4 a iniciativa mientras se aplica el entrenamiento.'),
'Brutal Training':('Entrenamiento brutal','El Pokémon gana +1 al rango de crítico y al rango de efectos mientras se aplica el entrenamiento.'),
'Focused Training':('Entrenamiento enfocado','El Pokémon gana +1 a precisión y +2 a pruebas de habilidad mientras se aplica el entrenamiento.'),
'Inspired Training':('Entrenamiento inspirado','El Pokémon gana +1 a evasión y +2 a salvaciones mientras se aplica el entrenamiento.'),
'Let Me Help You With That':('Déjame ayudarte','Permite a un entrenador aliado repetir una prueba fallida con una bonificación basada en tu habilidad.'),
'First Aid Expertise':('Experto en primeros auxilios','Con un botiquín, cura una lesión, todos los PV y estados; límites diarios por objetivo.'),
'Walk It Off':('Recuperarse andando','Al tomar un respiro puedes drenar PA para recuperar PV y tratar una lesión según el efecto.'),
}
# Correct grouping and distinguish granted techniques/recipes from paid features.
for x in raw:
 if x['page']>=75:x['group']=max((n for n,p in starts.items() if p<=x['page']),key=lambda n:starts[n])
 if x['page'] in recipes or x['name'] in recipe_names or x['page']==79 or x['page']==89:x['kind']='reference'
 x['effect']=re.sub(r'-\n(?=[a-z])','',x['effect'])
 x['effect']=re.sub(r'(?<!\n)\n(?!\n)',' ',x['effect'])
 x['requirements']=x['requirements'].replace('Survial','Survival').replace('Athlet- ics','Athletics').replace('Ath- letics','Athletics').replace('Type-Linked Still','Type-Linked Skill')
 if x['name'] in translations:x['label'],x['summary']=translations[x['name']]
 else:
  x['label']=x['name']
  e=x['effect'];m=re.match(r'You (?:learn|gain) the Moves? (.+?)(?:\.|$)',e)
  if m:x['summary']='Aprendes: '+m[1]+'.'
  else:
   m=re.match(r'You gain the (.+?) (?:Ability|Capability)',e)
   x['summary']=('Obtienes '+m[1]+'.') if m else re.split(r'(?<=[.!?])\s',e)[0]
 x['summaryLanguage']='es' if x['name'] in translations or x['summary'].startswith(('Aprendes:','Obtienes ')) else 'en'
# Explicit bonuses are mechanical; keep raw text and original page available.
(root/'catalog.json').write_text(json.dumps(raw,ensure_ascii=False))
(root/'sources.json').write_text(json.dumps({str(n):pdf[n-1].get_text() for n in range(12,196)},ensure_ascii=False))
print('Prepared',len(raw),'entries and',len(classes),'classes')
