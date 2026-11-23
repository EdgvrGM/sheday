-- =============================================================
-- Inicio de sesión con celular + contraseña.
-- El correo sigue siendo el usuario interno de Supabase Auth
-- (verificación y recuperación de contraseña por correo); el celular
-- es el identificador visible y debe ser único.
-- =============================================================

-- Últimos 10 dígitos (quita espacios, guiones y lada 52/521).
create or replace function public.normalize_phone(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 10);
$$;

-- Si ya hay celulares repetidos, avisa antes de crear el índice único.
do $$
declare
  dupes text;
begin
  select string_agg(n, ', ') into dupes
  from (
    select public.normalize_phone(phone) as n
    from public.profiles
    where public.normalize_phone(phone) <> ''
    group by 1
    having count(*) > 1
  ) d;
  if dupes is not null then
    raise exception 'Hay celulares repetidos en profiles: %. Corrígelos (update public.profiles set phone = ...) y vuelve a ejecutar esta migración.', dupes;
  end if;
end;
$$;

create unique index profiles_phone_unique
  on public.profiles (public.normalize_phone(phone))
  where public.normalize_phone(phone) <> '';

-- Busca el correo de una cuenta por su celular.
-- SOLO la puede ejecutar el servidor (service_role); nunca el navegador,
-- para que nadie pueda averiguar el correo de otra persona.
create function public.auth_email_for_phone(p_phone text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email
    from public.profiles p
    join auth.users u on u.id = p.id
   where public.normalize_phone(p_phone) <> ''
     and public.normalize_phone(p.phone) = public.normalize_phone(p_phone)
   limit 1;
$$;

revoke execute on function public.auth_email_for_phone(text) from public, anon, authenticated;
grant execute on function public.auth_email_for_phone(text) to service_role;

-- place_order ya NO cambia el celular del perfil (es el usuario de inicio de sesión).
-- El pedido guarda su propio número de contacto; el perfil solo completa nombre/dirección
-- y el celular únicamente si el perfil no tenía uno.
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
           (select pi.path from public.product_images pi
             where pi.product_id = p.id order by pi.sort_order, pi.id limit 1) as image_path
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
