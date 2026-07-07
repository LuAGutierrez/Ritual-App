-- ============================================================
-- Migración 013: Categorías premium (viajes, planes, fantasías)
-- Amplía el CHECK de category y agrega 30 rituales premium=true
-- ============================================================

ALTER TABLE public.rituals DROP CONSTRAINT rituals_category_check;
ALTER TABLE public.rituals ADD CONSTRAINT rituals_category_check
  CHECK (category IN ('conexion', 'diversion', 'intimidad', 'reto', 'viajes', 'planes', 'fantasias'));

INSERT INTO public.rituals (category, prompt, challenge, difficulty, premium) VALUES

-- VIAJES (10 rituales premium)
('viajes', '¿Cuál es el destino que más soñás conocer conmigo y por qué justo ese lugar?', NULL, 1, true),
('viajes', 'Si tuviéramos que armar la valija ya mismo para escaparnos un fin de semana, ¿a dónde iríamos?', NULL, 1, true),
('viajes', '¿Qué viaje que ya hicimos juntos repetirías sin dudarlo?', NULL, 1, true),
('viajes', '¿Hay un lugar de tu infancia que todavía no me mostraste y te gustaría hacerlo?', NULL, 2, true),
('viajes', 'Si pudiéramos vivir un año en cualquier ciudad del mundo, ¿cuál elegirías para los dos?', NULL, 1, true),
('viajes', '¿Qué tipo de viajero soy yo cuando estamos de vacaciones? ¿Te gusta o te vuelve loco/a?', NULL, 2, true),
('viajes', '¿Cuál fue el mejor amanecer o atardecer que vimos juntos?', NULL, 1, true),
('viajes', 'Si armáramos un viaje sorpresa el uno para el otro, ¿qué pistas te gustaría recibir?', 'Dejale una pista real a tu pareja antes de dormir.', 2, true),
('viajes', '¿Qué comida de otro lugar del mundo te gustaría probar conmigo?', NULL, 1, true),
('viajes', '¿Qué harías distinto en nuestro próximo viaje para que sea inolvidable?', NULL, 2, true),

-- PLANES (10 rituales premium)
('planes', '¿Qué plan pequeño podemos hacer esta semana que todavía no hicimos?', 'Elijan uno y pónganle fecha ahora.', 1, true),
('planes', '¿Cómo te imaginás un domingo perfecto juntos, de principio a fin?', NULL, 1, true),
('planes', '¿Qué proyecto en común te gustaría que empecemos este año?', NULL, 2, true),
('planes', 'Si tuviéramos un año sabático, ¿qué harían con ese tiempo?', NULL, 1, true),
('planes', '¿Qué tradición nueva te gustaría crear para nosotros?', NULL, 2, true),
('planes', '¿Cuál es un plan que venimos posponiendo y deberíamos poner fecha ya?', 'Pónganle fecha en el calendario antes de dormir.', 2, true),
('planes', '¿Cómo te gustaría celebrar nuestro próximo aniversario?', NULL, 1, true),
('planes', 'Si pudiéramos cambiar una rutina de nuestra semana, ¿cuál sería y por qué?', NULL, 2, true),
('planes', '¿Qué meta personal te gustaría que te ayude a cumplir este año?', NULL, 2, true),
('planes', '¿Dónde te gustaría que estemos viviendo dentro de 10 años?', NULL, 1, true),

-- FANTASÍAS (10 rituales premium)
('fantasias', '¿Cuál es una fantasía que tenés conmigo y todavía no me contaste?', NULL, 3, true),
('fantasias', '¿Qué escenario romántico soñás recrear conmigo alguna vez?', NULL, 2, true),
('fantasias', '¿Hay algo que viste en una película o serie que te gustaría vivir conmigo?', NULL, 2, true),
('fantasias', '¿Qué lugar inesperado te gustaría que tengamos una cita ahí?', NULL, 1, true),
('fantasias', 'Si pudieras diseñar la noche perfecta para los dos sin límites, ¿cómo sería?', NULL, 2, true),
('fantasias', '¿Qué versión tuya todavía no me mostraste del todo?', NULL, 3, true),
('fantasias', '¿Qué gesto mío te encendería la imaginación si lo hiciera de sorpresa?', NULL, 2, true),
('fantasias', '¿Hay un juego de roles o disfraz que te divertiría probar conmigo?', NULL, 3, true),
('fantasias', '¿Qué lugar de la casa nunca usamos para algo íntimo y te gustaría cambiar eso?', NULL, 3, true),
('fantasias', '¿Cuál es el piropo o palabra que más te gustaría escuchar de mí en el momento indicado?', NULL, 1, true);
