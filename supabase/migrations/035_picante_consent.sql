-- ============================================================
-- Migración 035: consentimiento explícito para el modo picante
-- (sección 5/9 del pedido de evolución de juegos: "nunca forzar
-- contenido que la pareja no haya habilitado").
--
-- Hoy el tab "Picante" en Elección/Verdad o Reto/Esto o Aquello es
-- libre, sin ningún gate -- se agrega un campo de consentimiento a
-- nivel pareja.
--
-- El primer DEFAULT true aplica solo a las filas EXISTENTES al correr
-- esta migración (parejas que ya tenían acceso libre hasta hoy, no se
-- les corta el hábito). El segundo ALTER cambia el default para toda
-- fila nueva de acá en adelante -- parejas nuevas arrancan bloqueadas
-- y confirman explícitamente antes de ver contenido +18.
--
-- Sin función SECURITY DEFINER: la policy couples_update_member
-- (migración 001) ya permite que cualquier miembro actualice su fila
-- de couples directamente -- este campo no es privado ni adversarial
-- entre los dos miembros (a diferencia de user1_choice/user2_choice,
-- acá no hay nada que uno pueda pisarle al otro).
-- ============================================================

ALTER TABLE public.couples ADD COLUMN picante_habilitado boolean NOT NULL DEFAULT true;
ALTER TABLE public.couples ALTER COLUMN picante_habilitado SET DEFAULT false;
