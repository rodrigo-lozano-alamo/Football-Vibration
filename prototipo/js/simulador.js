/* Simulador del accesorio. HERRAMIENTA DE PRUEBA: no forma parte del producto.
   Permite probar la app sin hardware: muestra la posición del balón, registra los patrones
   emitidos y provoca eventos y fallos. */
(function (FV) {
  'use strict';

  var S = FV.sim = { apagado: false, bluetooth: true };

  function el(id) { return document.getElementById(id); }

  function boton(texto, accion) {
    return '<button type="button" class="btn" data-sim="' + accion + '">' + texto + '</button>';
  }

  /* ---------- Apoyo sonoro de los patrones ----------
     Reproduce cada patrón como pitidos con el mismo ritmo. Sirve para comprobar los patrones
     donde no hay vibración (iPhone, ordenador) o cuando el móvil la tiene desactivada.
     Es una ayuda de prueba: en el producto, los eventos NO suenan, vibran. */
  var audio = null;
  S.sonido = false;

  S.sonar = function (ms) {
    if (!S.sonido || !audio) return;
    var t = audio.currentTime + 0.02;
    ms.forEach(function (duracion, i) {
      if (i % 2 === 0) {
        var oscilador = audio.createOscillator();
        var volumen = audio.createGain();
        oscilador.type = 'triangle';
        oscilador.frequency.value = 330;
        volumen.gain.value = 0.35;
        oscilador.connect(volumen);
        volumen.connect(audio.destination);
        oscilador.start(t);
        oscilador.stop(t + duracion / 1000);
      }
      t += duracion / 1000;
    });
  };

  /* Comprobación directa de la vibración del móvil, sin pasar por la app.
     Explica el resultado y qué revisar en el teléfono si no se nota. */
  function diagnosticar() {
    var salida = el('sim-diagnostico');
    if (!FV.vibracionDisponible) {
      salida.textContent = 'Este navegador no tiene vibración (pasa en iPhone y en ordenador). ' +
        'Activa «Sonido de los patrones» para oír el ritmo de cada patrón.';
      return;
    }
    if (window.self !== window.top) {
      salida.textContent = 'La página está abierta dentro de otra página (un marco). Chrome bloquea ahí la vibración: ' +
        'abre la dirección del prototipo directamente en una pestaña.';
      return;
    }
    var aceptada = false;
    try { aceptada = navigator.vibrate([800, 200, 800]); } catch (e) { aceptada = false; }
    salida.textContent = aceptada
      ? 'El navegador ha aceptado la vibración (dos pulsos largos). Si no la has notado, el móvil la está silenciando. Revisa: ' +
        '1) Ajustes → Sonido y vibración: que la vibración y la «respuesta táctil» estén activadas y con intensidad; ' +
        '2) que el móvil no esté en modo Silencio ni en «No molestar»; ' +
        '3) que el ahorro de batería esté desactivado; ' +
        '4) que uses Chrome y no otro navegador.'
      : 'El navegador ha rechazado la vibración. Toca primero cualquier botón de la app, comprueba que la pestaña está ' +
        'en primer plano y vuelve a probar. Si sigue igual, revisa los permisos del sitio en Chrome.';
  }

  S.iniciar = function () {
    el('sim-contenido').innerHTML =
      '<p class="sim-etiqueta">HERRAMIENTA DE PRUEBA · no forma parte de la app</p>' +
      '<p id="sim-vibra"></p>' +
      '<h3>Comprobar la vibración de este móvil</h3>' +
      '<div class="sim-botones">' +
        boton('Probar vibración del móvil', 'diagnostico') +
        '<button type="button" class="btn" data-sim="sonido" aria-pressed="false">Sonido de los patrones</button>' +
      '</div>' +
      /* role="status": el resultado de la comprobación se anuncia al lector de pantalla. */
      '<p id="sim-diagnostico" role="status"></p>' +
      /* El dibujo del campo es decorativo (aria-hidden): la misma información está en el texto de debajo. */
      '<svg class="sim-campo" viewBox="0 0 100 64" aria-hidden="true" focusable="false">' +
        '<rect class="linea" x="1" y="1" width="98" height="62"/>' +
        '<line class="linea" x1="50" y1="1" x2="50" y2="63"/>' +
        '<circle class="linea" cx="50" cy="32" r="8"/>' +
        '<rect class="linea" x="1" y="16" width="14" height="32"/>' +
        '<rect class="linea" x="85" y="16" width="14" height="32"/>' +
        '<circle id="sim-balon" class="balon" cx="50" cy="32" r="2.5"/>' +
      '</svg>' +
      '<p id="sim-posicion">Balón: sin partido en curso.</p>' +
      '<h3>Lanzar un evento</h3>' +
      '<div class="sim-botones">' +
        boton('Gol', 'gol') + boton('Gol anulado', 'golAnulado') + boton('Falta', 'falta') +
        boton('Córner', 'corner') + boton('Penalti', 'penalti') +
      '</div>' +
      '<h3>Provocar un fallo</h3>' +
      '<div class="sim-botones">' +
        boton('Cortar internet', 'cortar') + boton('Recuperar internet', 'recuperar') +
        boton('Desconectar accesorio', 'desconectar') + boton('Batería baja', 'bateria') +
        '<button type="button" class="btn" data-sim="apagado" aria-pressed="false">Accesorio apagado al buscar</button>' +
        '<button type="button" class="btn" data-sim="bluetooth" aria-pressed="false">Bluetooth apagado al buscar</button>' +
      '</div>' +
      '<h3>Partido</h3>' +
      '<div class="sim-botones">' +
        boton('Pausar partido', 'pausa') + boton('Saltar al siguiente evento', 'saltar') +
      '</div>' +
      '<h3 id="sim-registro-titulo">Registro de patrones</h3>' +
      /* role="log" con aria-live="off": es un registro para quien prueba; si fuera región viva,
         el lector de pantalla lo leería encima de los avisos de la app. */
      '<ol id="sim-registro" class="sim-registro" role="log" aria-live="off" aria-labelledby="sim-registro-titulo" tabindex="0"></ol>' +
      '<div class="sim-botones">' + boton('Borrar registro', 'borrar') + boton('Borrar perfil y reiniciar', 'reiniciar') + '</div>';

    el('sim-vibra').textContent = FV.vibracionDisponible
      ? 'Este navegador puede vibrar: notarás los patrones en el móvil.'
      : 'Este navegador no vibra (por ejemplo, iPhone u ordenador). Mira el registro de patrones.';

    el('sim-contenido').addEventListener('click', function (evento) {
      var b = evento.target.closest('[data-sim]');
      if (b) pulsar(b.dataset.sim, b);
    });

    /* Las herramientas de prueba están plegadas por defecto: son para el equipo, no para el usuario.
       Se recuerda si se dejaron abiertas (solo durante la sesión) y se abren con «?pruebas» en la dirección. */
    var panel = el('sim-panel');
    var abierto = /[?&]pruebas\b/.test(window.location.search);
    try { abierto = abierto || window.sessionStorage.getItem('fv-pruebas') === '1'; } catch (e) { /* sin almacenamiento */ }
    panel.open = abierto;
    panel.addEventListener('toggle', function () {
      try { window.sessionStorage.setItem('fv-pruebas', panel.open ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
    });
  };

  function pulsar(accion, b) {
    var P = FV.partido;
    if (accion === 'diagnostico') { diagnosticar(); return; }
    if (accion === 'sonido') {
      S.sonido = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(S.sonido));
      // El contexto de audio solo puede crearse tras un toque del usuario.
      if (S.sonido && !audio) {
        var Contexto = window.AudioContext || window.webkitAudioContext;
        if (Contexto) audio = new Contexto();
      }
      if (audio && audio.state === 'suspended') audio.resume();
      if (S.sonido) S.sonar([150, 100, 150]);
      return;
    }
    if (FV.EVENTOS_DEPORTIVOS.indexOf(accion) !== -1) P.eventoManual(accion);
    else if (accion === 'cortar') P.cortarInternet();
    else if (accion === 'recuperar') P.recuperarInternet();
    else if (accion === 'desconectar') P.desconectarAccesorio();
    else if (accion === 'bateria') { if (FV.sesion.accesorio === 'conectado') P.gastarBateria(FV.sesion.bateria - 15); }
    else if (accion === 'apagado' || accion === 'bluetooth') {
      var activo = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(activo));
      if (accion === 'apagado') S.apagado = activo; else S.bluetooth = !activo;
    } else if (accion === 'pausa') {
      if (!P.e) return;
      if (P.e.enPausa) { P.reanudar(); b.textContent = 'Pausar partido'; }
      else { P.pausar(); b.textContent = 'Reanudar partido'; }
    } else if (accion === 'saltar') P.saltar();
    else if (accion === 'borrar') el('sim-registro').innerHTML = '';
    else if (accion === 'reiniciar') {
      FV.borrarPrefs();
      window.location.reload();
    }
  }

  /* Añade una línea al registro: hora · origen · patrón · valores en ms. */
  S.registrar = function (origen, nombre, ms, nota) {
    var registro = el('sim-registro');
    if (!registro) return;
    var linea = document.createElement('li');
    var hora = new Date().toLocaleTimeString('es-ES');
    linea.textContent = hora + ' · ' + (origen === 'movil' ? 'Móvil' : 'Accesorio') + ' · ' + nombre +
      (ms ? ' · [' + ms.join(',') + ']' : '') + (nota ? ' · ' + nota : '');
    registro.appendChild(linea);
    registro.scrollTop = registro.scrollHeight;
  };

  /* Posición del balón en texto: tercio del campo y carril. */
  function describir(balon) {
    var x = balon[0], y = balon[1];
    var zona = x < 33 ? 'zona izquierda' : x > 66 ? 'zona derecha' : 'centro del campo';
    var carril = y < 33 ? 'banda de arriba' : y > 66 ? 'banda de abajo' : 'carril central';
    return zona + ', ' + carril;
  }

  S.actualizar = function () {
    var e = FV.partido.e;
    var texto;
    if (!e) texto = 'Balón: sin partido en curso.';
    else if (FV.sesion.accesorio !== 'conectado') texto = 'Balón: sin accesorio conectado, no hay posición táctil.';
    else {
      el('sim-balon').setAttribute('cx', e.balon[0]);
      el('sim-balon').setAttribute('cy', e.balon[1] * 0.64);
      texto = 'Balón: ' + describir(e.balon) + (e.internet ? '.' : ' (sin actualizar).');
    }
    el('sim-posicion').textContent = texto;
  };
})(window.FV);
