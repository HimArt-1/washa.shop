import type { Metadata } from "next";
import { HelpCircle, ChevronDown } from "lucide-react";

export const metadata: Metadata = {
    title: "الأسئلة الشائعة",
    description: "إجابات على أكثر الأسئلة شيوعاً حول منصة وشّى — الطلبات، الشحن، التصميم، والدفع.",
};

const faqs = [
    {
        q: "ما هي منصة وشّى؟",
        a: "وشّى هي منصة فنية رقمية سعودية تجمع المبدعين العرب في مكان واحد. نوفر لك معرضاً لعرض أعمالك، متجراً لبيع منتجاتك الفنية، وخدمة تصميم قطع ملابس مخصصة بالذكاء الاصطناعي.",
    },
    {
        q: "كيف أطلب منتج من المتجر؟",
        a: "تصفح المتجر، اختر المنتج اللي يعجبك، حدد المقاس واللون، ثم أضفه للسلة. بعد ما تخلص تسوقك، اذهب للسلة وأكمل عملية الدفع عبر بطاقتك الائتمانية.",
    },
    {
        q: "كيف تعمل خدمة \"صمّم قطعتك\"؟",
        a: "اختر نوع القطعة (تيشيرت، هودي، إلخ)، حدد اللون والمقاس، اختر نمط التصميم والأسلوب الفني، وسنقوم بتصميم قطعة فريدة لك باستخدام الذكاء الاصطناعي. ستراجع النتيجة وتوافق عليها قبل الطلب.",
    },
    {
        q: "ما هي طرق الدفع المتاحة؟",
        a: "نقبل الدفع عبر البطاقات الائتمانية (Visa, Mastercard) ومدى من خلال بوابة Stripe الآمنة. جميع المعاملات مشفرة ومحمية.",
    },
    {
        q: "كم مدة التوصيل؟",
        a: "يتم التوصيل داخل المملكة العربية السعودية خلال 3-7 أيام عمل. قد تختلف المدة حسب المدينة ونوع المنتج (جاهز أو مصمّم حسب الطلب).",
    },
    {
        q: "هل يمكنني إرجاع المنتج؟",
        a: "نعم، يمكنك طلب الإرجاع خلال 7 أيام من استلام الطلب بشرط أن يكون المنتج بحالته الأصلية. المنتجات المصممة حسب الطلب لا تقبل الإرجاع إلا في حالة وجود عيب تصنيعي.",
    },
    {
        q: "كيف أنضم كفنان في المنصة؟",
        a: "اضغط على \"انضم إلى المجتمع\" وسجّل بياناتك. سيتم مراجعة طلبك من فريقنا وسنتواصل معك خلال 48 ساعة.",
    },
    {
        q: "هل يمكنني تتبع طلبي؟",
        a: "نعم، بعد تسجيل الدخول، اذهب إلى \"حسابي\" ← \"طلباتي\" وستجد حالة كل طلب محدّثة. كما نرسل إشعارات عند تحديث حالة الطلب.",
    },
    {
        q: "هل المنصة متاحة كتطبيق جوال؟",
        a: "وشّى تعمل كتطبيق ويب تقدمي (PWA)، يعني تقدر تضيفها لشاشة جوالك الرئيسية وتستخدمها كتطبيق عادي مع إشعارات وتجربة سلسة.",
    },
];

export default function FAQPage() {
    return (
        <div className="min-h-screen py-16 sm:py-24">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold/[0.03] rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gold/[0.02] rounded-full blur-[150px]" />
            </div>

            <div className="container-wusha relative z-10">
                {/* Header */}
                <div className="theme-surface-panel rounded-[2rem] text-center mb-16 px-6 py-10 sm:px-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/10 border border-gold/20 rounded-full text-gold text-xs font-bold mb-6">
                        <HelpCircle className="w-3.5 h-3.5" />
                        مركز المساعدة
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-bold text-theme mb-4">
                        الأسئلة <span className="text-gradient">الشائعة</span>
                    </h1>
                    <p className="text-theme-subtle max-w-lg mx-auto">
                        إجابات سريعة لأكثر الأسئلة شيوعاً. ما لقيت جوابك؟ تواصل معنا مباشرة.
                    </p>
                </div>

                {/* FAQ List */}
                <div className="max-w-3xl mx-auto space-y-4">
                    {faqs.map((faq, i) => (
                        <details
                            key={i}
                            className="group theme-surface-panel rounded-[1.75rem] overflow-hidden transition-all hover:border-gold/20"
                        >
                            <summary className="flex items-center justify-between gap-4 p-6 cursor-pointer list-none select-none">
                                <span className="font-bold text-theme-strong text-base">{faq.q}</span>
                                <ChevronDown className="w-5 h-5 text-gold/60 shrink-0 transition-transform duration-300 group-open:rotate-180" />
                            </summary>
                            <div className="px-6 pb-6 pt-0 text-theme-subtle leading-relaxed text-sm border-t border-theme-faint">
                                <p className="pt-4">{faq.a}</p>
                            </div>
                        </details>
                    ))}
                </div>

                {/* CTA */}
                <div className="text-center mt-16">
                    <p className="text-theme-subtle text-sm mb-4">ما لقيت جوابك؟</p>
                    <a
                        href="/account/support"
                        className="inline-flex items-center gap-2 btn-gold py-3 px-8 text-sm rounded-xl"
                    >
                        تواصل مع فريق الدعم
                    </a>
                </div>
            </div>
        </div>
    );
}
