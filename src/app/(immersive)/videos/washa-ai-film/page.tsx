import type { Metadata } from "next";
import { WashaFilmExperience } from "@/components/film/WashaFilmExperience";

export const metadata: Metadata = {
  title: "Brand Film — وشّى | WASHA",
  description: "فنٌ يُرتدى — Art you wear. The WASHA brand film.",
  robots: { index: false, follow: false },
};

export default function WashaFilmPage() {
  return <WashaFilmExperience />;
}
