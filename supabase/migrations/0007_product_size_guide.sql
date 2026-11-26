-- =============================================================
-- Guía de tallas por producto.
-- Cada producto puede tener su propia tabla de medidas (en cm), que se edita en
-- su ficha del admin y se muestra en "Guía de tallas" de la página del producto.
-- Sin guía (null), la página no muestra el enlace.
--
-- Forma de products.size_guide:
--   {"figure": "pants",
--    "measures": ["cintura", "cadera", "entrepierna"],
--    "rows": [{"size": "MX9", "values": [65, 94, 76]}, ...]}
--   (values va en el orden de measures; null = sin dato)
--
-- También reemplaza admin_save_product (0006) para guardar la guía en la misma
-- transacción: p_product acepta "size_guide" (objeto o null).
-- Se puede ejecutar antes o después de desplegar el código: el código viejo no
-- manda la guía y el nuevo, sin esta migración, simplemente no la guarda.
-- =============================================================

alter table public.products add column if not exists size_guide jsonb;

alter table public.products drop constraint if exists products_size_guide_check;
alter table public.products add constraint products_size_guide_check
  check (size_guide is null or (jsonb_typeof(size_guide) = 'object' and length(size_guide::text) <= 8000));

-- Igual que 0006 y además guarda size_guide
create or replace function public.admin_save_product(
  p_product_id          bigint,
  p_product             jsonb,
  p_images              jsonb,
  p_variants            jsonb,
  p_removed_variant_ids bigint[] default '{}'
)
returns bigint
language plpgsql
security definer set search_path = ''
as $$
declare
  v_id      bigint := p_product_id;
  v_name    text := trim(coalesce(p_product ->> 'name', ''));
  v_mode    public.product_mode := coalesce(p_product ->> 'mode', 'stock')::public.product_mode;
  v_variant jsonb;
  v_vid     bigint;
  v_size    text;
  v_color   text;
  v_stock   int;
  v_orig    int;
  v_current int;
  -- JSON null o ausente = sin guía
  v_guide   jsonb := nullif(p_product -> 'size_guide', 'null'::jsonb);
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;
  if v_name = '' then
    raise exception 'Escribe el nombre del producto.';
  end if;
  if coalesce(jsonb_array_length(p_variants), 0) = 0 then
    raise exception 'Agrega al menos una talla.';
  end if;

  -- Datos del producto
  if v_id is null then
    insert into public.products (name, description, price, category_id, mode, preorder_days, is_active, size_guide)
    values (
      v_name,
      trim(coalesce(p_product ->> 'description', '')),
      (p_product ->> 'price')::numeric,
      (p_product ->> 'category_id')::bigint,
      v_mode,
      (p_product ->> 'preorder_days')::int,
      coalesce((p_product ->> 'is_active')::boolean, true),
      v_guide
    )
    returning id into v_id;
  else
    update public.products
       set name          = v_name,
           description   = trim(coalesce(p_product ->> 'description', '')),
           price         = (p_product ->> 'price')::numeric,
           category_id   = (p_product ->> 'category_id')::bigint,
           mode          = v_mode,
           preorder_days = (p_product ->> 'preorder_days')::int,
           is_active     = coalesce((p_product ->> 'is_active')::boolean, true),
           size_guide    = v_guide
     where id = v_id;
    if not found then
      raise exception 'Este producto ya no existe.';
    end if;
  end if;

  -- Fotos: se reescriben en el orden recibido
  delete from public.product_images where product_id = v_id;
  insert into public.product_images (product_id, path, thumb_path, sort_order)
  select v_id, img ->> 'path', nullif(img ->> 'thumb_path', ''), (ord - 1)::int
    from jsonb_array_elements(coalesce(p_images, '[]'::jsonb)) with ordinality as t(img, ord)
   where coalesce(img ->> 'path', '') <> '';

  -- Variantes borradas
  delete from public.product_variants
   where product_id = v_id and id = any(coalesce(p_removed_variant_ids, '{}'));

  -- Variantes existentes y nuevas
  for v_variant in select * from jsonb_array_elements(p_variants) loop
    v_vid   := (v_variant ->> 'id')::bigint;
    v_size  := trim(coalesce(v_variant ->> 'size', ''));
    v_color := trim(coalesce(v_variant ->> 'color', ''));
    -- Sobre pedido no maneja stock
    v_stock := case when v_mode = 'stock' then greatest(coalesce((v_variant ->> 'stock')::int, 0), 0) else 0 end;
    v_orig  := (v_variant ->> 'orig_stock')::int;

    if v_size = '' then
      raise exception 'Todas las variantes necesitan una talla.';
    end if;

    if v_vid is null then
      insert into public.product_variants (product_id, size, color, stock)
      values (v_id, v_size, v_color, v_stock);
      continue;
    end if;

    select stock into v_current
      from public.product_variants
     where id = v_vid and product_id = v_id
       for update;
    if not found then
      raise exception 'La talla "%" ya no existe. Recarga la página.', v_size;
    end if;

    if v_orig is not null and v_stock <> v_orig and v_current <> v_orig then
      raise exception 'El stock de la talla "%"% cambió mientras editabas (seguramente hubo una venta): ahora hay %. Revisa la cantidad y guarda otra vez.',
        v_size, case when v_color <> '' then ' color "' || v_color || '"' else '' end, v_current;
    end if;

    update public.product_variants
       set size  = v_size,
           color = v_color,
           -- Sin cambio en el formulario: se respeta lo que haya (pudo venderse algo)
           stock = case when v_orig is not null and v_stock = v_orig then stock else v_stock end
     where id = v_vid;
  end loop;

  return v_id;
end;
$$;

revoke execute on function public.admin_save_product(bigint, jsonb, jsonb, jsonb, bigint[]) from public, anon;
grant execute on function public.admin_save_product(bigint, jsonb, jsonb, jsonb, bigint[]) to authenticated;
