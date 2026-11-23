-- =============================================================
-- Sheday: esquema inicial
-- Ejecutar en Supabase > SQL Editor (o con `supabase db push`).
-- =============================================================

-- ---------- Tipos ----------
create type public.user_role as enum ('customer', 'admin');
create type public.product_mode as enum ('stock', 'preorder');
create type public.order_status as enum (
  'pending',     -- recibido, falta confirmar por WhatsApp
  'confirmed',   -- confirmado con la clienta
  'ordered',     -- (sobre pedido) ya se pidió al proveedor
  'on_the_way',  -- en camino a entrega
  'delivered',   -- entregado y cobrado
  'cancelled'
);

-- ---------- Perfiles ----------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '',
  phone       text not null default '',
  address     text not null default '',
  role        public.user_role not null default 'customer',
  created_at  timestamptz not null default now()
);

-- Crea el perfil automáticamente al registrarse
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, address)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'address', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Evita que una clienta se cambie a sí misma el rol
create function public.protect_profile_role()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'No autorizado para cambiar el rol';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ---------- Configuración de la tienda (una sola fila) ----------
create table public.store_settings (
  id               boolean primary key default true check (id),
  whatsapp_number  text not null default '',          -- formato 521XXXXXXXXXX
  deposit_percent  int  not null default 50 check (deposit_percent between 0 and 100),
  delivery_notes   text not null default 'Entrega y pago en efectivo.',
  updated_at       timestamptz not null default now()
);
insert into public.store_settings default values;

-- ---------- Catálogo ----------
create table public.categories (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  sort_order  int  not null default 0
);

create table public.products (
  id             bigint generated always as identity primary key,
  name           text not null,
  description    text not null default '',
  price          numeric(10, 2) not null check (price >= 0),
  category_id    bigint references public.categories (id) on delete set null,
  mode           public.product_mode not null default 'stock',
  preorder_days  int check (preorder_days is null or preorder_days > 0), -- días estimados de llegada
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);
create index products_active_idx on public.products (is_active, created_at desc);

create table public.product_images (
  id          bigint generated always as identity primary key,
  product_id  bigint not null references public.products (id) on delete cascade,
  path        text not null,            -- ruta dentro del bucket product-images
  sort_order  int  not null default 0
);
create index product_images_product_idx on public.product_images (product_id, sort_order);

create table public.product_variants (
  id          bigint generated always as identity primary key,
  product_id  bigint not null references public.products (id) on delete cascade,
  size        text not null default 'Unitalla',
  color       text not null default '',
  stock       int  not null default 0 check (stock >= 0),
  unique (product_id, size, color)
);
create index product_variants_product_idx on public.product_variants (product_id);

-- ---------- Pedidos ----------
create table public.orders (
  id               bigint generated always as identity (start with 1001) primary key,
  user_id          uuid references auth.users (id) on delete set null,
  status           public.order_status not null default 'pending',
  customer_name    text not null,
  customer_phone   text not null,
  delivery_address text not null,
  notes            text not null default '',
  subtotal         numeric(10, 2) not null,
  deposit_required numeric(10, 2) not null default 0, -- anticipo de artículos sobre pedido
  admin_notes      text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);

create table public.order_items (
  id            bigint generated always as identity primary key,
  order_id      bigint not null references public.orders (id) on delete cascade,
  product_id    bigint references public.products (id) on delete set null,
  variant_id    bigint references public.product_variants (id) on delete set null,
  product_name  text not null,          -- copia al momento de comprar
  size          text not null,
  color         text not null,
  unit_price    numeric(10, 2) not null,
  quantity      int  not null check (quantity > 0),
  is_preorder   boolean not null default false,
  image_path    text
);
create index order_items_order_idx on public.order_items (order_id);

-- =============================================================
-- Funciones de negocio (RPC). Los pedidos SOLO se crean/modifican
-- por aquí, para que el stock y los precios no dependan del cliente.
-- =============================================================

