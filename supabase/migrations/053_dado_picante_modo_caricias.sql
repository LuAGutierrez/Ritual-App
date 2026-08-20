-- ============================================================
-- Migración 053: Dado Picante -- modo "Caricias" (acción + zona),
-- segundo modo dentro del mismo juego, no un juego nuevo. El modo
-- "Posiciones" (lugar + posición, migración 051/052) es un registro
-- más explícito; "Caricias" es juego previo, así que van como dos
-- pares de dados separados en vez de mezclar los 4 en una tirada
-- (evita combos incoherentes tipo "posición: 69" + "acariciar: pie").
-- ============================================================

ALTER TABLE public.dado_picante_items DROP CONSTRAINT dado_picante_items_tipo_check;
ALTER TABLE public.dado_picante_items ADD CONSTRAINT dado_picante_items_tipo_check
  CHECK (tipo IN ('lugar', 'posicion', 'accion', 'zona'));

INSERT INTO public.dado_picante_items (tipo, texto) VALUES
('accion', 'Besar'),
('accion', 'Acariciar'),
('accion', 'Chupar'),
('accion', 'Apretar'),
('accion', 'Morder'),
('accion', 'Lamer'),
('accion', 'Soplar'),
('zona', 'Cuello'),
('zona', 'Orejas'),
('zona', 'Cachetes'),
('zona', 'Labios'),
('zona', 'Nuca'),
('zona', 'Espalda baja'),
('zona', 'Pezón'),
('zona', 'Cintura'),
('zona', 'Muslos internos'),
('zona', 'Culo'),
('zona', 'Dedo'),
('zona', 'Pie');
