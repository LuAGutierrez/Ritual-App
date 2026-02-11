/**
 * Ritual — Datos de preguntas y retos para los 3 juegos
 */

function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
window.RitualShuffle = shuffle;

window.RitualDatos = {
  conexion: {
    suave: [
      "¿Qué es lo primero que notaste de mí cuando nos conocimos?",
      "¿Cuál es un recuerdo nuestro que te hace sonreír solo de pensarlo?",
      "¿Qué cosa pequeña que hago te hace sentir querido/a?",
      "¿En qué momento te sentiste más orgulloso/a de nosotros?",
      "¿Qué lugar compartido te gustaría volver a vivir conmigo?",
      "¿Qué canción o película asociás a nosotros y por qué?",
    ],
    profundo: [
      "¿Qué miedo tuyo me has contado solo a mí (o te gustaría contarme)?",
      "¿Qué necesidad emocional creés que no estoy viendo todavía?",
      "¿En qué momento sentiste que podías confiar en mí de verdad?",
      "¿Qué cosa que hicimos juntos te cambió o te marcó?",
      "¿Qué te cuesta decirme y por qué?",
      "¿Qué sueño para nuestra relación no hemos hablado aún?",
    ],
    vulnerable: [
      "¿Qué herida del pasado creés que aún te afecta en esta relación?",
      "¿En qué momento te sentiste más frágil conmigo y qué necesitabas?",
      "¿Qué cosa mía te duele o te cuesta aceptar, y qué harías con eso?",
      "¿Qué necesitás que te diga o que te muestre más a menudo?",
      "¿Qué sacrificio o renuncia sentís que hacés por nosotros y cómo te hace sentir?",
      "Si pudieras pedirme un solo cambio concreto para sentirte más amado/a, ¿cuál sería?",
    ],
  },
  picante: {
    nivel1: [
      "Miradnos a los ojos sin hablar durante un minuto. Quien sonría primero elige el siguiente reto.",
      "Un masaje de un minuto en los hombros. El que recibe dice en voz alta qué le gusta de la mano del otro.",
      "Decirle al otro una cosa que os guste de su cuerpo (que no sea obvia).",
      "Besar al otro en un lugar que no sea la boca. El otro elige el lugar.",
      "Contar un recuerdo en que os hayáis sentido atraídos el uno por el otro.",
    ],
    nivel2: [
      "Un beso lento de treinta segundos. Sin prisas.",
      "Susurrar al oído algo que os gustaría hacer juntos esta noche (sin obligación de hacerlo).",
      "El que recibe elige: un beso en el cuello o en la mano. El otro lo hace y mantiene el contacto 10 segundos.",
      "Decir en una frase qué os pone de el/la otro/a hoy, en este momento.",
      "Abrazar fuerte y quedarse así hasta que uno diga «gracias».",
    ],
    nivel3: [
      "Elegir un deseo que tengáis para los dos y decirlo en voz alta. El otro solo escucha y responde «te escucho».",
      "Un beso donde el que inicia para cuando quiera; el otro sigue el ritmo.",
      "Mirad a los ojos y decidid juntos si pasáis al siguiente reto o lo dejáis aquí. No hay respuesta incorrecta.",
      "El que quiera puede pedir un «sí», un «no» o un «ahora no» para algo concreto. El otro responde con honestidad.",
      "Un minuto de contacto: manos, mirada, o lo que acordéis. Luego hablar de cómo os sentisteis.",
    ],
  },
  eleccion: {
    opcionesA: [
      "Hablar sin filtro",
      "Un beso",
      "Un secreto",
      "Un masaje",
      "Un reto",
      "Una verdad",
    ],
    opcionesB: [
      "Hablar sin filtro",
      "Un beso",
      "Un secreto",
      "Un masaje",
      "Un reto",
      "Una verdad",
    ],
    premios: [
      "Los dos eligen una pregunta del otro y se la hacen. Responde quien quiera primero.",
      "Un beso donde el que elija el lugar lo decida. El otro acepta o propone otro lugar.",
      "Cada uno cuenta un deseo que tenga para la pareja (no hace falta cumplirlo ahora).",
      "Un minuto de mirada a los ojos. Luego decir en una palabra cómo os sentisteis.",
      "Un reto en común: el que tenga la idea lo dice y el otro puede sumar una condición.",
      "Una verdad que no hayáis dicho antes. Puede ser pequeña o grande.",
    ],
  },
};
