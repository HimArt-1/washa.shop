import { redirect } from "next/navigation";
import { DesignCreationWizard } from "@/components/design-creation/DesignCreationWizard";
import { DesignAccessDenied } from "@/components/design-creation/DesignAccessDenied";
import { getFeaturedArtworks } from "@/app/actions/artworks";
import { canAccessDesignPiece } from "@/app/actions/design-piece";
import { getCreationPrices, getActiveExclusiveDesigns } from "@/app/actions/settings";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "صمّم قطعتك — وشّى",
  description:
    "صمّم طباعتك على هودي أو تيشيرت — نصوص جاهزة، تصاميم من الاستوديو، أو توليد بالذكاء الاصطناعي. معاينة فورية وطلب سهل.",
};

export default async function DesignPage() {
  const { allowed, reason } = await canAccessDesignPiece();

  if (!allowed) {
    if (reason === "not_signed_in") {
      redirect("/sign-in?redirect_url=/design");
    }
    return <DesignAccessDenied />;
  }

  const [featuredArtworks, creationPrices, exclusiveDesigns] = await Promise.all([
    getFeaturedArtworks(),
    getCreationPrices(),
    getActiveExclusiveDesigns(),
  ]);
  const studioArtworks = (featuredArtworks ?? []).map((a: any) => ({
    id: a.id,
    image_url: a.image_url,
    title: a.title,
  }));

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-fg">صمّم قطعتك</h1>
        <p className="text-fg/60 mt-2 max-w-2xl">
          اختر القطعة واللون، ثم صمّم طباعتك — نصوص جاهزة، من الاستوديو، أو بالذكاء الاصطناعي.
          معاينة فورية وطلب سهل.
        </p>
      </div>

      <DesignCreationWizard
        studioArtworks={studioArtworks}
        creationPrices={creationPrices}
        exclusiveDesigns={exclusiveDesigns}
      />
    </div>
  );
}
