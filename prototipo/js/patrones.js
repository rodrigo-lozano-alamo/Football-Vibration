/* Sistema de patrones de vibración. Fuente: memoria/patrones.md.
   Valores en ms para navigator.vibrate(): vibra, pausa, vibra…
   Los patrones se distinguen por RITMO y DURACIÓN, no por intensidad, y ninguno es el principio de otro. */
(function (FV) {
  'use strict';

  FV.PATRONES = {
    gol:          { nombre: 'Gol',          ms: [600, 150, 600, 150, 600],        ritmo: 'largo, largo, largo',       deportivo: true },
    golAnulado:   { nombre: 'Gol anulado',  ms: [1200, 200, 150, 100, 150],       ritmo: 'muy largo, corto, corto',   deportivo: true },
    falta:        { nombre: 'Falta',        ms: [150, 100, 150],                  ritmo: 'corto, corto',              deportivo: true },
    corner:       { nombre: 'Córner',       ms: [150, 100, 500],                  ritmo: 'corto, largo',              deportivo: true },
    penalti:      { nombre: 'Penalti',      ms: [500, 150, 150, 150, 500],        ritmo: 'largo, corto, largo',       deportivo: true },
    tecnico:      { nombre: 'Aviso técnico', ms: [80, 80, 80, 80, 80, 80, 80],    ritmo: 'cuatro pulsos rápidos' },
    confirmacion: { nombre: 'Confirmación', ms: [60],                             ritmo: 'un toque' },
    prueba:       { nombre: 'Vibración de prueba', ms: [400],                     ritmo: 'un pulso' }
  };
  FV.EVENTOS_DEPORTIVOS = ['gol', 'golAnulado', 'falta', 'corner', 'penalti'];

  /* Comprobación de compatibilidad: en iOS (Safari) navigator.vibrate no existe. */
  FV.vibracionDisponible = typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  /* «Pulsos reforzados»: los pulsos (posiciones pares) duran x1,5; las pausas no cambian.
     Sirve a quien tiene menos sensibilidad táctil, como Manuel. */
  FV.patronMs = function (clave) {
    var ms = FV.PATRONES[clave].ms;
    if (!FV.prefs.reforzado) return ms.slice();
    if (clave === 'confirmacion') return [100];
    return ms.map(function (valor, i) { return i % 2 === 0 ? Math.round(valor * 1.5) : valor; });
  };

  /* Emite un patrón.
     origen: 'accesorio' | 'movil' | 'auto' (accesorio si está conectado; si no, móvil).
     Devuelve true si se ha emitido.
     En el prototipo el móvil reproduce también los patrones del accesorio, porque no hay hardware. */
  FV.vibrar = function (clave, origen) {
    var patron = FV.PATRONES[clave];
    var s = FV.sesion;
    var conectado = s.accesorio === 'conectado';

    if (origen === 'auto') origen = conectado ? 'accesorio' : 'movil';
    if (origen === 'accesorio') {
      if (s.soloMovil) origen = 'movil';          // modo beta: los eventos vibran en el móvil
      else if (!conectado) return false;          // un accesorio desconectado no puede vibrar (R9.5.2)
    }
    if (patron.deportivo && s.vibracionesPausa && origen !== 'practica') {
      FV.sim.registrar(origen, patron.nombre, null, 'no emitido: vibraciones en pausa');
      return false;
    }
    if (origen === 'practica') origen = conectado ? 'accesorio' : 'movil';

    var ms = FV.patronMs(clave);
    var nota = null;
    if (FV.vibracionDisponible) {
      /* navigator.vibrate devuelve false cuando el navegador rechaza la vibración
         (página sin ningún toque previo, dentro de un marco ajeno o en segundo plano).
         Se anota en el registro para poder diagnosticarlo desde el propio móvil. */
      var aceptada = false;
      try { aceptada = navigator.vibrate(ms); } catch (e) { aceptada = false; }
      if (!aceptada) nota = 'el navegador ha rechazado la vibración';
    }
    FV.sim.registrar(origen, patron.nombre, ms, nota);
    FV.sim.sonar(ms);   // apoyo sonoro opcional de las herramientas de prueba
    return true;
  };
})(window.FV);
