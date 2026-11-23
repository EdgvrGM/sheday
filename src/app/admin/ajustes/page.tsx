"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useToast } from "@/components/toast";
import { Button, ErrorBox, Field, PageTitle, Spinner, TextArea } from "@/components/ui";
import { errorMessage } from "@/lib/errors";
import { PhoneField } from "@/components/form-fields";
import { toWhatsAppNumber } from "@/lib/format";
import { digitsInput, isValidPhone, MAX, phoneInput, textInput } from "@/lib/input";
import { fetchSettings } from "@/lib/queries";
import { getSupabase } from "@/lib/supabase/browser";

export default function AdminSettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [deposit, setDeposit] = useState("50");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  useEffect(() => {
    fetchSettings(getSupabase())
      .then((s) => {
        setWhatsapp(phoneInput(s.whatsapp_number));
        setDeposit(String(s.deposit_percent));
        setDeliveryNotes(s.delivery_notes);
      })
      .catch((e) => setError(errorMessage(e)))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return <Spinner />;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const pct = Number(deposit);
    if (!Number.isInteger(pct) || pct < 0 || pct > 100) return setError("El anticipo debe ser un número entre 0 y 100.");
    if (!isValidPhone(whatsapp)) return setError("Escribe el número de WhatsApp a 10 dígitos.");

    setSaving(true);
    const { error } = await getSupabase()
      .from("store_settings")
      .update({
        whatsapp_number: toWhatsAppNumber(whatsapp),
        deposit_percent: pct,
        delivery_notes: deliveryNotes.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    setSaving(false);
    if (error) return setError(errorMessage(error));
    toast("Ajustes guardados");
    router.push("/admin");
  }

  return (
    <form onSubmit={save} noValidate className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <Link href="/admin" className="flex items-center gap-1 text-sm text-muted">
        <ArrowLeft className="size-4" /> Administración
      </Link>
      <PageTitle>Ajustes de la tienda</PageTitle>
      <PhoneField
        label="WhatsApp de la tienda"
        value={whatsapp}
        onChange={setWhatsapp}
        hint="10 dígitos; se guarda con el prefijo 52 de México."
      />
      <Field
        label="Anticipo para artículos sobre pedido (%)"
        inputMode="numeric"
        value={deposit}
        onChange={(e) => setDeposit(String(Math.min(100, Number(digitsInput(e.target.value, 3) || "0"))).replace(/^0(?=\d)/, ""))}
        hint="De 0 a 100."
        maxLength={3}
      />
      <TextArea
        label="Aviso de entrega (se muestra al confirmar)"
        value={deliveryNotes}
        onChange={(e) => setDeliveryNotes(textInput(e.target.value, MAX.deliveryNotes))}
        maxLength={MAX.deliveryNotes}
      />
      <p className="text-xs text-muted">El anticipo se calcula al crear el pedido; cambiarlo no afecta pedidos anteriores.</p>
      {error && <ErrorBox message={error} />}
      <Button type="submit" loading={saving}>
        Guardar
      </Button>
    </form>
  );
}
