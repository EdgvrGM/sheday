-- =============================================================
-- Corrige protect_profile_role: el bloqueo de cambio de rol solo
-- debe aplicar a peticiones de la app con sesión (auth.uid() no nulo).
-- Desde el SQL Editor / service_role no hay auth.uid(), y antes eso
-- impedía asignar el primer admin.
-- (Las peticiones anónimas no pueden editar perfiles: lo impide RLS.)
-- =============================================================
create or replace function public.protect_profile_role()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_admin() then
    raise exception 'No autorizado para cambiar el rol';
  end if;
  return new;
end;
$$;
