"use client";

import { CheckCircle2, ShoppingBag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { PhoneField } from "@/components/form-fields";
import { Button, ButtonLink, Card, EmptyState, ErrorBox, Field, PageTitle, TextArea } from "@/components/ui";
import { useCart } from "@/lib/cart";
import { errorMessage } from "@/lib/errors";
import { formatMoney } from "@/lib/format";
import { isValidName, isValidPhone, MAX, nameInput, phoneInput, textInput } from "@/lib/input";
import { fetchSettings } from "@/lib/queries";
import { getSupabase } from "@/lib/supabase/browser";
import type { StoreSettings } from "@/lib/types";

export function CheckoutForm() {
  const cart = useCart();
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  // null = sin editar (se muestra lo guardado en el perfil)
  const [nameDraft, setName] = useState<string | null>(null);
  const [phoneDraft, setPhone] = useState<string | null>(null);
  const [addressDraft, setAddress] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  const name = nameDraft ?? profile?.full_name ?? "";
  const phone = phoneDraft ?? phoneInput(profile?.phone ?? "");
  const address = addressDraft ?? profile?.address ?? "";

  useEffect(() => {
    fetchSettings(getSupabase()).then(setSettings).catch(() => {});
  }, []);

  if (cart.items.length === 0 && !placing) {
    return (
      <EmptyState icon={ShoppingBag} title="Tu carrito está vacío">
        <ButtonLink href="/">Ver la tienda</ButtonLink>
      </EmptyState>
    );
  }

  const deposit = settings ? Math.round(cart.preorderSubtotal * settings.deposit_percent) / 100 : 0;

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isValidName(name)) return setError("Escribe tu nombre.");
    if (!isValidPhone(phone)) return setError("Escribe tu celular a 10 dígitos.");
    if (address.trim().length < 5) return setError("Escribe la dirección de entrega.");

    setPlacing(true);
    const { data: orderId, error } = await getSupabase().rpc("place_order", {
      items: cart.items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
      customer_name: name,
      customer_phone: phone,
      delivery_address: address,
      notes,
    });
    if (error) {
      setPlacing(false);
      return setError(errorMessage(error));
    }
    refreshProfile();
    router.replace(`/pedidos/${orderId}?nuevo=1`);
    cart.clear();
  }

  return (
    <form onSubmit={placeOrder} noValidate className="mx-auto grid w-full max-w-4xl gap-6 md:grid-cols-[1fr_340px]">
      <div className="flex flex-col gap-4">
        <PageTitle>Datos de entrega</PageTitle>
        <Field
          label="Nombre"
          value={name}
          onChange={(e) => setName(nameInput(e.target.value))}
          autoComplete="name"
          autoCapitalize="words"
          maxLength={MAX.name}
          required
        />
        <PhoneField
          label="Celular de contacto (WhatsApp)"
          value={phone}
          onChange={setPhone}
          hint="Te escribiremos a este número para coordinar la entrega."
          required
        />
        <TextArea
          label="Dirección de entrega"
          value={address}
          onChange={(e) => setAddress(textInput(e.target.value, MAX.address))}
          maxLength={MAX.address}
          placeholder="Calle, número, colonia, referencias"
          autoComplete="street-address"
          required
        />
        <TextArea
          label="Notas (opcional)"
          value={notes}
          onChange={(e) => setNotes(textInput(e.target.value, MAX.notes))}
          maxLength={MAX.notes}
          placeholder="Horario preferido, punto de entrega…"
        />
      </div>

      <div className="flex flex-col gap-3 md:sticky md:top-20 md:self-start">
        <Card>
          <h2 className="font-bold">Resumen</h2>
          {cart.items.map((i) => (
            <div key={i.variantId} className="flex justify-between gap-3 text-sm">
              <span>
                {i.quantity} × {i.name}{" "}
                <span className="text-muted">({[i.size, i.color].filter(Boolean).join(", ")})</span>
                {i.isPreorder && <span className="text-blue-700"> · sobre pedido</span>}
              </span>
              <span className="font-semibold whitespace-nowrap">{formatMoney(i.price * i.quantity)}</span>
            </div>
          ))}
          <hr className="border-line" />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatMoney(cart.subtotal)}</span>
          </div>
          {deposit > 0 && (
            <p className="text-xs text-muted">
              Los artículos sobre pedido requieren un anticipo de {formatMoney(deposit)} ({settings?.deposit_percent}%). Te
              diremos cómo pagarlo por WhatsApp.
            </p>
          )}
          <p className="text-xs text-muted">{settings?.delivery_notes ?? "Entrega y pago en efectivo."}</p>
        </Card>
        {error && <ErrorBox message={error} />}
        <Button type="submit" icon={CheckCircle2} loading={placing}>
          Confirmar pedido
        </Button>
      </div>
    </form>
  );
}
