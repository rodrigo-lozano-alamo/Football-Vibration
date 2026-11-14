/* Motor del partido simulado: un temporizador avanza los minutos y reproduce los eventos del JSON. */
(function (FV) {
  'use strict';

  var P = FV.partido = { e: null };   // e = estado del partido en curso (null si no hay)
  var temporizador = null;

  function minuscula(texto) { return texto.charAt(0).toLowerCase() + texto.slice(1); }

  P.buscar = function (id) {
    return FV.datos.partidos.filter(function (p) { return p.id === id; })[0];
  };

  P.marcadorTexto = function (marcador) {
    var e = P.e;
    return e.p.local + ' ' + marcador[0] + ', ' + e.p.visitante + ' ' + marcador[1];
  };

  /* Hacia dónde ataca el equipo del usuario. En la segunda parte se cambia de campo. */
  P.textoAtaque = function () {
    var e = P.e;
    var localDerecha = e.parte === 1;
    var equipo = FV.sesion.equipo;
    var derecha = equipo === 'visitante' ? !localDerecha : localDerecha;
    var quien = equipo === 'ninguno' ? 'El ' + e.p.local + ' ataca' : 'Tu equipo ataca';
    return quien + (e.parte === 2 ? ' ahora' : '') + ' hacia la ' + (derecha ? 'derecha' : 'izquierda') + '.';
  };

  /* ---------- Ciclo de vida ---------- */
  P.iniciar = function (id) {
    var p = P.buscar(id);
    var min = p.minutoInicial || 0;
    var marcador = [0, 0];
    p.eventos.forEach(function (ev) {
      if (ev.min <= min && ev.marcador) marcador = ev.marcador.slice();
    });
    P.e = {
      p: p,
      min: min,                       // minuto real del partido
      marcador: marcador,             // marcador real
      minMostrado: min,               // lo que ve el usuario (se congela sin internet)
      marcadorMostrado: marcador.slice(),
      parte: min >= 46 ? 2 : 1,
      enDescanso: false,
      internet: true,
      sinActualizarDesde: null,
      ultimo: null,                   // último evento, para «Repetir último evento»
      finalizado: false,
      balon: [50, 50],
      iBalon: 0,
      enPausa: false
    };
    P.reanudar();
  };

  P.reanudar = function () {
    window.clearInterval(temporizador);
    if (!P.e || P.e.finalizado) return;
    P.e.enPausa = false;
    temporizador = window.setInterval(P.tic, FV.datos.segundosPorMinuto * 1000);
  };

  P.pausar = function () {
    window.clearInterval(temporizador);
    if (P.e) P.e.enPausa = true;
  };

  P.detener = function () {
    window.clearInterval(temporizador);
    P.e = null;
  };

  /* ---------- Avance de un minuto ---------- */
  P.tic = function () {
    var e = P.e;
    if (!e || e.finalizado) return;
    e.min += 1;

    // Posición del balón: una por minuto. Sin internet o en el descanso, el balón no se mueve.
    if (e.internet && !e.enDescanso) {
      var posiciones = FV.datos.balon.posiciones;
      e.balon = posiciones[e.iBalon % posiciones.length];
      e.iBalon += 1;
    }

    e.p.eventos.forEach(function (ev) {
      if (ev.min === e.min) procesar(ev);
    });

    if (e.internet) {
      e.minMostrado = e.min;
      e.marcadorMostrado = e.marcador.slice();
    }
    FV.sim.actualizar();
    FV.alCambiarPartido();
  };

  /* Salta al minuto anterior al siguiente evento (botón del simulador, para no esperar). */
  P.saltar = function () {
    var e = P.e;
    if (!e || e.finalizado) return;
    var siguientes = e.p.eventos.filter(function (ev) { return ev.min > e.min; });
    if (siguientes.length) e.min = siguientes[0].min - 1;
    P.tic();
  };

  /* ---------- Eventos ---------- */
  function procesar(ev) {
    var e = P.e;
    if (ev.marcador) e.marcador = ev.marcador.slice();
    if (ev.tipo === 'conexion-perdida') { P.cortarInternet(); return; }
    if (ev.tipo === 'conexion-recuperada') { P.recuperarInternet(); return; }

    if (ev.tipo === 'final') {
      if (!e.internet) P.recuperarInternet();
      e.finalizado = true;
      window.clearInterval(temporizador);
      e.minMostrado = e.min;
      e.marcadorMostrado = e.marcador.slice();
      FV.detenerLectura(true);
      // El final se anuncia por voz y texto, sin patrón de vibración.
      FV.ir('final', {}, { raiz: true });
      FV.narrar('Final del partido. ' + P.marcadorTexto(e.marcador) + '.');
      return;
    }

    /* Sin internet los eventos no llegan: no vibran ni se narran.
       Al recuperar la conexión NO se reproducen (R9.5.3); solo se anuncia el marcador actual (D-07). */
    if (!e.internet) return;

    if (ev.balon) e.balon = ev.balon;

    if (FV.EVENTOS_DEPORTIVOS.indexOf(ev.tipo) !== -1) { P.emitir(ev); return; }

    if (ev.tipo === 'comentario') {
      // Los comentarios solo se narran en el nivel «Detallada» (R9.4.1, R9.6.1).
      if (FV.prefs.narracion === 'detallada' && !FV.lecturaActiva()) FV.narrar(ev.largo);
    } else if (ev.tipo === 'inicio') {
      e.ultimo = { texto: 'Empieza el partido. ' + P.textoAtaque(), min: e.min };
      FV.vibrar('confirmacion', 'movil');
      FV.narrar(e.ultimo.texto);
    } else if (ev.tipo === 'descanso') {
      e.enDescanso = true;
      e.ultimo = { texto: 'Descanso. ' + P.marcadorTexto(e.marcador) + '.', min: e.min };
      FV.narrar(e.ultimo.texto);
    } else if (ev.tipo === 'segunda-parte') {
      // Aviso de cambio de campo: evita que el usuario siga el balón con el mapa mental al revés (T5).
      e.enDescanso = false;
      e.parte = 2;
      e.ultimo = { texto: 'Empieza la segunda parte. ' + P.textoAtaque(), min: e.min };
      FV.vibrar('confirmacion', 'movil');
      FV.narrar(e.ultimo.texto);
    }
  }

  /* Emite un evento deportivo: primero el patrón (canal principal) y después la narración (complemento). */
  P.emitir = function (ev) {
    var e = P.e;
    var texto = FV.prefs.narracion === 'minima' ? ev.corto : ev.largo;
    FV.vibrar(ev.tipo, 'accesorio');
    e.ultimo = { tipo: ev.tipo, texto: texto, min: e.min };

    var dicho = texto;
    // Si las vibraciones están en pausa, se recuerda en cada evento (T7).
    if (FV.sesion.vibracionesPausa) dicho += ' Vibraciones en pausa.';
    // Un evento interrumpe el resumen y se distingue de él con «En directo» (T8).
    if (FV.detenerLectura()) dicho = 'En directo: ' + minuscula(dicho);
    FV.narrar(dicho);
  };

  /* Evento lanzado a mano desde el simulador. */
  P.eventoManual = function (tipo) {
    var nombre = FV.PATRONES[tipo].nombre;
    if (!P.e || !P.e.internet || P.e.finalizado) {
      FV.vibrar(tipo, 'auto');
      return;
    }
    var texto = nombre + ' (lanzado desde el simulador).';
    P.emitir({ tipo: tipo, corto: texto, largo: texto });
    FV.alCambiarPartido();
  };

  /* Repite el último evento: patrón + narración, que empieza siempre por «Repetición:» (D-08). */
  P.repetir = function () {
    var e = P.e;
    if (!e || !e.ultimo) { FV.avisar('Aún no hay ningún evento.'); return; }
    if (e.ultimo.tipo) FV.vibrar(e.ultimo.tipo, 'accesorio');
    FV.narrar('Repetición: ' + minuscula(e.ultimo.texto));
  };

  /* Frases del resumen. Empieza siempre por «Resumen» y nunca vibra. */
  P.frasesResumen = function () {
    var e = P.e;
    var frases = ['Resumen.'];
    e.p.eventos.forEach(function (ev) {
      if (ev.min <= e.minMostrado && ['gol', 'golAnulado', 'penalti'].indexOf(ev.tipo) !== -1) {
        frases.push('Minuto ' + ev.min + ': ' + minuscula(ev.largo));
      }
    });
    if (frases.length === 1) frases.push('Todavía no ha habido goles ni penaltis.');
    frases.push((e.finalizado ? 'Resultado final: ' : 'Marcador actual: ') + P.marcadorTexto(e.marcadorMostrado) + '.');
    return frases;
  };

  /* ---------- Conexión a internet ---------- */
  P.cortarInternet = function () {
    var e = P.e;
    if (!e || !e.internet || e.finalizado) return;
    e.internet = false;
    e.sinActualizarDesde = e.minMostrado;
    FV.detenerLectura();

    /* El aviso sale SIEMPRE del móvil: vibración + voz + texto (R9.5.2).
       El accesorio solo repite el aviso si sigue conectado. */
    FV.vibrar('tecnico', 'movil');
    var conectado = FV.sesion.accesorio === 'conectado';
    if (conectado) FV.vibrar('tecnico', 'accesorio');

    FV.mostrarAviso(
      'Sin conexión a internet. Los datos del partido no se están actualizando. Intentando reconectar.' +
        (conectado ? ' El accesorio sigue conectado.' : ''),
      [
        { texto: 'Reintentar', principal: true, accion: P.reintentar },
        { texto: 'Finalizar sesión', accion: FV.pedirFinalizar }
      ],
      'fallo'
    );
    FV.alCambiarPartido();
  };

  P.reintentar = function () {
    // En el prototipo la conexión solo vuelve con el JSON o con el botón del simulador.
    if (P.e && !P.e.internet) FV.avisar('Todavía sin conexión.');
  };

  P.recuperarInternet = function () {
    var e = P.e;
    if (!e || e.internet) return;
    e.internet = true;
    e.sinActualizarDesde = null;
    e.minMostrado = e.min;
    e.marcadorMostrado = e.marcador.slice();
    // Sin patrones atrasados: una sola confirmación y el estado actual.
    FV.vibrar('confirmacion', 'movil');
    FV.mostrarAviso(
      'Conexión recuperada. Marcador: ' + P.marcadorTexto(e.marcador) + ', minuto ' + e.min + '.',
      [{ texto: 'Cerrar aviso', accion: FV.cerrarAviso }],
      'recuperado'
    );
    FV.sim.actualizar();
    FV.alCambiarPartido();
  };

  /* ---------- Accesorio ---------- */
  P.desconectarAccesorio = function () {
    var s = FV.sesion;
    if (s.accesorio !== 'conectado') return;
    s.accesorio = 'desconectado';
    // El accesorio desconectado no puede avisar: lo hace el móvil.
    FV.vibrar('tecnico', 'movil');
    var enPartido = P.e && !P.e.finalizado;
    var botones = [{
      texto: 'Volver a conectar el accesorio', principal: true,
      accion: function () { FV.cerrarAviso(); FV.ir('conectar', { estado: 'buscando', volverAlPartido: enPartido }); }
    }];
    if (enPartido) {
      botones.push({
        texto: 'Seguir solo con el móvil (beta)',
        accion: function () {
          s.soloMovil = true;
          FV.cerrarAviso();
          FV.avisar('Sigues solo con el móvil. Función en desarrollo: no hay posición del balón.');
          FV.sim.actualizar();
          FV.alCambiarPartido();
        }
      });
      botones.push({ texto: 'Finalizar sesión', accion: FV.pedirFinalizar });
    } else {
      botones.push({ texto: 'Cerrar aviso', accion: FV.cerrarAviso });
    }
    FV.mostrarAviso(
      'El accesorio se ha desconectado.' + (enPartido ? ' Seguirás oyendo la narración.' : ''),
      botones, 'fallo'
    );
    FV.sim.actualizar();
    if (FV.actual() === 'inicio' || FV.actual() === 'estado') FV.repintar();
    FV.alCambiarPartido();
  };
})(window.FV);
