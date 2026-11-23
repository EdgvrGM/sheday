"use client";

import { LogOut, Trash2, UserCircle } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { PhoneField } from "@/components/form-fields";
import { useToast } from "@/components/toast";
import { Button, ButtonLink, Card, EmptyState, ErrorBox, Field, PageTitle, Spinner, TextArea } from "@/components/ui";
import { cartActions } from "@/lib/cart";
import { errorMessage } from "@/lib/errors";
import { formatPhone, isValidName, isValidPhone, MAX, nameInput, phoneInput, textInput } from "@/lib/input";
import { getSupabase } from "@/lib/supabase/browser";

export default function AccountPage() {
  const { session, profile, initializing, refreshProfile, signOut } = useAuth();
  const toast = useToast();
  // null = sin editar (se muestra lo guardado en el perfil)
  const [nameDraft, setFullName] = useState<string | null>(null);
  const [phoneDraft, setPhone] = useState<string | null>(null);
  const [addressDraft, setAddress] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (initializing) return <Spinner />;

  if (!session) {
    return (
      <EmptyState icon={UserCircle} title="Bienvenida a Sheday" message="Crea tu cuenta para hacer pedidos y darles seguimiento.">
        <ButtonLink href="/login">Iniciar sesión</ButtonLink>
        <ButtonLink href="/registro" kind="secondary">
          Crear cuenta
        </ButtonLink>
      </EmptyState>
    );
  }

  const fullName = nameDraft ?? profile?.full_name ?? "";
  const savedPhone = phoneInput(profile?.phone ?? "");
  const phone = phoneDraft ?? savedPhone;
  const address = addressDraft ?? profile?.address ?? "";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidName(fullName)) return setError("Escribe tu nombre.");
    if (!isValidPhone(phone)) return setError("Escribe tu celular a 10 dígitos.");
    if (
      savedPhone &&
      phone !== savedPhone &&
      !window.confirm("Vas a cambiar tu celular. A partir de ahora iniciarás sesión con el número nuevo. ¿Continuar?")
    ) {
      return;
    }
    setSaving(true);
    const { error } = await getSupabase()
      .from("profiles")
      .update({ full_name: fullName.trim(), phone, address: address.trim() })
      .eq("id", session!.user.id);
    setSaving(false);
    if (error) return setError(errorMessage(error));
    await refreshProfile();
    toast("Datos guardados");
  }

  async function deleteAccount() {
    const ok = window.confirm(
      "Se borrará tu cuenta y no podrás recuperarla. Tus pedidos anteriores se conservan en el registro de la tienda. ¿Continuar?"
    );
    if (!ok) return;
    const { error } = await getSupabase().rpc("delete_my_account");
    if (error) return toast(errorMessage(error), "error");
    cartActions.clear();
    await signOut();
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <PageTitle>Mi cuenta</PageTitle>
      <Card>
        <span className="text-xs text-muted">Sesión iniciada con</span>
        <span className="text-lg font-semibold">{savedPhone ? formatPhone(savedPhone) : "Sin celular registrado"}</span>
        <span className="text-xs text-muted break-all">Correo de recuperación: {session.user.email}</span>
      </Card>

      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <h2 className="font-bold">Mis datos</h2>
        {error && <ErrorBox message={error} />}
        <Field
          label="Nombre completo"
          value={fullName}
          onChange={(e) => setFullName(nameInput(e.target.value))}
          autoComplete="name"
          autoCapitalize="words"
          maxLength={MAX.name}
        />
        <PhoneField label="Celular (WhatsApp)" value={phone} onChange={setPhone} hint="Con este número inicias sesión." />
        <TextArea
          label="Dirección de entrega"
          value={address}
          onChange={(e) => setAddress(textInput(e.target.value, MAX.address))}
          maxLength={MAX.address}
          autoComplete="street-address"
        />
        <Button type="submit" loading={saving}>
          Guardar
        </Button>
      </form>

      <Button kind="ghost" icon={LogOut} onClick={signOut}>
        Cerrar sesión
      </Button>
      <Button kind="danger" icon={Trash2} onClick={deleteAccount}>
        Eliminar mi cuenta
      </Button>
    </div>
  );
}
