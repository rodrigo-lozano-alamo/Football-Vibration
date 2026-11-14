/* Preferencias del usuario (se guardan) y estado de la sesión (no se guarda). */
window.FV = window.FV || {};
(function (FV) {
  'use strict';
  var CLAVE = 'football-vibration-preferencias';

  var POR_DEFECTO = {
    perfil: null,                 // 'ceguera' | 'baja' | null (sin configurar)
    respuestas: { vision: null, lugar: null, lector: null },
    tema: 'estandar',             // 'estandar' | 'contraste'
    texto: 'normal',              // 'normal' | 'grande' | 'muy'
    vozApp: true,                 // la app lee sus mensajes en voz alta (D-09)
    intensidad: 3,                // 1 a 5 (la usa el accesorio; el móvil no puede regularla)
    reforzado: false,             // pulsos x1,5 (D-03)
    volumen: 3,                   // 1 a 5
    narracion: 'normal',          // 'minima' | 'normal' | 'detallada'
    emparejado: null,             // nombre del accesorio emparejado
    ultimaPractica: null,         // texto, p. ej. «5 de 5»
    equipo: null                  // nombre del equipo elegido la última vez (no volver a preguntarlo)
  };

  function copia(o) { return JSON.parse(JSON.stringify(o)); }

  FV.prefs = copia(POR_DEFECTO);

  /* localStorage puede fallar (modo privado, almacenamiento lleno o bloqueado).
     Por eso todo acceso va en try/catch y la app sigue funcionando sin él. */
  FV.cargarPrefs = function () {
    try {
      var texto = localStorage.getItem(CLAVE);
      if (!texto) return false;
      Object.assign(FV.prefs, JSON.parse(texto));
      return true;
    } catch (e) {
      return false;
    }
  };

  FV.guardarPrefs = function () {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(FV.prefs));
      return true;
    } catch (e) {
      return false;
    }
  };

  FV.borrarPrefs = function () {
    FV.prefs = copia(POR_DEFECTO);
    try { localStorage.removeItem(CLAVE); } catch (e) { /* sin almacenamiento: nada que borrar */ }
  };

  FV.nuevaSesion = function () {
    FV.sesion = {
      accesorio: 'desconectado',  // 'desconectado' | 'conectado'
      bateria: 90,
      soloMovil: false,           // modo beta sin accesorio (D-01)
      partidoId: null,
      equipo: null,               // 'local' | 'visitante' | 'ninguno'
      entorno: null,              // 'estadio' | 'casa' | 'bar'
      vibracionesPausa: false,
      narracionPausa: false
    };
  };
  FV.nuevaSesion();

  /* El tema y el tamaño se aplican con atributos en <html>; el CSS hace el resto. */
  FV.aplicarAspecto = function (tema, texto) {
    document.documentElement.dataset.tema = tema || FV.prefs.tema;
    document.documentElement.dataset.texto = texto || FV.prefs.texto;
  };
})(window.FV);
