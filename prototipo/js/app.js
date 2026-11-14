/* Navegación entre pantallas, gestión del foco, diálogos y utilidades de interfaz. */
(function (FV) {
  'use strict';

  FV.NOMBRE_APP = 'Football Vibration';
  FV.pantallas = {};          // cada archivo pantallas-*.js añade aquí las suyas
  FV.alCambiarPartido = function () {};   // lo redefine pantallas-partido.js

  var pila = [];              // historial para «Volver»
  var actual = null;          // { nombre, params }

  function $(selector) { return document.querySelector(selector); }

  FV.actual = function () { return actual ? actual.nombre : null; };
  FV.params = function () { return actual ? actual.params : {}; };

  /* ---------- Navegación ----------
     opciones.raiz: pantalla sin vuelta atrás (Inicio, Partido…), vacía el historial.
     opciones.reemplazar: sustituye la pantalla actual sin apilarla (cambios de estado). */
  FV.ir = function (nombre, params, opciones) {
    opciones = opciones || {};
    salir();
    if (opciones.raiz) pila = [];
    else if (actual && !opciones.reemplazar) pila.push(actual);
    actual = { nombre: nombre, params: params || {} };
    pintar(true);
  };

  FV.volver = function () {
    var pantalla = FV.pantallas[actual.nombre];
    // Una pantalla puede frenar la salida (p. ej. cambios sin guardar).
    if (pantalla.antesDeVolver && pantalla.antesDeVolver(actual.params) === false) return;
    salir();
    actual = pila.pop() || { nombre: 'inicio', params: {} };
    pintar(true);
  };

  /* Vuelve a pintar la pantalla actual. «foco» es el selector del elemento que debe recibir el foco. */
  FV.repintar = function (foco) {
    pintar(false);
    if (foco) enfocar(foco);
  };

  function salir() {
    if (!actual) return;
    var pantalla = FV.pantallas[actual.nombre];
    if (pantalla.alSalir) pantalla.alSalir(actual.params);
  }

  function enfocar(selector) {
    var destino = $(selector);
    if (destino) destino.focus();
  }

  function pintar(entrando) {
    var pantalla = FV.pantallas[actual.nombre];
    var params = actual.params;
    var titulo = typeof pantalla.titulo === 'function' ? pantalla.titulo(params) : pantalla.titulo;

    /* Un único h1 por pantalla. tabindex="-1" permite darle el foco por programa
       sin añadirlo al recorrido del tabulador. */
    $('#principal').innerHTML = '<h1 id="titulo" tabindex="-1">' + titulo + '</h1>' + pantalla.html(params);
    document.title = titulo.replace(/<[^>]+>/g, '') + ' · ' + FV.NOMBRE_APP;

    // Los botones de la barra no cambian de sitio: si no aplican, se ocultan conservando el hueco.
    $('#btn-volver').classList.toggle('invisible', !pantalla.volver);
    $('#btn-estado').classList.toggle('invisible', pantalla.estado === false);

    if (entrando) {
      // Las confirmaciones de la pantalla anterior ya no aplican: se borran para no dejar texto antiguo.
      $('#avisos').textContent = '';
      if (pantalla.alEntrar) pantalla.alEntrar(params);
      /* Gestión del foco: al cambiar de pantalla, el foco va al título (o al mensaje de estado).
         Así el lector de pantalla anuncia dónde está el usuario (R9.2.3). */
      enfocar(pantalla.foco || '#titulo');
      window.scrollTo(0, 0);
    }
  }

  /* ---------- Eventos delegados ----------
     Cada botón lleva data-accion="nombre"; la pantalla define acciones.nombre. */
  function accion(nombre, elemento) {
    var pantalla = FV.pantallas[actual.nombre];
    if (pantalla.acciones && pantalla.acciones[nombre]) pantalla.acciones[nombre](elemento, actual.params);
  }

  function iniciarEventos() {
    var principal = $('#principal');
    principal.addEventListener('click', function (evento) {
      var boton = evento.target.closest('[data-accion]');
      if (boton) accion(boton.dataset.accion, boton);
    });
    principal.addEventListener('change', function (evento) {
      var campo = evento.target.closest('[data-cambio]');
      if (campo) accion(campo.dataset.cambio, campo);
      // Al corregir un grupo con error, el error desaparece.
      var grupo = evento.target.closest('fieldset[aria-invalid="true"]');
      if (grupo) marcarGrupo(grupo, true);
    });
    principal.addEventListener('submit', function (evento) {
      evento.preventDefault();
      accion(evento.target.dataset.form, evento.target);
    });
    $('#btn-volver').addEventListener('click', FV.volver);
    $('#btn-estado').addEventListener('click', function () {
      if (actual.nombre !== 'estado') FV.ir('estado');
    });
  }

  /* ---------- Validación de formularios ----------
     Campos obligatorios, error asociado con aria-describedby y foco en el primer error. */
  function marcarGrupo(grupo, valido) {
    var error = grupo.querySelector('.error');
    grupo.setAttribute('aria-invalid', String(!valido));
    error.hidden = valido;
    error.textContent = valido ? '' : 'Elige una opción para continuar.';
  }

  FV.validar = function (formulario) {
    var primero = null;
    formulario.querySelectorAll('fieldset[data-obligatorio]').forEach(function (grupo) {
      var valido = !!grupo.querySelector('input:checked');
      marcarGrupo(grupo, valido);
      if (!valido && !primero) primero = grupo.querySelector('input');
    });
    // Foco en el primer campo con error: el lector lee la opción y, por aria-describedby, el mensaje.
    if (primero) primero.focus();
    return !primero;
  };

  FV.valor = function (formulario, nombre) {
    var marcado = formulario.querySelector('input[name="' + nombre + '"]:checked');
    return marcado ? marcado.value : null;
  };

  /* ---------- Piezas de HTML ---------- */
  /* Emblema de la app (un balón con ondas de vibración). Es decorativo: siempre va con aria-hidden. */
  FV.LOGO = '<svg viewBox="0 0 48 48" focusable="false"><circle cx="24" cy="24" r="8"/><path d="M12 15a13 13 0 0 0 0 18M36 15a13 13 0 0 1 0 18M5 9a22 22 0 0 0 0 30M43 9a22 22 0 0 1 0 30"/></svg>';

  FV.ui = {
    boton: function (texto, accion, clase, atributos) {
      return '<button type="button" class="btn ' + (clase || '') + '" data-accion="' + accion + '" ' + (atributos || '') + '>' + texto + '</button>';
    },

    /* Grupo de selección única con radios nativos (se manejan con las flechas del teclado).
       c: { nombre, leyenda | etiquetadoPor, opciones: [[valor, texto]], valor, obligatorio, cambio } */
    grupo: function (c) {
      var idError = 'error-' + c.nombre;
      var opciones = c.opciones.map(function (o) {
        return '<label class="opcion"><input type="radio" name="' + c.nombre + '" value="' + o[0] + '"' +
          (o[0] === c.valor ? ' checked' : '') +
          (c.cambio ? ' data-cambio="' + c.cambio + '"' : '') +
          ' aria-describedby="' + idError + '"><span>' + o[1] + '</span></label>';
      }).join('');
      return '<fieldset role="radiogroup"' +
        (c.obligatorio ? ' data-obligatorio aria-required="true"' : '') +
        (c.etiquetadoPor ? ' aria-labelledby="' + c.etiquetadoPor + '"' : '') + '>' +
        (c.leyenda ? '<legend>' + c.leyenda + '</legend>' : '') +
        opciones +
        '<p class="error" id="' + idError + '" hidden></p>' +
        '</fieldset>';
    },

    /* Estado con icono y texto, nunca solo con color. El icono es decorativo. */
    estado: function (bien, texto) {
      return '<span class="estado ' + (bien ? 'ok' : 'mal') + '"><span aria-hidden="true">' + (bien ? '✓' : '⚠') + '</span> ' + texto + '</span>';
    }
  };

  /* ---------- Diálogo de confirmación ----------
     botones: [{ texto, principal, accion }]. El primero recibe el foco: debe ser la opción segura. */
  FV.dialogo = function (titulo, texto, botones) {
    var dialogo = $('#dialogo');
    $('#dialogo-titulo').textContent = titulo;
    $('#dialogo-texto').textContent = texto;
    var zona = $('#dialogo-botones');
    zona.innerHTML = '';
    botones.forEach(function (b) {
      var boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'btn ' + (b.principal ? 'principal' : '');
      boton.textContent = b.texto;
      boton.addEventListener('click', function () {
        dialogo.close();
        if (b.accion) b.accion();
      });
      zona.appendChild(boton);
    });
    dialogo.showModal();
  };

  /* ---------- Aviso de conexión (P14) ----------
     tipo: 'fallo' | 'recuperado'. botones: [{ texto, principal, accion }]. */
  var cierreAviso = null;

  FV.mostrarAviso = function (texto, botones, tipo) {
    var seccion = $('#aviso-conexion');
    window.clearTimeout(cierreAviso);
    seccion.hidden = false;
    seccion.classList.toggle('recuperado', tipo === 'recuperado');
    var zona = $('#aviso-botones');
    zona.innerHTML = '';
    (botones || []).forEach(function (b) {
      var boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'btn ' + (b.principal ? 'principal' : '');
      boton.textContent = b.texto;
      boton.addEventListener('click', b.accion);
      zona.appendChild(boton);
    });
    // El texto se escribe después de mostrar la sección para que role="alert" lo anuncie.
    var parrafo = $('#aviso-texto');
    parrafo.textContent = '';
    window.setTimeout(function () {
      parrafo.innerHTML = '<span aria-hidden="true">' + (tipo === 'recuperado' ? '✓' : '⚠') + '</span> ' + texto;
    }, 60);
    if (FV.prefs.vozApp) FV.hablar(texto);
    /* El aviso no se cierra solo: quien lee despacio no lo pierde (Iteración 2).
       Fuera de Partido se acerca a la vista; en Partido no, para no mover los controles. */
    if (FV.actual() !== 'partido') seccion.scrollIntoView({ block: 'nearest' });
  };

  FV.cerrarAviso = function () {
    var seccion = $('#aviso-conexion');
    window.clearTimeout(cierreAviso);
    // Si el foco estaba dentro del aviso, se lleva al título para no perderlo.
    if (seccion.contains(document.activeElement)) enfocar('#titulo');
    seccion.hidden = true;
    $('#aviso-texto').textContent = '';
    $('#aviso-botones').innerHTML = '';
  };

  /* ---------- Guardado con aviso de fallo ---------- */
  FV.guardar = function (mensaje) {
    var guardado = FV.guardarPrefs();
    FV.vibrar('confirmacion', 'movil');
    FV.avisar(guardado ? mensaje : mensaje + ' No he podido guardarlas en este móvil: se perderán al cerrar la app.');
  };

  /* ---------- Datos del partido ----------
     fetch() no funciona al abrir index.html directamente (file://).
     En ese caso se usa la copia de js/datos-respaldo.js. */
  FV.cargarDatos = function () {
    // Con file:// el navegador bloquea fetch: se va directamente a la copia, sin errores en la consola.
    if (window.location.protocol === 'file:') {
      FV.datos = window.FV_DATOS_RESPALDO || null;
      return Promise.resolve(FV.datos);
    }
    return fetch('data/partido-simulado.json')
      .then(function (respuesta) {
        if (!respuesta.ok) throw new Error('sin datos');
        return respuesta.json();
      })
      .catch(function () { return window.FV_DATOS_RESPALDO || null; })
      .then(function (datos) { FV.datos = datos; return datos; });
  };

  /* ---------- Botón «atrás» del móvil o del navegador (Iteración 2) ----------
     Sin esto, el botón «atrás» de Android sacaba al usuario de la app y se perdía el partido.
     Ahora hace lo mismo que «Volver»; en Partido pide confirmación antes de salir. */
  function rearmarAtras() {
    try { window.history.pushState({ fv: true }, ''); } catch (e) { /* sin historial: se ignora */ }
  }

  function alRetroceder() {
    var dialogo = $('#dialogo');
    if (dialogo.open) { dialogo.close(); rearmarAtras(); return; }
    var enPartido = FV.partido.e && !FV.partido.e.finalizado;
    if (FV.pantallas[actual.nombre].volver) { rearmarAtras(); FV.volver(); }
    else if (enPartido) { rearmarAtras(); FV.pedirFinalizar(); }
    // En una pantalla raíz sin partido en curso, «atrás» sale de la app con normalidad.
  }

  /* ---------- Arranque ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    var habiaPerfil = FV.cargarPrefs();
    // Sin perfil guardado, se respeta la preferencia de contraste del sistema.
    if (!habiaPerfil && window.matchMedia('(prefers-contrast: more)').matches) FV.prefs.tema = 'contraste';
    FV.aplicarAspecto();
    iniciarEventos();
    rearmarAtras();
    window.addEventListener('popstate', alRetroceder);
    FV.sim.iniciar();
    FV.cargarDatos().then(function () {
      FV.ir(FV.prefs.perfil ? 'inicio' : 'bienvenida', {}, { raiz: true });
    });
  });
})(window.FV);
