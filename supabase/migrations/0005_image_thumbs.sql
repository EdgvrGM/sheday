-- =============================================================
-- Miniaturas de las fotos de producto (480 px) para la grilla,
-- la bolsa y el admin. La foto completa (1200 px) sigue en `path`.
--
-- Ejecútala ANTES de desplegar: el admin guarda `thumb_path` al subir fotos.
-- Las fotos que ya existen no tienen miniatura (queda null): la tienda usa
-- la foto completa, y se genera sola la próxima vez que guardes ese producto.
-- =============================================================

alter table public.product_images
  add column if not exists thumb_path text;