-- items: [{ "variant_id": 1, "quantity": 2 }, ...]
create function public.place_order(
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
     set full_name = trim(customer_name), phone = trim(customer_phone), address = trim(delivery_address)
   where id = auth.uid();

  return v_order_id;
end;
$$;

-- Regresa al inventario las piezas en stock de un pedido
create function public.restock_order(p_order_id bigint)
returns void
language sql
security definer set search_path = ''
as $$
  update public.product_variants v
     set stock = v.stock + oi.quantity
    from public.order_items oi
   where oi.order_id = p_order_id
     and oi.variant_id = v.id
     and not oi.is_preorder;
$$;
revoke execute on function public.restock_order(bigint) from public, anon, authenticated;

-- La clienta puede cancelar mientras el pedido siga "pendiente"
create function public.cancel_my_order(p_order_id bigint)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.orders
     set status = 'cancelled', updated_at = now()
   where id = p_order_id and user_id = auth.uid() and status = 'pending';
  if not found then
    raise exception 'Este pedido ya no se puede cancelar desde la app. Escríbenos por WhatsApp.';
  end if;
  perform public.restock_order(p_order_id);
end;
$$;

-- Admin: cambiar estado (si se cancela, regresa el stock)
create function public.admin_set_order_status(
  p_order_id    bigint,
  p_status      public.order_status,
  p_admin_notes text default null
)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_old public.order_status;
begin
  if not public.is_admin() then
    raise exception 'No autorizado';
  end if;

  select status into v_old from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Pedido no encontrado';
  end if;
  if v_old = 'cancelled' and p_status <> 'cancelled' then
    raise exception 'Un pedido cancelado no se puede reactivar (el stock ya se liberó)';
  end if;

  update public.orders
     set status = p_status,
         admin_notes = coalesce(p_admin_notes, admin_notes),
         updated_at = now()
   where id = p_order_id;

  if p_status = 'cancelled' and v_old <> 'cancelled' then
    perform public.restock_order(p_order_id);
  end if;
end;
$$;

-- Requisito de Apple: la usuaria puede borrar su cuenta desde la app.
-- Sus pedidos se conservan (user_id queda en null) para tu contabilidad.
create function public.delete_my_account()
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

-- =============================================================
-- Seguridad a nivel de fila (RLS)
-- =============================================================
alter table public.profiles         enable row level security;
alter table public.store_settings   enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_images   enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;

-- Perfiles
create policy "perfil propio: leer" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "perfil propio: editar" on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin());

-- Configuración: todos leen, admin edita
create policy "settings: leer" on public.store_settings
  for select to anon, authenticated using (true);
create policy "settings: admin edita" on public.store_settings
  for update to authenticated using (public.is_admin());

-- Catálogo: público lee lo activo, admin todo
create policy "categorias: leer" on public.categories
  for select to anon, authenticated using (true);
create policy "categorias: admin" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "productos: leer activos" on public.products
  for select to anon, authenticated using (is_active or public.is_admin());
create policy "productos: admin" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "imagenes: leer" on public.product_images
  for select to anon, authenticated using (true);
create policy "imagenes: admin" on public.product_images
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "variantes: leer" on public.product_variants
  for select to anon, authenticated using (true);
create policy "variantes: admin" on public.product_variants
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Pedidos: solo lectura directa; escritura vía funciones
create policy "pedidos: leer propios" on public.orders
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "pedidos: admin edita" on public.orders
  for update to authenticated using (public.is_admin());

create policy "items: leer propios" on public.order_items
  for select to authenticated using (
    public.is_admin()
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- =============================================================
-- Storage: fotos de productos
-- =============================================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "fotos: leer" on storage.objects
  for select to anon, authenticated using (bucket_id = 'product-images');
create policy "fotos: admin sube" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
create policy "fotos: admin edita" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_admin());
create policy "fotos: admin borra" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());

-- =============================================================
-- Datos iniciales
-- =============================================================
insert into public.categories (name, sort_order) values
  ('Vestidos', 1), ('Blusas y tops', 2), ('Pantalones', 3), ('Faldas', 4),
  ('Conjuntos', 5), ('Ropa deportiva', 6), ('Accesorios', 7);

-- Después de registrarte en la app, hazte admin con:
--   update public.profiles set role = 'admin'
--    where id = (select id from auth.users where email = 'TU_CORREO');
