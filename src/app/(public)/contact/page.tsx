import type { Metadata } from "next";
import { Mail, Phone, MapPin, MessageCircle, Clock, Instagram } from "lucide-react";

export const metadata: Metadata = {
    title: "تواصل معنا",
    description: "تواصل مع فريق وشّى — نسعد بخدمتك عبر البريد الإلكتروني، واتساب، أو صفحات التواصل الاجتماعي.",
};

const contactMethods = [
    {
        icon: MessageCircle,
        title: "واتساب",
        value: "+966 53 223 5005",
        href: "https://wa.me/966532235005",
        desc: "أسرع طريقة للتواصل معنا",
        color: "text-emerald-400",
        bg: "bg-emerald-400/10",
    },
    {
        icon: Mail,
        title: "البريد الإلكتروني",
        value: "washaksa@hotmail.com",
        href: "mailto:washaksa@hotmail.com",
        desc: "للاستفسارات الرسمية",
        color: "text-blue-400",
        bg: "bg-blue-400/10",
    },
    {
        icon: Phone,
        title: "الهاتف",
        value: "+966 53 223 5005",
        href: "tel:+966532235005",
        desc: "أوقات العمل: 9 ص – 10 م",
        color: "text-purple-400",
        bg: "bg-purple-400/10",
    },
    {
        icon: Instagram,
        title: "انستقرام",
        value: "@washha.sa",
        href: "https://www.instagram.com/washha.sa",
        desc: "تابعنا للمستجدات",
        color: "text-pink-400",
        bg: "bg-pink-400/10",
    },
];

export default function ContactPage() {
    return (
        <div className="min-h-screen py-16 sm:py-24">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 w-96 h-96 bg-gold/[0.03] rounded-full blur-[120px]" />
            </div>

            <div className="container-wusha relative z-10">
                {/* Header */}
                <div className="theme-surface-panel rounded-[2rem] text-center mb-16 px-6 py-10 sm:px-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/10 border border-gold/20 rounded-full text-gold text-xs font-bold mb-6">
                        <Mail className="w-3.5 h-3.5" />
                        تواصل
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-bold text-theme mb-4">
                        تواصل <span className="text-gradient">معنا</span>
                    </h1>
                    <p className="text-theme-subtle max-w-lg mx-auto">
                        فريق وشّى جاهز لخدمتك. اختر الطريقة الأنسب لك.
                    </p>
                </div>

                {/* Contact Methods */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto mb-20">
                    {contactMethods.map((method) => {
                        const Icon = method.icon;
                        return (
                            <a
                                key={method.title}
                                href={method.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group theme-surface-panel p-6 rounded-[1.75rem] hover:border-gold/20 transition-all duration-300 hover:-translate-y-1"
                            >
                                <div className={`w-12 h-12 rounded-xl ${method.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                    <Icon className={`w-6 h-6 ${method.color}`} />
                                </div>
                                <h3 className="font-bold text-theme-strong mb-1">{method.title}</h3>
                                <p className="text-gold text-sm font-bold mb-2" dir="ltr">{method.value}</p>
                                <p className="text-theme-subtle text-xs">{method.desc}</p>
                            </a>
                        );
                    })}
                </div>

                {/* Info Banner */}
                <div className="max-w-3xl mx-auto">
                    <div className="theme-surface-panel p-6 rounded-[1.75rem] flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                            <Clock className="w-5 h-5 text-gold" />
                        </div>
                        <div>
                            <h3 className="font-bold text-theme-strong mb-1">أوقات العمل</h3>
                            <p className="text-theme-subtle text-sm leading-relaxed">
                                فريق الدعم متاح يومياً من <span className="text-theme-soft font-bold">9 صباحاً</span> إلى <span className="text-theme-soft font-bold">10 مساءً</span> بتوقيت السعودية.
                                <br />
                                نرد على الرسائل خلال ساعتين كحد أقصى خلال أوقات العمل.
                            </p>
                        </div>
                    </div>
                    <div className="mt-6 theme-surface-panel p-6 rounded-[1.75rem] flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center shrink-0">
                            <MapPin className="w-5 h-5 text-gold" />
                        </div>
                        <div>
                            <h3 className="font-bold text-theme-strong mb-1">موقعنا</h3>
                            <p className="text-theme-subtle text-sm">المملكة العربية السعودية</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
