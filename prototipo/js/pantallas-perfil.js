/* Pantallas P01 Bienvenida, P02 Cuestionario, P03 Perfil propuesto, P04 Inicio y P17 Configuración. */
(function (FV) {
  'use strict';
  var ui = FV.ui;

  /* Respuestas en curso. Se conservan al ir atrás y adelante por el cuestionario (R9.2.3). */
  var borrador = { vision: null, lugar: null, lector: null, tema: null, texto: null, vozApp: null };

  var PREGUNTAS = [
    { campo: 'vision', pregunta: '¿Cuál es tu grado de visión?',
      opciones: [['nada', 'No veo nada'], ['dificultad', 'Veo con dificultad'], ['otra', 'Otra situación']] },
    { campo: 'lugar', pregunta: '¿Dónde sueles seguir los partidos?',
      opciones: [['estadio', 'En el estadio'], ['casa', 'En casa'], ['bar', 'En un bar'], ['varios', 'En varios sitios']] },
    { campo: 'lector', pregunta: '¿Usas lector de pantalla, como VoiceOver o TalkBack?',
      opciones: [['si', 'Sí, siempre'], ['aveces', 'A veces'], ['no', 'No']] }
  ];

  function textoOpcion(campo, valor) {
    var pregunta = PREGUNTAS.filter(function (p) { return p.campo === campo; })[0];
    var opcion = pregunta.opciones.filter(function (o) { return o[0] === valor; })[0];
    return opcion ? opcion[1] : 'Sin responder';
  }

  /* Perfil propuesto a partir de las respuestas (R9.1.4): es un punto de partida que se puede cambiar. */
  function proponer() {
    var ceguera = borrador.vision === 'nada';
    borrador.tema = ceguera ? 'estandar' : 'contraste';
    borrador.texto = ceguera ? 'normal' : 'grande';
    // Quien usa siempre lector de pantalla no necesita que la app hable además (D-09).
    borrador.vozApp = borrador.lector !== 'si';
  }

  var NOMBRE_PERFIL = { ceguera: 'ceguera total', baja: 'baja visión' };
  function perfilDe(vision) { return vision === 'nada' ? 'ceguera' : 'baja'; }

  /* ---------- P01 Bienvenida ---------- */
  FV.pantallas.bienvenida = {
    titulo: 'Bienvenida a ' + FV.NOMBRE_APP,
    volver: false, estado: false,
    html: function () {
      // El emblema es decorativo (aria-hidden) y se coloca encima del título solo con CSS.
      return '<div class="emblema" aria-hidden="true">' + FV.LOGO + '</div>' +
        '<p>Vamos a adaptar la app a tu forma de ver. Son tres preguntas y tardarás menos de un minuto.</p>' +
        '<div class="acciones">' + ui.boton('Empezar', 'empezar', 'principal') + '</div>';
    },
    acciones: {
      empezar: function () { FV.ir('cuestionario', { paso: 1 }); }
    }
  };

  /* ---------- P02 Cuestionario (una pregunta por pantalla) ---------- */
  FV.pantallas.cuestionario = {
    // El paso va en el título: el lector anuncia «Paso 1 de 3» al entrar.
    titulo: function (p) { return 'Paso ' + p.paso + ' de 3: ' + PREGUNTAS[p.paso - 1].pregunta; },
    volver: true, estado: false,
    html: function (p) {
      var q = PREGUNTAS[p.paso - 1];
      /* Barra de progreso decorativa: el paso ya se lee en el título («Paso 1 de 3»). */
      var pasos = [1, 2, 3].map(function (n) { return '<span' + (n <= p.paso ? ' class="hecho"' : '') + '></span>'; }).join('');
      return '<div class="pasos" aria-hidden="true">' + pasos + '</div>' +
        '<form data-form="siguiente" novalidate>' +
        ui.grupo({ nombre: q.campo, etiquetadoPor: 'titulo', opciones: q.opciones, valor: borrador[q.campo], obligatorio: true, cambio: 'anotar' }) +
        '<div class="acciones"><button type="submit" class="btn principal">' + (p.paso < 3 ? 'Siguiente' : 'Ver mi perfil') + '</button></div>' +
        '</form>';
    },
    acciones: {
      // Se anota al elegir, para conservar la respuesta aunque se pulse «Volver».
      anotar: function (campo) { borrador[campo.name] = campo.value; },
      // No se avanza al elegir: el usuario confirma con «Siguiente» (sin cambios de pantalla inesperados).
      siguiente: function (formulario, p) {
        if (!FV.validar(formulario)) return;
        if (p.paso < 3) FV.ir('cuestionario', { paso: p.paso + 1 });
        else { proponer(); FV.ir('perfil', {}); }
      }
    }
  };

  /* ---------- P03 Perfil propuesto: resumen antes de guardar ---------- */
  FV.pantallas.perfil = {
    titulo: function (p) {
      return p.desdeConfig ? 'Mi perfil: ' + NOMBRE_PERFIL[perfilDe(borrador.vision)]
        : 'Tu perfil propuesto: ' + NOMBRE_PERFIL[perfilDe(borrador.vision)];
    },
    volver: true, estado: false,
    html: function (p) {
      var resumen = '<div class="bloque"><h2>Tus respuestas</h2><ul>' +
        '<li>Visión: ' + textoOpcion('vision', borrador.vision) + '</li>' +
        '<li>Lugar habitual: ' + textoOpcion('lugar', borrador.lugar) + '</li>' +
        '<li>Lector de pantalla: ' + textoOpcion('lector', borrador.lector) + '</li>' +
        '</ul></div>';

      if (!p.personalizar) {
        return resumen +
          '<p>La app usará ' + (borrador.tema === 'contraste' ? 'alto contraste y letra grande' : 'el tema estándar') +
          ', narración normal y vibración para los eventos.' +
          (borrador.vozApp ? ' Además, leerá sus mensajes en voz alta.' : ' Los mensajes los leerá tu lector de pantalla.') + '</p>' +
          '<div class="acciones">' +
          ui.boton('Personalizar', 'personalizar') +
          ui.boton('Aceptar y guardar', 'guardar', 'principal') +
          '</div>';
      }
      return resumen +
        '<form data-form="guardar" novalidate>' +
        ui.grupo({ nombre: 'tema', leyenda: 'Tema', valor: borrador.tema, cambio: 'probar',
          opciones: [['estandar', 'Estándar: fondo claro'], ['contraste', 'Alto contraste: fondo negro']] }) +
        ui.grupo({ nombre: 'texto', leyenda: 'Tamaño de texto', valor: borrador.texto, cambio: 'probar',
          opciones: [['normal', 'Normal'], ['grande', 'Grande'], ['muy', 'Muy grande']] }) +
        ui.grupo({ nombre: 'vozApp', leyenda: 'Voz de la app', valor: String(borrador.vozApp), cambio: 'probar',
          opciones: [['true', 'Activada: la app lee sus mensajes'], ['false', 'Desactivada: uso lector de pantalla']] }) +
        '<div class="acciones"><button type="submit" class="btn principal">Guardar preferencias</button></div>' +
        '</form>';
    },
    /* Vista previa: el perfil propuesto se ve antes de aceptarlo.
       Al salir sin guardar se recupera el aspecto guardado. */
    alEntrar: function () { FV.aplicarAspecto(borrador.tema, borrador.texto); },
    alSalir: function () { FV.aplicarAspecto(); },
    acciones: {
      personalizar: function (b, p) {
        FV.ir('perfil', { personalizar: true, desdeConfig: p.desdeConfig });
      },
      /* El cambio de tema o de tamaño se ve al momento: quien tiene baja visión
         puede comprobar si le sirve antes de guardar. */
      probar: function (campo) {
        borrador[campo.name] = campo.name === 'vozApp' ? campo.value === 'true' : campo.value;
        FV.aplicarAspecto(borrador.tema, borrador.texto);
      },
      guardar: function (b, p) {
        var prefs = FV.prefs;
        prefs.perfil = perfilDe(borrador.vision);
        prefs.respuestas = { vision: borrador.vision, lugar: borrador.lugar, lector: borrador.lector };
        prefs.tema = borrador.tema;
        prefs.texto = borrador.texto;
        prefs.vozApp = borrador.vozApp;
        FV.aplicarAspecto();
        if (p.desdeConfig) FV.ir('config', {}, { raiz: true });
        else FV.ir('inicio', {}, { raiz: true });
        FV.guardar('Preferencias guardadas.');
      }
    }
  };

  /* ---------- P04 Inicio ---------- */
  FV.pantallas.inicio = {
    titulo: 'Inicio',
    volver: false,
    html: function () {
      var s = FV.sesion;
      // Al volver a Inicio sin partido en curso se sale del modo «solo móvil» (Iteración 2).
      if (!FV.partido.e) s.soloMovil = false;
      var conectado = s.accesorio === 'conectado';
      var estado = conectado
        ? ui.estado(true, 'Accesorio conectado. Batería al ' + s.bateria + ' %.')
        : ui.estado(false, 'Accesorio sin conectar.');
      // La acción principal es siempre el siguiente paso lógico.
      var botones = conectado
        ? ui.boton('Elegir partido', 'partidos', 'principal grande')
        : ui.boton('Conectar accesorio', 'conectar', 'principal grande') +
          ui.boton('Seguir solo con el móvil <span class="etiqueta-beta">Beta · en desarrollo</span>', 'beta');
      return '<p>' + estado + '</p>' +
        '<div class="pila">' + botones + ui.boton('Configuración', 'config') + '</div>';
    },
    acciones: {
      conectar: function () { FV.ir('conectar', { estado: 'buscando' }); },
      partidos: function () { FV.ir('partidos', {}); },
      config: function () { FV.ir('config', {}); },
      beta: function () {
        FV.dialogo('Función en desarrollo',
          'Notarás los eventos en el móvil. La posición del balón necesita el accesorio.',
          [
            { texto: 'Continuar', principal: true, accion: function () { FV.sesion.soloMovil = true; FV.ir('partidos', {}); } },
            { texto: 'Volver' }
          ]);
      }
    }
  };

  /* ---------- P17 Configuración (separada de los controles rápidos, R9.2.4) ---------- */
  var NIVEL = { minima: 'mínima', normal: 'normal', detallada: 'detallada' };

  FV.pantallas.config = {
    titulo: 'Configuración',
    volver: true,
    html: function () {
      var p = FV.prefs;
      function fila(titulo, valor, accion) {
        return ui.boton(titulo + '<small>' + valor + '</small>', accion);
      }
      return '<div class="pila">' +
        fila('Mi perfil', NOMBRE_PERFIL[p.perfil] || 'Sin configurar', 'perfil') +
        fila('Vibración y narración', 'Intensidad ' + p.intensidad + ' · Narración ' + NIVEL[p.narracion], 'vibracion') +
        fila('Practicar patrones', p.ultimaPractica ? 'Última práctica: ' + FV.escapar(p.ultimaPractica) : 'Aún sin practicar', 'practica') +
        fila('Accesorio', p.emparejado ? FV.escapar(p.emparejado) : 'Ninguno emparejado', 'accesorio') +
        fila('Repetir el cuestionario', 'Sustituye tu perfil actual', 'repetir') +
        '</div>';
    },
    // Si se llega aquí tras guardar el perfil (raíz), «Volver» lleva a Inicio.
    acciones: {
      perfil: function () {
        var p = FV.prefs;
        borrador = { vision: p.respuestas.vision, lugar: p.respuestas.lugar, lector: p.respuestas.lector,
          tema: p.tema, texto: p.texto, vozApp: p.vozApp };
        FV.ir('perfil', { personalizar: true, desdeConfig: true });
      },
      vibracion: function () { FV.ir('vibracion', {}); },
      practica: function () { FV.ir('practica', { modo: 'aprender' }); },
      accesorio: function () {
        if (!FV.prefs.emparejado) { FV.ir('conectar', { estado: 'buscando' }); return; }
        FV.dialogo('Accesorio ' + FV.prefs.emparejado,
          'Si lo olvidas, tendrás que emparejarlo otra vez la próxima vez que lo conectes.',
          [
            { texto: 'Mantener emparejado', principal: true },
            { texto: 'Olvidar este accesorio', accion: function () {
              FV.prefs.emparejado = null;
              FV.sesion.accesorio = 'desconectado';
              FV.repintar('#titulo');
              FV.guardar('Accesorio olvidado.');
            } }
          ]);
      },
      repetir: function () {
        FV.dialogo('¿Repetir el cuestionario?', 'Se sustituirá tu perfil actual cuando guardes el nuevo.',
          [
            { texto: 'Cancelar', principal: true },
            { texto: 'Repetir el cuestionario', accion: function () {
              borrador = { vision: null, lugar: null, lector: null };
              FV.ir('cuestionario', { paso: 1 });
            } }
          ]);
      }
    }
  };
})(window.FV);
