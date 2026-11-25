/** Convierte errores de Supabase/Postgres/red en un mensaje legible. */
export function errorMessage(error: unknown): string {
  if (!error) return "Error desconocido";
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error && typeof error.message === "string") {
    const msg = error.message;
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("Load failed")) {
      return "Sin conexión. Revisa tu internet e intenta de nuevo.";
    }
    if (msg.includes("Invalid login credentials")) return "Los datos de acceso no son correctos.";
    if (msg.includes("User already registered")) return "Ya existe una cuenta con esos datos. Inicia sesión o recupera tu contraseña.";
    if (msg.includes("phone number has already been registered")) return "Ese celular ya está en otra cuenta.";
    if (msg.includes("email address has already been registered")) return "Ese correo ya está en otra cuenta.";
    if (msg.includes("Email not confirmed")) return "Confirma tu correo antes de iniciar sesión.";
    if (msg.includes("Token has expired or is invalid")) return "El código no es correcto o ya venció. Pide uno nuevo.";
    if (msg.includes("Phone signups are disabled") || msg.includes("Unsupported phone provider")) {
      return "El acceso con celular todavía no está activo. Intenta más tarde o escríbenos por WhatsApp.";
    }
    if (msg.includes("Signups not allowed for otp")) return "No encontramos una cuenta con ese celular.";
    if (msg.includes("you can only request this after")) return "Espera unos segundos antes de pedir otro código.";
    if (msg.includes("Error sending") || msg.includes("WhatsApp")) {
      return "No pudimos enviar el código por WhatsApp. Intenta de nuevo en un momento.";
    }
    if (msg.includes("Password should be")) return "La contraseña debe tener al menos 6 caracteres.";
    if (msg.toLowerCase().includes("captcha")) return "No pudimos comprobar que no eres un robot. Intenta de nuevo.";
    if (msg.includes("rate limit")) return "Demasiados intentos. Espera un momento e intenta de nuevo.";
    if (msg.includes("profiles_phone_unique")) return "Ese celular ya está registrado en otra cuenta.";
    return msg;
  }
  return "Error desconocido";
}
