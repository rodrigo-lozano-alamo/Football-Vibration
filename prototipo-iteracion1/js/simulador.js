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

  S.iniciar = function () {
    el('sim-contenido').innerHTML =
      '<p id="sim-vibra"></p>' +
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
        boton('Desconectar accesorio', 'desconectar') +
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
  };

  function pulsar(accion, b) {
    var P = FV.partido;
    if (FV.EVENTOS_DEPORTIVOS.indexOf(accion) !== -1) P.eventoManual(accion);
    else if (accion === 'cortar') P.cortarInternet();
    else if (accion === 'recuperar') P.recuperarInternet();
    else if (accion === 'desconectar') P.desconectarAccesorio();
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
