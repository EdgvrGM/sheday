-- =============================================================
-- El celular pasa a ser el usuario nativo de Supabase Auth
-- (verificado con un código por WhatsApp). El correo queda opcional,
-- como respaldo para recuperar la contraseña.
--
-- Ejecútala ANTES de desplegar las pantallas nuevas: las cuentas que ya
-- existen necesitan su celular en auth.users para poder entrar.
-- Es segura con el código anterior (el login por correo sigue igual).
--
-- auth.users.phone se guarda sin "+": 52 + 10 dígitos ("523312345678").
-- profiles.phone se sigue guardando a 10 dígitos.
-- =============================================================

-- 1) Perfil nuevo: el celular sale de auth.users (si se registró con celular)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, phone, address)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(nullif(public.normalize_phone(new.phone), ''),
             public.normalize_phone(new.raw_user_meta_data ->> 'phone')),
    coalesce(new.raw_user_meta_data ->> 'address', '')
  );
  return new;
end;
$$;

-- 2) Cuando cambia el celular en Auth (ya verificado con código), copiarlo al perfil
create or replace function public.sync_profile_phone()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if public.normalize_phone(new.phone) <> ''
     and public.normalize_phone(new.phone) is distinct from public.normalize_phone(old.phone) then
    update public.profiles
       set phone = public.normalize_phone(new.phone)
     where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_phone_changed on auth.users;
create trigger on_auth_user_phone_changed
  after update of phone on auth.users
  for each row execute function public.sync_profile_phone();

-- 3) Desde la app, el celular del perfil solo puede ser el verificado en Auth.
--    Si alguien intenta otro (o place_order lo intenta llenar), se conserva el anterior.
--    Desde el SQL Editor / service_role (sin auth.uid()) no se bloquea.
create or replace function public.protect_profile_phone()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.phone is distinct from old.phone
     and auth.uid() is not null
     and public.normalize_phone(new.phone) is distinct from
         (select public.normalize_phone(u.phone) from auth.users u where u.id = new.id) then
    new.phone := old.phone;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_phone on public.profiles;
create trigger profiles_protect_phone
  before update on public.profiles
  for each row execute function public.protect_profile_phone();

-- 4) Cuentas que ya existen: copiar su celular a Auth y darlo por verificado
--    (ya lo usaban para iniciar sesión).
do $$
declare
  dupes text;
begin
  -- Celulares que ya usa OTRA cuenta en auth.users (no debería pasar)
  select string_agg(public.normalize_phone(p.phone), ', ') into dupes
    from public.profiles p
    join auth.users other
      on other.id <> p.id
     and public.normalize_phone(other.phone) = public.normalize_phone(p.phone)
   where public.normalize_phone(p.phone) ~ '^\d{10}$';
  if dupes is not null then
    raise exception 'Estos celulares ya están en otra cuenta de auth.users: %. Corrígelos y vuelve a ejecutar.', dupes;
  end if;
end;
$$;

update auth.users u
   set phone = '52' || public.normalize_phone(p.phone),
       phone_confirmed_at = coalesce(u.phone_confirmed_at, now())
  from public.profiles p
 where p.id = u.id
   and public.normalize_phone(p.phone) ~ '^\d{10}$'
   and coalesce(u.phone, '') = '';

-- Revisión: cuentas que se quedaron sin celular en Auth (solo podrán entrar con correo)
-- select u.id, u.email, p.full_name, p.phone
--   from auth.users u join public.profiles p on p.id = u.id
--  where coalesce(u.phone, '') = '';

-- 5) /api/login ya no existe: el navegador entra directo con celular + contraseña.
--    Borra esta función cuando el código nuevo ya esté desplegado:
-- drop function if exists public.auth_email_for_phone(text);
