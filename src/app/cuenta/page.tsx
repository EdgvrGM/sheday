"use client";

import { LogOut, Trash2, UserCircle } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast";
import { Button, ButtonLink, Card, EmptyState, ErrorBox, Field, PageTitle, Spinner, TextArea } from "@/components/ui";
import { cartActions } from "@/lib/cart";
import { errorMessage } from "@/lib/errors";
import { formatPhone, isValidName, MAX, nameInput, phoneInput, textInput } from "@/lib/input";
import { getSupabase } from "@/lib/supabase/browser";

import { EmailSection } from "./email-section";
import { PhoneSection } from "./phone-section";

export default function AccountPage() {
  const { session, profile, initializing, refreshProfile, signOut } = useAuth();
  const toast = useToast();
  // null = sin editar (se muestra lo guardado en el perfil)
  const [nameDraft, setFullName] = useState<string | null>(null);
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
  // El celular verificado de Auth manda; el del perfil es una copia
  const phone = phoneInput(session.user.phone || profile?.phone || "");
  const address = addressDraft ?? profile?.address ?? "";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidName(fullName)) return setError("Escribe tu nombre.");
    setSaving(true);
    const { error } = await getSupabase()
      .from("profiles")
      .update({ full_name: fullName.trim(), address: address.trim() })
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
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <PageTitle>Mi cuenta</PageTitle>
      <Card>
        <span className="text-xs text-muted">Sesión iniciada con</span>
        <span className="text-lg font-semibold">{phone ? formatPhone(phone) : "Sin celular registrado"}</span>
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

      <PhoneSection current={phone} />
      <EmailSection user={session.user} />

      <div className="flex flex-col gap-3 border-t border-line pt-6">
        <Button kind="ghost" icon={LogOut} onClick={signOut}>
          Cerrar sesión
        </Button>
        <Button kind="danger" icon={Trash2} onClick={deleteAccount}>
          Eliminar mi cuenta
        </Button>
      </div>
    </div>
  );
}
