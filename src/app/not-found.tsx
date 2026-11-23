import { SearchX } from "lucide-react";

import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <EmptyState icon={SearchX} title="No encontramos esta página" message="Puede que el producto ya no esté disponible.">
      <ButtonLink href="/">Ir a la tienda</ButtonLink>
    </EmptyState>
  );
}
