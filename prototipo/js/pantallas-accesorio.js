/* Pantallas P05 Conectar accesorio, P06 Vibración y narración, P07 Práctica de patrones y P13 Estado del sistema. */
(function (FV) {
  'use strict';
  var ui = FV.ui;

  /* ---------- P05 Conectar accesorio ----------
     Una sola pantalla con varios estados. La conexión es simulada: no hay Bluetooth real.
     La palabra «conectado» no aparece hasta que el accesorio lo está de verdad. */
  var espera = null;
  var ACCESORIOS = ['Táctil 4F21', 'Táctil 9A03'];

  function estadoConexion(estado, p) {
    FV.ir('conectar', { estado: estado, volverAlPartido: p.volverAlPartido, elegido: p.elegido }, { reemplazar: true });
  }

  function conectar(p) {
    var s = FV.sesion;
    s.accesorio = 'conectado';
    s.soloMovil = false;
    if (p.elegido) FV.prefs.emparejado = p.elegido;
    FV.guardarPrefs();
    estadoConexion('conectado', p);
    // Confirmación en el propio accesorio: el usuario nota que responde.
    FV.vibrar('confirmacion', 'accesorio');
    FV.sim.actualizar();
  }

  FV.pantallas.conectar = {
    titulo: 'Conectar accesorio',
    volver: true,
    // El foco va al mensaje del estado, que es lo que ha cambiado.
    foco: '#mensaje',
    html: function (p) {
      var s = FV.sesion;
      var mensaje, botones;
      switch (p.estado) {
        case 'lista':
          mensaje = 'He encontrado ' + ACCESORIOS.length + ' accesorios. Elige el tuyo.';
          botones = ACCESORIOS.map(function (nombre) {
            return ui.boton('Accesorio ' + nombre, 'elegir', '', 'data-nombre="' + nombre + '"');
          }).join('');
          break;
        case 'prueba':
          mensaje = 'Tu accesorio acaba de vibrar. ¿La has notado?';
          botones = ui.boton('Sí, la he notado', 'notada', 'principal') +
            ui.boton('No la he notado', 'noNotada') + ui.boton('Repetir vibración', 'repetir');
          break;
        case 'ayuda':
          mensaje = 'Sube la intensidad o prueba otra vez. Intensidad actual: ' + FV.prefs.intensidad + ' de 5.';
          botones = ui.boton('Repetir vibración', 'repetir', 'principal') +
            ui.boton('Subir intensidad', 'subir') + ui.boton('Volver', 'volver');
          break;
        case 'conectado':
          mensaje = ui.estado(true, 'Accesorio conectado. Batería al ' + s.bateria + ' %.');
          if (p.volverAlPartido) {
            botones = ui.boton('Volver al partido', 'alPartido', 'principal');
          } else if (!FV.prefs.ultimaPractica) {
            /* Primera vez: se recomienda practicar. Sin práctica no se pueden reconocer
               los eventos por la vibración, que es el canal principal (Iteración 2). */
            mensaje += ' Aún no has practicado los patrones de vibración.';
            botones = ui.boton('Ajustar vibración y narración', 'ajustar') +
              ui.boton('Elegir partido sin practicar', 'partidos') +
              ui.boton('Practicar los patrones (recomendado)', 'practicar', 'principal');
          } else {
            botones = ui.boton('Ajustar vibración y narración', 'ajustar') +
              ui.boton('Usar mis ajustes y elegir partido', 'partidos', 'principal');
          }
          break;
        case 'error':
          // Mensajes sin tecnicismos: dicen qué pasa y qué hacer (perfil de Manuel).
          mensaje = ui.estado(false, 'No encuentro tu accesorio. Comprueba que está encendido y cerca del móvil.');
          botones = ui.boton('Reintentar', 'reintentar', 'principal') + ui.boton('Volver', 'volver');
          break;
        case 'bluetooth':
          mensaje = ui.estado(false, 'El móvil no puede buscar accesorios. Activa el Bluetooth en los ajustes del móvil.');
          botones = ui.boton('Reintentar', 'reintentar', 'principal') + ui.boton('Volver', 'volver');
          break;
        default:
          mensaje = 'Buscando tu accesorio. Enciéndelo y déjalo cerca del móvil.';
          botones = '<div class="buscando" aria-hidden="true"><span></span><span></span><span></span></div>' +
            ui.boton('Cancelar', 'volver');
      }
      return '<p id="mensaje" tabindex="-1">' + mensaje + '</p><div class="acciones">' + botones + '</div>';
    },
    alEntrar: function (p) {
      window.clearTimeout(espera);
      if (p.estado === 'buscando') {
        // Búsqueda simulada. En el producto real el límite sería de unos 10 segundos.
        espera = window.setTimeout(function () {
          if (!FV.sim.bluetooth) estadoConexion('bluetooth', p);
          else if (FV.sim.apagado) estadoConexion('error', p);
          else if (FV.prefs.emparejado) conectar(p);          // ya emparejado: sin lista ni prueba (D-04)
          else estadoConexion('lista', p);
        }, 2500);
      } else if (p.estado === 'prueba') {
        FV.vibrar('prueba', 'movil');   // en el prototipo, la vibración de prueba suena en el móvil
      }
    },
    alSalir: function () { window.clearTimeout(espera); },
    acciones: {
      volver: function () { FV.volver(); },
      reintentar: function (b, p) { estadoConexion('buscando', p); },
      elegir: function (b, p) { p.elegido = b.dataset.nombre; estadoConexion('prueba', p); },
      repetir: function (b, p) {
        if (p.estado === 'prueba') { FV.vibrar('prueba', 'movil'); FV.avisar('Vibración repetida.'); }
        else estadoConexion('prueba', p);
      },
      noNotada: function (b, p) { estadoConexion('ayuda', p); },
      subir: function () {
        var prefs = FV.prefs;
        if (prefs.intensidad < 5) prefs.intensidad += 1;
        FV.repintar('[data-accion="subir"]');
        FV.avisar('Intensidad ' + prefs.intensidad + ' de 5.');
      },
      // Solo tras la confirmación del usuario se da el accesorio por conectado (primera vez).
      notada: function (b, p) { conectar(p); },
      partidos: function () { FV.ir('partidos', {}, { raiz: false }); },
      ajustar: function () { FV.ir('vibracion', {}); },
      practicar: function () { FV.ir('practica', { modo: 'aprender' }); },
      alPartido: function () { FV.ir('partido', {}, { raiz: true }); }
    }
  };

  /* ---------- P06 Vibración y narración ----------
     Botones − y + en lugar de deslizadores: más fáciles con lector de pantalla y con poca precisión (D-10).
     Los cambios se aplican al momento para poder probarlos; «Guardar» los conserva y «Descartar» los deshace. */
  var copiaAjustes = null;
  var CAMPOS = ['intensidad', 'reforzado', 'volumen', 'narracion'];

  function hayCambios() {
    return copiaAjustes && CAMPOS.some(function (c) { return copiaAjustes[c] !== FV.prefs[c]; });
  }

  function ajuste(nombre, campo) {
    var minus = nombre.toLowerCase();
    return '<div role="group" aria-labelledby="g-' + campo + '">' +
      '<h2 id="g-' + campo + '">' + nombre + '</h2>' +
      '<div class="ajuste">' +
      '<button type="button" class="btn" data-accion="menos" data-campo="' + campo + '" aria-label="Bajar ' + minus + '">−</button>' +
      '<p id="v-' + campo + '">' + FV.prefs[campo] + ' de 5</p>' +
      '<button type="button" class="btn" data-accion="mas" data-campo="' + campo + '" aria-label="Subir ' + minus + '">+</button>' +
      '</div></div>';
  }

  function cambiar(boton, paso) {
    var campo = boton.dataset.campo;
    var prefs = FV.prefs;
    var nombre = campo === 'intensidad' ? 'Intensidad' : 'Volumen';
    var nuevo = prefs[campo] + paso;
    if (nuevo < 1 || nuevo > 5) {
      // En el límite también hay respuesta: el usuario sabe que el botón ha funcionado.
      FV.avisar(nombre + (paso > 0 ? ' al máximo: 5 de 5.' : ' al mínimo: 1 de 5.'));
      return;
    }
    prefs[campo] = nuevo;
    document.getElementById('v-' + campo).textContent = nuevo + ' de 5';
    FV.vibrar('confirmacion', 'movil');
    FV.avisar(nombre + ' ' + nuevo + ' de 5.');
  }

  FV.pantallas.vibracion = {
    titulo: 'Vibración y narración',
    volver: true,
    html: function () {
      var prefs = FV.prefs;
      return ajuste('Intensidad', 'intensidad') +
        ui.boton('Probar vibración', 'probar') +
        /* Interruptor: role="switch" + aria-checked. El estado va también escrito en el texto. */
        '<button type="button" class="btn" role="switch" data-accion="reforzado" aria-checked="' + prefs.reforzado + '" aria-describedby="ayuda-reforzado">' +
          /* El estado escrito es solo visual (aria-hidden): el lector ya lo dice con aria-checked.
             Así no se oye dos veces «activado» (Iteración 2). */
          'Pulsos reforzados<span aria-hidden="true">: <span id="t-reforzado">' + (prefs.reforzado ? 'activado' : 'desactivado') + '</span></span></button>' +
        '<p id="ayuda-reforzado">Vibraciones más largas, para notarlas mejor.</p>' +
        ajuste('Volumen', 'volumen') +
        ui.grupo({ nombre: 'narracion', leyenda: 'Nivel de narración', valor: prefs.narracion, cambio: 'narracion',
          opciones: [['minima', 'Mínima: solo los eventos'], ['normal', 'Normal'], ['detallada', 'Detallada']] }) +
        '<div class="acciones">' +
        ui.boton('Practicar patrones', 'practica') +
        ui.boton('Guardar ajustes', 'guardar', 'principal') +
        '</div>';
    },
    alEntrar: function () {
      // Al volver de la práctica se conserva la copia original para poder descartar.
      if (!copiaAjustes) {
        copiaAjustes = {};
        CAMPOS.forEach(function (c) { copiaAjustes[c] = FV.prefs[c]; });
      }
    },
    /* Salir sin guardar: se pregunta antes de perder los cambios (T3). */
    antesDeVolver: function () {
      if (!hayCambios()) { copiaAjustes = null; return true; }
      FV.dialogo('Tienes cambios sin guardar', '¿Qué quieres hacer con los cambios?', [
        { texto: 'Guardar', principal: true, accion: function () { FV.pantallas.vibracion.acciones.guardar(); } },
        { texto: 'Descartar', accion: function () {
          CAMPOS.forEach(function (c) { FV.prefs[c] = copiaAjustes[c]; });
          copiaAjustes = null;
          FV.volver();
          FV.avisar('Cambios descartados.');
        } },
        { texto: 'Seguir editando' }
      ]);
      return false;
    },
    acciones: {
      menos: function (b) { cambiar(b, -1); },
      mas: function (b) { cambiar(b, 1); },
      probar: function () {
        FV.vibrar('prueba', 'auto');
        FV.avisar('Vibración de prueba, intensidad ' + FV.prefs.intensidad + ' de 5.');
      },
      reforzado: function (b) {
        var prefs = FV.prefs;
        prefs.reforzado = !prefs.reforzado;
        b.setAttribute('aria-checked', String(prefs.reforzado));
        document.getElementById('t-reforzado').textContent = prefs.reforzado ? 'activado' : 'desactivado';
        FV.vibrar('confirmacion', 'movil');
        FV.avisar('Pulsos reforzados ' + (prefs.reforzado ? 'activados.' : 'desactivados.'));
      },
      narracion: function (campo) {
        FV.prefs.narracion = campo.value;
        FV.avisar('Nivel de narración: ' + campo.value.replace('minima', 'mínima') + '.');
      },
      practica: function () { FV.ir('practica', { modo: 'aprender' }); },
      guardar: function () {
        copiaAjustes = null;
        FV.volver();
        FV.guardar('Ajustes guardados.');
      }
    }
  };

  /* ---------- P07 Práctica de patrones (R9.3.3) ----------
     Tres modos: aprender (notar cada patrón), test (adivinar) y resultado. */
  var practica = { orden: [], i: 0, fallos: [], respuesta: null, notado: false };

  function barajar(lista) {
    var copia = lista.slice();
    for (var i = copia.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = copia[i]; copia[i] = copia[j]; copia[j] = t;
    }
    return copia;
  }

  function empezarTest(claves) {
    practica = { orden: barajar(claves), i: 0, fallos: [], respuesta: null, notado: false };
    FV.ir('practica', { modo: 'test' }, { reemplazar: true });
  }

  function nombre(clave) { return FV.PATRONES[clave].nombre; }

  FV.pantallas.practica = {
    titulo: function (p) {
      if (p.modo === 'test') return 'Práctica: patrón ' + (practica.i + 1) + ' de ' + practica.orden.length;
      if (p.modo === 'resultado') {
        var total = practica.orden.length;
        return 'Resultado: ' + (total - practica.fallos.length) + ' de ' + total + ' aciertos';
      }
      return 'Practicar patrones';
    },
    volver: true,
    html: function (p) {
      if (p.modo === 'test') {
        var respuestas = FV.EVENTOS_DEPORTIVOS.map(function (clave) {
          return ui.boton(nombre(clave), 'responder', '', 'data-clave="' + clave + '"');
        }).join('');
        return ui.boton('Reproducir patrón', 'reproducir', 'principal grande') +
          '<h2 id="pregunta">¿Qué evento es?</h2>' +
          '<div class="pila" role="group" aria-labelledby="pregunta">' + respuestas + '</div>' +
          '<p id="correccion" tabindex="-1" hidden></p>' +
          '<div class="acciones" id="zona-siguiente" hidden>' + ui.boton('Siguiente', 'siguiente', 'principal') + '</div>';
      }
      if (p.modo === 'resultado') {
        var fallos = practica.fallos;
        var texto = fallos.length
          ? 'Has fallado: ' + fallos.map(nombre).join(', ').toLowerCase() + '.' +
            (FV.prefs.reforzado ? '' : ' Si te cuesta notarlos, activa «Pulsos reforzados» en Vibración y narración.')
          : 'Has reconocido todos los patrones.';
        return '<p>' + texto + '</p><div class="acciones">' +
          (fallos.length ? ui.boton('Repetir los fallados', 'fallados') : '') +
          ui.boton('Notar todos los patrones', 'aprender') +
          ui.boton('Terminar', 'terminar', 'principal') + '</div>';
      }
      var lista = FV.EVENTOS_DEPORTIVOS.map(function (clave) {
        return ui.boton('Notar el patrón de ' + nombre(clave).toLowerCase() +
          '<small>' + FV.PATRONES[clave].ritmo + '</small>', 'notar', '', 'data-clave="' + clave + '"');
      }).join('');
      return '<p>Pulsa cada evento para notar su vibración. Cuando los distingas, empieza la práctica.</p>' +
        '<div class="pila">' + lista + '</div>' +
        '<div class="acciones">' + ui.boton('Empezar la práctica', 'empezar', 'principal') + '</div>';
    },
    acciones: {
      // «practica»: vibra aunque las vibraciones del partido estén en pausa.
      notar: function (b) { FV.vibrar(b.dataset.clave, 'practica'); },
      empezar: function () { empezarTest(FV.EVENTOS_DEPORTIVOS); },
      reproducir: function () { practica.notado = true; FV.vibrar(practica.orden[practica.i], 'practica'); },
      responder: function (b) {
        if (practica.respuesta) return;             // ya respondido: se espera a «Siguiente»
        // No se puede responder sin haber notado el patrón: evita fallos por despiste (Iteración 2).
        if (!practica.notado) { FV.avisar('Primero pulsa «Reproducir patrón».'); return; }
        var correcta = practica.orden[practica.i];
        var acierto = b.dataset.clave === correcta;
        practica.respuesta = b.dataset.clave;
        if (!acierto) practica.fallos.push(correcta);
        // Corrección con texto e icono; recibe el foco para que el lector la lea.
        var p = document.getElementById('correccion');
        p.innerHTML = acierto
          ? ui.estado(true, 'Correcto: era ' + nombre(correcta).toLowerCase() + '.')
          : ui.estado(false, 'Era ' + nombre(correcta).toLowerCase() + '. Has elegido ' + nombre(b.dataset.clave).toLowerCase() + '.');
        p.hidden = false;
        document.getElementById('zona-siguiente').hidden = false;
        p.focus();
      },
      siguiente: function () {
        practica.i += 1;
        practica.respuesta = null;
        practica.notado = false;
        if (practica.i < practica.orden.length) { FV.ir('practica', { modo: 'test' }, { reemplazar: true }); return; }
        var total = practica.orden.length;
        var resultado = (total - practica.fallos.length) + ' de ' + total;
        FV.prefs.ultimaPractica = resultado;
        FV.guardarPrefs();
        FV.ir('practica', { modo: 'resultado' }, { reemplazar: true });
        // El resultado se anuncia en voz y texto (T3).
        FV.avisar(resultado + ' aciertos.');
      },
      fallados: function () { empezarTest(practica.fallos); },
      aprender: function () { FV.ir('practica', { modo: 'aprender' }, { reemplazar: true }); },
      terminar: function () { FV.volver(); }
    }
  };

  /* ---------- P13 Estado del sistema (R9.5.1) ----------
     Accesible desde cualquier pantalla con el botón fijo «Estado». No interrumpe el seguimiento. */
  FV.pantallas.estado = {
    titulo: 'Estado del sistema',
    volver: true, estado: false,
    html: function () {
      var s = FV.sesion;
      var e = FV.partido.e;
      var conectado = s.accesorio === 'conectado';
      var filas = [];

      filas.push('Accesorio: ' + (conectado ? ui.estado(true, 'conectado') :
        s.soloMovil ? 'no se usa (modo solo móvil, beta)' : ui.estado(false, 'sin conectar')));
      if (conectado) {
        filas.push('Batería del accesorio: ' + (s.bateria < 20 ? ui.estado(false, 'baja, ' + s.bateria + ' %') : s.bateria + ' %'));
      }
      filas.push('Vibraciones: ' + (s.vibracionesPausa ? '<span aria-hidden="true">⏸</span> en pausa' : 'activas'));
      filas.push('Narración: ' + (s.narracionPausa ? '<span aria-hidden="true">⏸</span> en pausa' : 'activa'));
      if (!e) filas.push('Datos del partido: no hay ningún partido en seguimiento');
      else if (e.finalizado) filas.push('Datos del partido: partido terminado');
      else if (e.internet) filas.push('Datos del partido: ' + ui.estado(true, 'en directo, minuto ' + e.minMostrado));
      else filas.push('Datos del partido: ' + ui.estado(false, 'sin actualizar desde el minuto ' + e.sinActualizarDesde));

      var botones = '';
      if (e && !e.internet) botones += ui.boton('Reintentar conexión', 'reintentar', 'principal');
      if (!conectado && !s.soloMovil) botones += ui.boton('Conectar accesorio', 'conectar', 'principal');

      return '<ul class="lista-estado"><li>' + filas.join('</li><li>') + '</li></ul>' +
        (botones ? '<div class="acciones">' + botones + '</div>' : '');
    },
    acciones: {
      reintentar: function () { FV.partido.reintentar(); },
      conectar: function () {
        var enPartido = !!(FV.partido.e && !FV.partido.e.finalizado);
        FV.cerrarAviso();
        FV.ir('conectar', { estado: 'buscando', volverAlPartido: enPartido }, { reemplazar: true });
      }
    }
  };
})(window.FV);
