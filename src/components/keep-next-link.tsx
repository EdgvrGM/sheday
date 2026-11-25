"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { safeNext } from "@/lib/safe-next";

interface Props {
  href: string;
  className?: string;
  children: ReactNode;
}

function LinkWithNext({ href, className, children }: Props) {
  const next = safeNext(useSearchParams().get("next"));
  return (
    <Link href={next !== "/" ? `${href}?next=${encodeURIComponent(next)}` : href} className={className}>
      {children}
    </Link>
  );
}

/**
 * Enlace que conserva `?next=` (entre /login y /registro).
 * Suspense: la página sigue siendo estática; el HTML trae el enlace sin `next`
 * y al hidratar se completa.
 */
export function KeepNextLink(props: Props) {
  return (
    <Suspense
      fallback={
        <Link href={props.href} className={props.className}>
          {props.children}
        </Link>
      }>
      <LinkWithNext {...props} />
    </Suspense>
  );
}
