/* Voz y avisos.
   Hay dos canales distintos para no oír dos voces a la vez (D-09):
   - Mensajes de la INTERFAZ  -> región aria-live (los lee el lector de pantalla).
     Además, la app los dice con su voz si el usuario la tiene activada (no usa lector).
   - NARRACIÓN del partido    -> síntesis de voz (speechSynthesis) + subtítulo visible. */
(function (FV) {
  'use strict';

  FV.vozDisponible = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

  function el(id) { return document.getElementById(id); }

  /* Dice un texto con la voz del navegador. */
  FV.hablar = function (texto, alTerminar) {
    if (!FV.vozDisponible) { if (alTerminar) alTerminar(); return; }
    var frase = new SpeechSynthesisUtterance(texto);
    frase.lang = 'es-ES';
    frase.volume = FV.prefs.volumen / 5;
    // onerror también cuenta como final: si el navegador no tiene voces, la lectura no se queda colgada.
    if (alTerminar) { frase.onend = alTerminar; frase.onerror = alTerminar; }
    window.speechSynthesis.speak(frase);
  };

  FV.callar = function () {
    if (FV.vozDisponible) window.speechSynthesis.cancel();
  };

  /* Confirmación de la interfaz: texto visible + región aria-live="polite".
     Se vacía antes de escribir para que un mensaje repetido se vuelva a anunciar. */
  FV.avisar = function (texto, opciones) {
    var region = el('avisos');
    region.textContent = '';
    window.setTimeout(function () { region.textContent = texto; }, 60);
    if (FV.prefs.vozApp && !(opciones && opciones.sinVoz)) FV.hablar(texto);
  };

  /* Narración del partido.
     - Activa: la dice la voz y se muestra como subtítulo (sin región viva, para no duplicar).
     - En pausa o sin síntesis de voz: va como texto a la región aria-live, sin voz. */
  FV.narrar = function (texto) {
    var sub = el('subtitulo');
    if (!FV.sesion.narracionPausa && FV.vozDisponible) {
      sub.textContent = texto;
      sub.hidden = false;
      FV.hablar(texto);
    } else {
      sub.hidden = true;
      FV.avisar(texto, { sinVoz: true });
    }
  };

  FV.limpiarSubtitulo = function () { el('subtitulo').hidden = true; };

  /* ----- Lectura de textos largos (resumen, alineaciones), frase a frase -----
     Leer por frases permite detener la lectura y continuarla donde se quedó
     cuando un evento del directo la interrumpe (T8). El resumen NUNCA vibra. */
  var lectura = { frases: [], i: 0, activa: false, turno: 0, alCambiar: null };

  FV.lecturaActiva = function () { return lectura.activa; };
  FV.lecturaPendiente = function () { return !lectura.activa && lectura.i > 0 && lectura.i < lectura.frases.length; };

  function siguienteFrase(turno) {
    // «turno» descarta los finales de frase de una lectura ya cancelada.
    if (turno !== lectura.turno || !lectura.activa) return;
    if (lectura.i >= lectura.frases.length) {
      lectura.activa = false;
      lectura.i = 0;
      if (lectura.alCambiar) lectura.alCambiar();
      return;
    }
    FV.hablar(lectura.frases[lectura.i], function () {
      if (turno !== lectura.turno || !lectura.activa) return;
      lectura.i += 1;
      siguienteFrase(turno);
    });
  }

  /* Empieza una lectura nueva, o continúa la pendiente si «continuar» es true. */
  FV.leer = function (frases, alCambiar, continuar) {
    FV.callar();
    if (!continuar) { lectura.frases = frases; lectura.i = 0; }
    lectura.alCambiar = alCambiar;
    lectura.turno += 1;
    if (!FV.vozDisponible) {
      // Sin síntesis de voz, el texto queda en pantalla y el lector de pantalla puede leerlo.
      lectura.activa = false;
      FV.avisar('Este navegador no tiene voz. Puedes leer el texto en pantalla.', { sinVoz: true });
      return;
    }
    lectura.activa = true;
    siguienteFrase(lectura.turno);
  };

  /* Detiene la lectura conservando la posición. Devuelve true si había una lectura en curso. */
  FV.detenerLectura = function (olvidar) {
    var estaba = lectura.activa;
    lectura.activa = false;
    lectura.turno += 1;
    if (olvidar) { lectura.i = 0; lectura.alCambiar = null; }
    if (estaba) {
      FV.callar();
      if (lectura.alCambiar) lectura.alCambiar();   // la pantalla actualiza su botón («Continuar resumen»)
    }
    return estaba;
  };
})(window.FV);
