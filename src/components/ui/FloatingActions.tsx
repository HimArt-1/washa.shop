"use client";

import dynamic from "next/dynamic";

const FloatingWhatsAppButton = dynamic(
  () => import("@/components/ui/FloatingWhatsAppButton").then((m) => m.FloatingWhatsAppButton),
  { ssr: false },
);
const FloatingSupportButton = dynamic(
  () => import("@/components/ui/FloatingSupportButton").then((m) => m.FloatingSupportButton),
  { ssr: false },
);

export function FloatingActions({ phoneNumber }: { phoneNumber: string }) {
  return (
    <>
      <FloatingWhatsAppButton phoneNumber={phoneNumber} />
      <FloatingSupportButton />
    </>
  );
}
