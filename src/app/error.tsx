"use client";

import { TriangleAlert } from "lucide-react";

import { Button, EmptyState } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState icon={TriangleAlert} title="Algo salió mal" message="Revisa tu conexión e intenta de nuevo.">
      <Button onClick={reset}>Reintentar</Button>
    </EmptyState>
  );
}
