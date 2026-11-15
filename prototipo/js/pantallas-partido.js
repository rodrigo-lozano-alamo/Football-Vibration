/* Pantallas P08 Elegir partido, P09 Entorno y canales, P10 Ponerse al día, P11 Partido,
   P12 Ajustes del partido, P15 Final del partido y P16 Sesión finalizada. */
(function (FV) {
  'use strict';
  var ui = FV.ui;
  var P = FV.partido;

  function el(id) { return document.getElementById(id); }

  /* Configuración de canales propuesta para cada entorno (R9.4.2). */
  var ENTORNOS = {
    estadio: { nombre: 'el estadio', intensidad: 5, narracion: 'minima', volumen: 5, texto: 'vibración fuerte, narración mínima, volumen alto' },
    casa:    { nombre: 'casa',       intensidad: 3, narracion: 'detallada', volumen: 3, texto: 'vibración media, narración detallada, volumen medio' },
    bar:     { nombre: 'un bar',     intensidad: 4, narracion: 'minima', volumen: 2, texto: 'vibración alta, narración mínima, volumen bajo' }
  };
  var OPCIONES_ENTORNO = [['estadio', 'En el estadio'], ['casa', 'En casa'], ['bar', 'En un bar']];
  var NIVELES = ['minima', 'normal', 'detallada'];
  var NOMBRE_NIVEL = { minima: 'mínima', normal: 'normal', detallada: 'detallada' };

  function propuesta(entorno) {
    if (!entorno) return 'Elige un lugar para ver la configuración propuesta.';
    return 'Propuesta para ' + ENTORNOS[entorno].nombre + ': ' + ENTORNOS[entorno].texto + '.' +
      (FV.sesion.soloMovil ? ' Los eventos vibrarán en el móvil.' : '');
  }

  function aplicarEntorno(entorno) {
    var c = ENTORNOS[entorno];
    FV.sesion.entorno = entorno;
    FV.prefs.intensidad = c.intensidad;
    FV.prefs.narracion = c.narracion;
    FV.prefs.volumen = c.volumen;
  }

  /* ---------- P08 Elegir partido ---------- */
  FV.pantallas.partidos = {
    titulo: function (p) { return p.elegido ? 'Confirmar partido' : 'Elegir partido'; },
    volver: true,
    html: function (p) {
      if (!FV.datos) {
        return '<p>' + ui.estado(false, 'No puedo cargar los partidos. Comprueba tu conexión.') + '</p>' +
          '<div class="acciones">' + ui.boton('Reintentar', 'recargar', 'principal') + '</div>';
      }
      if (p.elegido) {
        // Confirmación de equipos y hora antes de seguir (T4).
        var partido = P.buscar(p.elegido);
        return '<p>Has elegido <strong>' + partido.local + ' contra ' + partido.visitante + '</strong>, hoy a las ' + partido.hora + '.</p>' +
          '<form data-form="confirmar" novalidate>' +
          // Si el equipo de la última vez juega este partido, viene ya marcado (menos pasos, Iteración 2).
          ui.grupo({ nombre: 'equipo', leyenda: '¿Con qué equipo vas?', obligatorio: true,
            valor: FV.prefs.equipo === partido.local ? 'local' : FV.prefs.equipo === partido.visitante ? 'visitante' : null,
            opciones: [['local', partido.local], ['visitante', partido.visitante], ['ninguno', 'Ninguno']] }) +
          '<div class="acciones">' + ui.boton('Elegir otro', 'otro') +
          '<button type="submit" class="btn principal">Confirmar partido</button></div></form>';
      }
      // Cada partido es un botón con los equipos, la hora y el estado en texto (sin escudos ni colores).
      /* Aviso de honestidad con el usuario: estos partidos no son reales.
         Va antes de la lista y es corto, para no alargar la lectura en cada uso. */
      return '<p class="bloque nota"><strong>Partidos de ejemplo.</strong> Todavía no hemos podido conectar la app con un servicio de datos (API) de partidos reales, así que estos encuentros son simulados.</p>' +
        '<div class="pila">' + FV.datos.partidos.map(function (partido) {
        var estado = partido.minutoInicial ? 'En juego, minuto ' + partido.minutoInicial : 'Hoy a las ' + partido.hora + '. Aún no ha empezado';
        return ui.boton(partido.local + ' contra ' + partido.visitante + '<small>' + estado + '</small>',
          'elegir', 'grande', 'data-id="' + partido.id + '"');
      }).join('') + '</div>';
    },
    acciones: {
      recargar: function () { FV.cargarDatos().then(function () { FV.repintar('#titulo'); }); },
      elegir: function (b) { FV.ir('partidos', { elegido: b.dataset.id }); },
      otro: function () { FV.volver(); },
      confirmar: function (formulario, p) {
        if (!FV.validar(formulario)) return;
        FV.sesion.partidoId = p.elegido;
        FV.sesion.equipo = FV.valor(formulario, 'equipo');
        var elegido = P.buscar(p.elegido);
        if (FV.sesion.equipo !== 'ninguno') FV.prefs.equipo = FV.sesion.equipo === 'local' ? elegido.local : elegido.visitante;
        FV.ir('entorno', {});
      }
    }
  };

  /* ---------- P09 Entorno y canales ---------- */
  FV.pantallas.entorno = {
    titulo: '¿Dónde vas a seguir el partido?',
    volver: true,
    html: function () {
      var s = FV.sesion;
      // Se propone el lugar habitual del perfil; si era «varios sitios», el usuario elige.
      if (!s.entorno && ENTORNOS[FV.prefs.respuestas.lugar]) s.entorno = FV.prefs.respuestas.lugar;
      return '<form data-form="iniciar" novalidate>' +
        ui.grupo({ nombre: 'entorno', etiquetadoPor: 'titulo', opciones: OPCIONES_ENTORNO, valor: s.entorno, obligatorio: true, cambio: 'elegir' }) +
        /* La propuesta cambia al elegir: aria-live="polite" la anuncia sin mover el foco. */
        '<p id="propuesta" class="bloque" aria-live="polite">' + propuesta(s.entorno) + '</p>' +
        '<div class="acciones">' + ui.boton('Ajustar', 'ajustar') +
        '<button type="submit" class="btn principal">Iniciar seguimiento</button></div></form>';
    },
    acciones: {
      elegir: function (campo) {
        FV.sesion.entorno = campo.value;
        el('propuesta').textContent = propuesta(campo.value);
      },
      ajustar: function (b) {
        if (!FV.validar(b.form)) return;
        aplicarEntorno(FV.sesion.entorno);
        FV.sesion.ajustado = true;
        FV.ir('vibracion', {});
      },
      iniciar: function (formulario) {
        if (!FV.validar(formulario)) return;
        var s = FV.sesion;
        if (!s.ajustado) aplicarEntorno(s.entorno);     // si el usuario ajustó a mano, se respeta
        FV.guardarPrefs();
        P.iniciar(s.partidoId);
        FV.sim.actualizar();
        if (P.e.min > 0) {
          FV.ir('aldia', {}, { raiz: true });
        } else {
          FV.ir('partido', {}, { raiz: true });
          FV.vibrar('confirmacion', 'movil');
          FV.avisar('Seguimiento iniciado.');
        }
      }
    }
  };

  /* ---------- Lectura del resumen y de las alineaciones (P10 y P15) ----------
     El botón cambia de texto según el estado: Escuchar / Detener / Continuar. */
  function textoBotonResumen() {
    if (FV.lecturaActiva()) return 'Detener resumen';
    return FV.lecturaPendiente() ? 'Continuar resumen' : 'Escuchar resumen';
  }

  function actualizarBotonResumen() {
    var boton = document.querySelector('[data-accion="resumen"]');
    if (boton) boton.textContent = textoBotonResumen();
  }

  function alternarResumen() {
    if (FV.lecturaActiva()) {
      FV.detenerLectura();
    } else {
      var continuar = FV.lecturaPendiente();
      var frases = P.frasesResumen();
      // El texto se muestra también en pantalla: sirve con el audio bajo y a quien prefiere leer.
      var texto = el('texto-lectura');
      texto.textContent = frases.join(' ');
      texto.hidden = false;
      FV.leer(frases, actualizarBotonResumen, continuar);
    }
    actualizarBotonResumen();
  }

  var bloqueLectura = '<p id="texto-lectura" class="bloque" hidden></p>';

  /* ---------- P10 Ponerse al día (partido ya empezado) ---------- */
  FV.pantallas.aldia = {
    titulo: function () { return 'El partido ya ha empezado: minuto ' + P.e.minMostrado; },
    volver: false,
    html: function () {
      return '<div class="tablero"><p class="marcador" id="marcador">' + P.marcadorTexto(P.e.marcadorMostrado) + '</p></div>' +
        '<p>Puedes escuchar un resumen o ir directamente al partido.</p>' +
        bloqueLectura +
        '<div class="acciones">' +
        ui.boton(textoBotonResumen(), 'resumen') +
        ui.boton('Escuchar alineaciones', 'alineaciones') +
        ui.boton('Ir al directo', 'directo', 'principal') +
        '</div>';
    },
    alSalir: function () { FV.detenerLectura(true); },
    acciones: {
      resumen: alternarResumen,
      alineaciones: function () {
        var a = P.e.p.alineaciones;
        var frases = ['Alineaciones.', a.local, a.visitante];
        var texto = el('texto-lectura');
        texto.textContent = frases.join(' ');
        texto.hidden = false;
        FV.leer(frases, actualizarBotonResumen, false);
        actualizarBotonResumen();
      },
      directo: function () { FV.ir('partido', {}, { raiz: true }); }
    }
  };

  /* ---------- P11 Partido ----------
     Los controles rápidos están siempre visibles y en el mismo orden (D-05):
     se aprenden de memoria y se usan con una mano y sin mirar (R9.2.2). */
  function textoDatos() {
    var e = P.e;
    if (e.finalizado) return 'Partido terminado.';
    return e.internet ? ui.estado(true, 'Datos en directo.')
      : ui.estado(false, 'Sin actualizar desde el minuto ' + e.sinActualizarDesde + '. El aviso está al final de la pantalla.');
  }

  function textoUltimo() {
    var u = P.e.ultimo;
    return u ? 'Último evento, minuto ' + u.min + ': ' + u.texto : 'Último evento: aún no hay ninguno.';
  }

  /* Actualiza los datos en pantalla SIN volver a pintarla: no se pierde el foco
     y el lector de pantalla no interrumpe cada minuto (el marcador no es región viva). */
  FV.alCambiarPartido = function () {
    var e = P.e;
    if (!e) return;
    if (FV.actual() === 'aldia' && el('marcador')) el('marcador').textContent = P.marcadorTexto(e.marcadorMostrado);
    if (FV.actual() !== 'partido') return;
    el('marcador').textContent = P.marcadorTexto(e.marcadorMostrado);
    el('minuto').textContent = e.enDescanso ? 'Descanso' : 'Minuto ' + e.minMostrado;
    el('datos').innerHTML = textoDatos();
    el('ultimo').textContent = textoUltimo();
    el('beta').hidden = !FV.sesion.soloMovil;
  };

  /* Estado de las pausas, siempre visible: el texto del botón dice la acción («Reanudar»),
     pero el estado («en pausa») debe verse sin tener que deducirlo (Iteración 2). */
  function textoPausas() {
    var s = FV.sesion;
    var partes = [];
    if (s.vibracionesPausa) partes.push('Vibraciones en pausa');
    if (s.narracionPausa) partes.push('Narración en pausa');
    return partes.join('. ');
  }

  function textoNivel() {
    return 'Nivel de narración: ' + NOMBRE_NIVEL[FV.prefs.narracion] + '<small>Pulsa para cambiar</small>';
  }

  function alternar(boton, campo, nombre, mensajePausa, mensajeActivo) {
    var s = FV.sesion;
    s[campo] = !s[campo];
    // El texto del botón dice lo que hará al pulsarlo; el estado se confirma por voz y texto.
    boton.textContent = (s[campo] ? 'Reanudar ' : 'Pausar ') + nombre;
    el('pausas-texto').textContent = textoPausas();
    el('pausas').hidden = !textoPausas();
    FV.vibrar('confirmacion', 'movil');
    return s[campo] ? mensajePausa : mensajeActivo;
  }

  function cambiarVolumen(paso) {
    var prefs = FV.prefs;
    var nuevo = prefs.volumen + paso;
    if (nuevo < 1 || nuevo > 5) {
      FV.avisar(paso > 0 ? 'Volumen al máximo: 5 de 5.' : 'Volumen al mínimo: 1 de 5.');
      return;
    }
    prefs.volumen = nuevo;
    el('volumen').textContent = 'Volumen ' + nuevo + ' de 5';
    FV.guardarPrefs();
    FV.vibrar('confirmacion', 'movil');
    FV.avisar('Volumen ' + nuevo + ' de 5.');
  }

  /* Finalizar con el partido en juego pide confirmación; la opción segura es la primera y recibe el foco (T10). */
  FV.pedirFinalizar = function () {
    var e = P.e;
    if (e && !e.finalizado) {
      FV.dialogo('El partido sigue en juego', '¿Quieres salir?', [
        { texto: 'Seguir viendo el partido', principal: true },
        { texto: 'Finalizar sesión', accion: finalizar }
      ]);
    } else {
      FV.dialogo('¿Finalizar la sesión?', 'Se desconectará el accesorio. Tus ajustes quedan guardados.', [
        { texto: 'Finalizar', principal: true, accion: finalizar },
        { texto: 'Cancelar' }
      ]);
    }
  };

  function finalizar() {
    FV.detenerLectura(true);
    FV.callar();
    P.detener();
    FV.cerrarAviso();
    FV.limpiarSubtitulo();
    FV.nuevaSesion();          // el accesorio queda desconectado; el emparejamiento y los ajustes se conservan
    FV.sim.actualizar();
    FV.ir('cierre', {}, { raiz: true });
    FV.guardar('Sesión finalizada.');
  }

  FV.pantallas.partido = {
    titulo: function () { return 'Partido: ' + P.e.p.local + ' contra ' + P.e.p.visitante; },
    volver: false,
    html: function () {
      var e = P.e;
      var s = FV.sesion;
      /* Marcador y minuto van juntos en un «tablero»: es lo primero que busca quien mira la pantalla. */
      return '<div class="tablero"><p class="marcador" id="marcador">' + P.marcadorTexto(e.marcadorMostrado) + '</p>' +
        '<p class="minuto" id="minuto">' + (e.enDescanso ? 'Descanso' : 'Minuto ' + e.minMostrado) + '</p></div>' +
        '<h2 class="solo-lector">Controles rápidos</h2>' +
        ui.boton('Repetir último evento', 'repetir', 'principal grande') +
        '<div class="fila">' +
        ui.boton((s.vibracionesPausa ? 'Reanudar' : 'Pausar') + ' vibraciones', 'vibraciones') +
        ui.boton((s.narracionPausa ? 'Reanudar' : 'Pausar') + ' narración', 'narracion') +
        '</div>' +
        '<div class="ajuste">' +
        '<button type="button" class="btn" data-accion="volMenos" aria-label="Bajar volumen">−</button>' +
        '<p id="volumen">Volumen ' + FV.prefs.volumen + ' de 5</p>' +
        '<button type="button" class="btn" data-accion="volMas" aria-label="Subir volumen">+</button>' +
        '</div>' +
        ui.boton(textoNivel(), 'nivel') +
        /* La información que cambia de tamaño (último evento, estado de los datos, pausas) va DEBAJO
           de los controles rápidos. Si estuviera encima, cada evento los desplazaría y dejarían de
           estar siempre en el mismo sitio (R9.2.2, Iteración 2). */
        '<h2 class="solo-lector">Información del partido</h2>' +
        '<p id="ultimo" class="bloque">' + textoUltimo() + '</p>' +
        '<p id="datos">' + textoDatos() + '</p>' +
        '<p id="pausas" class="estado"' + (textoPausas() ? '' : ' hidden') + '><span aria-hidden="true">⏸</span> <span id="pausas-texto">' + textoPausas() + '</span></p>' +
        '<p id="beta" class="bloque"' + (s.soloMovil ? '' : ' hidden') + '>Beta: solo móvil. Función en desarrollo, sin posición del balón.</p>' +
        '<h2 class="solo-lector">Más opciones</h2>' +
        ui.boton('Ajustes del partido', 'ajustes') +
        /* «Finalizar sesión» va sola, la última y separada: antes estaba pegada a otro botón
           igual y era fácil pulsarla sin querer (Iteración 2). */
        ui.boton('Finalizar sesión', 'finalizar', 'separado');
    },
    acciones: {
      repetir: function () { P.repetir(); },
      vibraciones: function (b) {
        FV.avisar(alternar(b, 'vibracionesPausa', 'vibraciones', 'Vibraciones en pausa.', 'Vibraciones activas.'));
      },
      narracion: function (b) {
        // Al pausar la narración se aclara que la vibración sigue activa (T7, R9.6.1).
        var mensaje = alternar(b, 'narracionPausa', 'narración',
          'Narración en pausa. Las vibraciones siguen activas.', 'Narración activa.');
        if (FV.sesion.narracionPausa) { FV.callar(); FV.limpiarSubtitulo(); }
        FV.avisar(mensaje);
      },
      volMenos: function () { cambiarVolumen(-1); },
      volMas: function () { cambiarVolumen(1); },
      nivel: function (b) {
        var prefs = FV.prefs;
        prefs.narracion = NIVELES[(NIVELES.indexOf(prefs.narracion) + 1) % NIVELES.length];
        b.innerHTML = textoNivel();
        FV.guardarPrefs();
        FV.vibrar('confirmacion', 'movil');
        FV.avisar('Nivel de narración: ' + NOMBRE_NIVEL[prefs.narracion] + '.');
      },
      ajustes: function () { FV.ir('ajustesPartido', {}); },
      finalizar: function () { FV.pedirFinalizar(); }
    }
  };

  /* ---------- P12 Ajustes del partido (el seguimiento continúa mientras tanto) ---------- */
  FV.pantallas.ajustesPartido = {
    titulo: 'Ajustes del partido',
    volver: true,
    html: function () {
      return '<form data-form="guardar" novalidate>' +
        ui.grupo({ nombre: 'entorno', leyenda: 'Entorno', opciones: OPCIONES_ENTORNO, valor: FV.sesion.entorno, cambio: 'elegir' }) +
        '<p id="propuesta" class="bloque" aria-live="polite">' + propuesta(FV.sesion.entorno) + '</p>' +
        '<div class="acciones">' + ui.boton('Vibración y narración', 'vibracion') +
        // Ayuda durante el partido: recordar qué significa cada vibración (Iteración 2).
        ui.boton('Recordar los patrones', 'patrones') +
        '<button type="submit" class="btn principal">Guardar y volver al partido</button></div></form>';
    },
    acciones: {
      elegir: function (campo) { el('propuesta').textContent = propuesta(campo.value); },
      vibracion: function () { FV.ir('vibracion', {}); },
      patrones: function () { FV.ir('practica', { modo: 'aprender' }); },
      guardar: function (formulario) {
        var entorno = FV.valor(formulario, 'entorno');
        // Solo se aplica la propuesta si el entorno ha cambiado: no se pisan los ajustes hechos a mano.
        if (entorno && entorno !== FV.sesion.entorno) aplicarEntorno(entorno);
        FV.volver();
        FV.guardar('Ajustes guardados.');
      }
    }
  };

  /* ---------- P15 Final del partido ---------- */
  FV.pantallas.final = {
    titulo: 'Final del partido',
    volver: false,
    html: function () {
      return '<div class="tablero"><p class="marcador">' + P.marcadorTexto(P.e.marcador) + '</p></div>' +
        bloqueLectura +
        '<div class="acciones">' + ui.boton(textoBotonResumen(), 'resumen') +
        ui.boton('Finalizar sesión', 'finalizar', 'principal') + '</div>';
    },
    alSalir: function () { FV.detenerLectura(true); },
    acciones: {
      resumen: alternarResumen,
      finalizar: function () { FV.pedirFinalizar(); }
    }
  };

  /* ---------- P16 Sesión finalizada (confirmación de cierre) ---------- */
  FV.pantallas.cierre = {
    titulo: 'Sesión finalizada',
    volver: false, estado: false,
    html: function () {
      return '<div class="emblema" aria-hidden="true">' + FV.LOGO + '</div>' +
        '<p>' + ui.estado(true, 'Ajustes guardados.') + '</p>' +
        '<p>El accesorio está desconectado. Recuerda apagarlo.</p>' +
        '<div class="acciones">' + ui.boton('Volver al inicio', 'inicio', 'principal') + '</div>';
    },
    acciones: {
      inicio: function () { FV.ir('inicio', {}, { raiz: true }); }
    }
  };
})(window.FV);
