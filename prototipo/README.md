# Football Vibration — prototipo funcional (Práctica 2 de IPO)

App móvil accesible para seguir partidos de fútbol con un accesorio háptico, patrones de vibración y audiodescripción. Este prototipo es una **web móvil** en HTML, CSS y JavaScript, sin instalación ni dependencias.

> Es un prototipo: los datos del partido son simulados, no hay Bluetooth real ni servidor. La función «Seguir solo con el móvil» está marcada como **beta**.

## Cómo abrirlo

**Opción A — doble clic.** Abre `index.html` en Chrome o Edge. Funciona tal cual.

**Opción B — servidor local (recomendada para probar en el móvil).** Desde esta carpeta:

```
py -m http.server 8765
```

y abre `http://localhost:8765` en el navegador. Para probarlo en un móvil Android de la misma wifi, abre `http://IP-DEL-ORDENADOR:8765` en Chrome.

Para verlo a tamaño de móvil en el ordenador: F12 → icono de dispositivo → 412 × 915.

## Qué se puede probar

| Tarea | Cómo |
|---|---|
| T1 Configurar el perfil | Al abrir por primera vez: tres preguntas, resumen y guardar. Pulsa «Siguiente» sin elegir para ver la validación. |
| T2 Conectar el accesorio | Inicio → «Conectar accesorio». La primera vez pide elegirlo y confirmar la vibración de prueba. |
| T3 Calibrar y practicar | Tras conectar → «Ajustar vibración y narración» → «Practicar patrones». |
| T4 Partido y entorno | «Elegir partido» → equipo → entorno → «Iniciar seguimiento». |
| T5–T7 Seguir el partido | Pantalla Partido: el partido avanza solo (1 minuto de juego = 2 segundos). Controles rápidos siempre visibles. |
| T8 Ponerse al día | Elige «Sevilla contra Valencia», que ya está en el minuto 34. |
| T9 Fallos de conexión | El partido Atlético–Betis pierde internet en el minuto 70 y lo recupera en el 72. También se puede provocar desde el simulador. |
| T10 Finalizar | «Finalizar sesión» durante el partido (pide confirmación) o al terminar. |

## Simulador del accesorio

El panel con borde discontinuo es una **herramienta de prueba y no forma parte de la app**. Sirve para probar sin hardware:

- Mini campo con la posición del balón y su descripción en texto.
- Registro de los patrones emitidos (origen, evento y valores en milisegundos).
- Botones para lanzar eventos, cortar internet, desconectar el accesorio, simular batería baja o que está apagado.
- «Saltar al siguiente evento» para no esperar, y «Borrar perfil y reiniciar» para volver a empezar.

## Vibración y voz

- **Vibración:** usa `navigator.vibrate()`. Funciona en Chrome para Android. **En iPhone no existe**: los patrones se ven en el registro del simulador. En ordenador tampoco se nota.
- **Voz:** usa la síntesis de voz del navegador (`speechSynthesis`) en español. Si el navegador no tiene voz, el texto aparece en pantalla.
- Los patrones están en `js/patrones.js` y documentados en `../memoria/patrones.md`.

## Estructura

```
index.html                  Estructura fija: barra, aviso de conexión, zona de pantallas, avisos y simulador
css/estilos.css             Dos temas (estándar y alto contraste), tamaños en rem
data/partido-simulado.json  Partidos, eventos y posiciones del balón (simulados)
js/almacen.js               Preferencias (localStorage con try/catch) y estado de la sesión
js/patrones.js              Tabla de patrones y función de vibración
js/voz.js                   Narración, avisos aria-live y lectura del resumen
js/app.js                   Navegación, gestión del foco, validación, diálogos
js/partido.js               Motor del partido: temporizador, eventos, conexión
js/simulador.js             Simulador del accesorio
js/pantallas-*.js           Las 17 pantallas
js/datos-respaldo.js        Copia del JSON para cuando se abre con doble clic
```

Si cambias `data/partido-simulado.json`, regenera la copia desde esta carpeta:

```
node -e "const fs=require('fs');fs.writeFileSync('js/datos-respaldo.js','window.FV_DATOS_RESPALDO = '+JSON.stringify(JSON.parse(fs.readFileSync('data/partido-simulado.json','utf8')),null,1)+';\n')"
```

## Accesibilidad

- HTML semántico, `lang="es"`, un `h1` por pantalla, zonas `header`, `main` y `aside`.
- Todo se maneja con teclado. Al cambiar de pantalla, el foco va al título.
- Confirmaciones en una región `aria-live="polite"`; los fallos de conexión, en `role="alert"`.
- Contraste de texto superior a 7:1 en los dos temas. Botones de 56 px de alto como mínimo.
- Estados con texto e icono, nunca solo con color.
- Respeta `prefers-reduced-motion` y `prefers-contrast`.
- Tipografía: Atkinson Hyperlegible si está instalada en el dispositivo; si no, la del sistema.

## Limitaciones conocidas

- La intensidad de la vibración no se puede regular desde la web; se simula con la opción «Pulsos reforzados».
- No se ha probado todavía con VoiceOver ni TalkBack reales, solo con teclado y revisando el marcado.
- Con el texto en «Muy grande» y además un zoom del 200 % en una pantalla de 412 px puede quedar un pequeño desplazamiento horizontal. Cada ajuste por separado funciona bien.
- El botón «atrás» del móvil hace lo mismo que «Volver»; en Partido pide confirmación antes de salir.

## Iteraciones

- `../prototipo-iteracion1/` conserva el primer prototipo, tal como se evaluó.
- Esta carpeta contiene la Iteración 2. Los cambios están en `../memoria/fase5.md`.
