-- =============================================================
-- Fotos por color.
-- Cada foto puede llevar el color de la variante que muestra (product_images.color).
-- null = foto de todos los colores. En la tienda, al elegir un color la galería
-- muestra sus fotos más las de todos los colores.
--
-- También reemplaza:
--  * admin_save_product (0007): p_images acepta "color" en cada foto.
--  * place_order (0003): el pedido guarda la foto del color elegido (antes, siempre
--    la portada). Si ese color no tiene fotos propias, guarda la portada como antes.
-- Se puede ejecutar antes o después de desplegar el código: el código viejo no
-- manda colores y el nuevo, sin esta migración, simplemente no los guarda.
-- =============================================================

alter table public.product_images add column if not exists color text;

-- Igual que 0007 y además guarda el color de cada foto
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
  insert into public.product_images (product_id, path, thumb_path, sort_order, color)
  select v_id, img ->> 'path', nullif(img ->> 'thumb_path', ''), (ord - 1)::int,
         nullif(trim(coalesce(img ->> 'color', '')), '')
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

-- Igual que 0003, salvo la foto que se guarda en el pedido
create or replace function public.place_order(
  items            jsonb,
  customer_name    text,
  customer_phone   text,
  delivery_address text,
  notes            text default ''
)
returns bigint
language plpgsql
security definer set search_path = ''
as $$
declare
  v_order_id  bigint;
  v_item      jsonb;
  v_qty       int;
  v_variant   record;
  v_subtotal  numeric(10, 2) := 0;
  v_preorder  numeric(10, 2) := 0;
  v_deposit_pct int;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;
  if items is null or jsonb_array_length(items) = 0 then
    raise exception 'El carrito está vacío';
  end if;
  if coalesce(trim(customer_name), '') = '' or coalesce(trim(customer_phone), '') = ''
     or coalesce(trim(delivery_address), '') = '' then
    raise exception 'Faltan datos de contacto o dirección';
  end if;

  insert into public.orders (user_id, customer_name, customer_phone, delivery_address, notes, subtotal)
  values (auth.uid(), trim(customer_name), trim(customer_phone), trim(delivery_address), coalesce(notes, ''), 0)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(items) loop
    v_qty := (v_item ->> 'quantity')::int;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Cantidad inválida';
    end if;

    -- Bloquea la variante para evitar vender el mismo artículo dos veces
    select v.id, v.size, v.color, v.stock, p.id as product_id, p.name, p.price, p.mode, p.is_active,
           -- Foto del color elegido; si ese color no tiene fotos propias, la portada
           (select pi.path from public.product_images pi
             where pi.product_id = p.id
             order by (v.color <> '' and lower(coalesce(pi.color, '')) = lower(v.color)) desc,
                      pi.sort_order, pi.id
             limit 1) as image_path
      into v_variant
      from public.product_variants v
      join public.products p on p.id = v.product_id
     where v.id = (v_item ->> 'variant_id')::bigint
       for update of v;

    if not found or not v_variant.is_active then
      raise exception 'Un producto ya no está disponible';
    end if;

    if v_variant.mode = 'stock' then
      if v_variant.stock < v_qty then
        raise exception 'Sin existencias suficientes de "%" (talla %). Disponibles: %',
          v_variant.name, v_variant.size, v_variant.stock;
      end if;
      update public.product_variants set stock = stock - v_qty where id = v_variant.id;
    else
      v_preorder := v_preorder + v_variant.price * v_qty;
    end if;

    insert into public.order_items
      (order_id, product_id, variant_id, product_name, size, color, unit_price, quantity, is_preorder, image_path)
    values
      (v_order_id, v_variant.product_id, v_variant.id, v_variant.name, v_variant.size, v_variant.color,
       v_variant.price, v_qty, v_variant.mode = 'preorder', v_variant.image_path);

    v_subtotal := v_subtotal + v_variant.price * v_qty;
  end loop;

  select deposit_percent into v_deposit_pct from public.store_settings limit 1;

  update public.orders
     set subtotal = v_subtotal,
         deposit_required = round(v_preorder * coalesce(v_deposit_pct, 0) / 100.0, 2)
   where id = v_order_id;

  -- Guarda los datos de contacto en el perfil para la próxima vez
  update public.profiles
     set full_name = trim(customer_name),
         address   = trim(delivery_address),
         phone     = case when public.normalize_phone(phone) = ''
                            and not exists (select 1 from public.profiles o
                                             where o.id <> auth.uid()
                                               and public.normalize_phone(o.phone) = public.normalize_phone(customer_phone))
                          then trim(customer_phone) else phone end
   where id = auth.uid();

  return v_order_id;
end;
$$;
