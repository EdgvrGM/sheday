/** Convierte errores de Supabase/Postgres/red en un mensaje legible. */
export function errorMessage(error: unknown): string {
  if (!error) return "Error desconocido";
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error && typeof error.message === "string") {
    const msg = error.message;
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("Load failed")) {
      return "Sin conexión. Revisa tu internet e intenta de nuevo.";
    }
    if (msg.includes("Invalid login credentials")) return "Correo o contraseña incorrectos.";
    if (msg.includes("User already registered")) return "Ese correo ya está registrado.";
    if (msg.includes("Email not confirmed")) return "Confirma tu correo antes de iniciar sesión.";
    if (msg.includes("Password should be")) return "La contraseña debe tener al menos 6 caracteres.";
    if (msg.includes("rate limit")) return "Demasiados intentos. Espera un momento e intenta de nuevo.";
    if (msg.includes("profiles_phone_unique")) return "Ese celular ya está registrado en otra cuenta.";
    return msg;
  }
  return "Error desconocido";
}
