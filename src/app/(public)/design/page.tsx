import Link from "next/link";
import { Construction, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "صمّم قطعتك — وشّى",
  description:
    "صمّم طباعتك على هودي أو تيشيرت — نصوص جاهزة، تصاميم من الاستوديو، أو توليد بالذكاء الاصطناعي. معاينة فورية وطلب سهل.",
};

export default function DesignPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-lg text-center space-y-6">
        <div className="mx-auto w-20 h-20 rounded-full bg-gold/10 flex items-center justify-center">
          <Construction className="w-10 h-10 text-gold" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-fg">
          تحت التطوير 🚧
        </h1>
        <p className="text-fg/50 leading-relaxed">
          نعمل على تطوير هذه الصفحة لتقديم تجربة أفضل. في هذه الأثناء، جرّب واجهة التصميم الجديدة!
        </p>
        <Link
          href="/design-your-piece"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-gold to-gold-light text-bg font-bold text-sm hover:shadow-lg hover:shadow-gold/20 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          صمّم قطعتك بنفسك
        </Link>
      </div>
    </div>
  );
}
