-- ============================================================
-- Migración 052: Dado Picante -- 5 posiciones más al dado 2
-- (pool pasa de 6 a 11). Solo contenido, sin cambios de esquema.
-- ============================================================

INSERT INTO public.dado_picante_items (tipo, texto) VALUES
('posicion', 'Cucharita'),
('posicion', 'Vaquera'),
('posicion', 'Vaquera invertida'),
('posicion', '69'),
('posicion', 'Entrelazados');
