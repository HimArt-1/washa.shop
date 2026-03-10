import type { Metadata } from "next";
import { Truck, Clock, MapPin, Package, RotateCcw, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
    title: "الشحن والتوصيل وسياسة الاسترجاع",
    description: "تفاصيل الشحن ومدة التوصيل وسياسة الاسترجاع والاستبدال في منصة وشّى.",
};

const shippingInfo = [
    {
        icon: Truck,
        title: "التوصيل داخل المملكة",
        desc: "نوصل لجميع مدن المملكة العربية السعودية عبر شركات شحن موثوقة.",
    },
    {
        icon: Clock,
        title: "مدة التوصيل",
        desc: "3–5 أيام عمل للمنتجات الجاهزة. 7–14 يوم عمل للمنتجات المصممة حسب الطلب.",
    },
    {
        icon: MapPin,
        title: "تتبع الشحنة",
        desc: "ستصلك رسالة برقم التتبع فور شحن طلبك لمتابعته لحظة بلحظة.",
    },
    {
        icon: Package,
        title: "تكلفة الشحن",
        desc: "30 ر.س لجميع الطلبات داخل المملكة. شحن مجاني للطلبات فوق 300 ر.س.",
    },
];

const returnPolicy = [
    {
        icon: RotateCcw,
        title: "سياسة الإرجاع",
        items: [
            "يمكنك طلب الإرجاع خلال 7 أيام من تاريخ الاستلام.",
            "يجب أن يكون المنتج بحالته الأصلية مع التغليف.",
            "المنتجات المصممة حسب الطلب لا تقبل الإرجاع إلا في حالة عيب تصنيعي.",
            "يتم رد المبلغ خلال 5–10 أيام عمل بعد استلام المنتج المرتجع.",
        ],
    },
    {
        icon: ShieldCheck,
        title: "الاستبدال",
        items: [
            "نوفر خيار الاستبدال خلال 7 أيام من الاستلام.",
            "يشمل الاستبدال تغيير المقاس أو اللون فقط.",
            "تكلفة شحن الاستبدال على المشتري.",
            "في حال وجود عيب تصنيعي، نتحمل كامل تكاليف الاستبدال.",
        ],
    },
];

export default function ShippingPage() {
    return (
        <div className="min-h-screen py-16 sm:py-24">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-gold/[0.03] rounded-full blur-[120px]" />
            </div>

            <div className="container-wusha relative z-10">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/10 border border-gold/20 rounded-full text-gold text-xs font-bold mb-6">
                        <Truck className="w-3.5 h-3.5" />
                        سياسات التوصيل والإرجاع
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-bold text-theme mb-4">
                        الشحن <span className="text-gradient">والتوصيل</span>
                    </h1>
                    <p className="text-theme-subtle max-w-lg mx-auto">
                        كل ما تحتاج معرفته عن توصيل طلبك وسياسات الإرجاع والاستبدال.
                    </p>
                </div>

                {/* Shipping Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto mb-20">
                    {shippingInfo.map((item) => {
                        const Icon = item.icon;
                        return (
                            <div
                                key={item.title}
                                className="p-6 bg-theme-subtle border border-theme-soft rounded-2xl hover:border-gold/20 transition-all"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center mb-4">
                                    <Icon className="w-6 h-6 text-gold" />
                                </div>
                                <h3 className="font-bold text-theme-strong mb-2">{item.title}</h3>
                                <p className="text-theme-subtle text-sm leading-relaxed">{item.desc}</p>
                            </div>
                        );
                    })}
                </div>

                {/* Divider */}
                <div className="section-divider mb-20" />

                {/* Return / Exchange */}
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-2xl sm:text-3xl font-bold text-theme mb-10 text-center">
                        الإرجاع <span className="text-gradient">والاستبدال</span>
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {returnPolicy.map((section) => {
                            const Icon = section.icon;
                            return (
                                <div
                                    key={section.title}
                                    className="p-6 bg-theme-subtle border border-theme-soft rounded-2xl"
                                >
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                                            <Icon className="w-5 h-5 text-gold" />
                                        </div>
                                        <h3 className="font-bold text-theme-strong">{section.title}</h3>
                                    </div>
                                    <ul className="space-y-3">
                                        {section.items.map((item, i) => (
                                            <li key={i} className="flex items-start gap-3 text-sm text-theme-subtle leading-relaxed">
                                                <span className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-2 shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
