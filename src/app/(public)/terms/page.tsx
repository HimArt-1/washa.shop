import type { Metadata } from "next";
import { Scale, FileText, ShieldCheck, Lock, AlertTriangle, Copyright } from "lucide-react";

export const metadata: Metadata = {
    title: "الشروط والأحكام وسياسة الخصوصية",
    description: "الشروط والأحكام وسياسة الخصوصية وحقوق الملكية الفكرية لمنصة وشّى.",
};

export default function TermsPage() {
    return (
        <div className="min-h-screen py-16 sm:py-24">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/3 w-96 h-96 bg-gold/[0.03] rounded-full blur-[120px]" />
            </div>

            <div className="container-wusha relative z-10 max-w-4xl mx-auto">
                {/* Header */}
                <div className="theme-surface-panel rounded-[2rem] text-center mb-16 px-6 py-10 sm:px-10">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold/10 border border-gold/20 rounded-full text-gold text-xs font-bold mb-6">
                        <Scale className="w-3.5 h-3.5" />
                        القانونية
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-bold text-theme mb-4">
                        الشروط <span className="text-gradient">والأحكام</span>
                    </h1>
                    <p className="text-theme-subtle max-w-lg mx-auto text-sm">
                        آخر تحديث: مارس 2026
                    </p>
                </div>

                {/* Content Sections */}
                <div className="space-y-12">

                    {/* ─── Terms ─── */}
                    <section id="terms" className="scroll-mt-24">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-gold" />
                            </div>
                            <h2 className="text-xl font-bold text-theme-strong">الشروط والأحكام</h2>
                        </div>
                        <div className="theme-surface-panel rounded-[1.75rem] p-6 sm:p-8 space-y-5 text-sm text-theme-subtle leading-relaxed">
                            <p>باستخدامك لمنصة وشّى (washa.shop)، فإنك توافق على الشروط والأحكام التالية:</p>
                            <ul className="space-y-3 list-none">
                                <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-2 shrink-0" />يجب أن يكون عمر المستخدم 18 سنة أو أكثر لإتمام عمليات الشراء.</li>
                                <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-2 shrink-0" />جميع الأسعار معروضة بالريال السعودي وتشمل ضريبة القيمة المضافة (15%).</li>
                                <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-2 shrink-0" />نحتفظ بحق تعديل الأسعار والمنتجات المعروضة دون إشعار مسبق.</li>
                                <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-2 shrink-0" />المستخدم مسؤول عن دقة معلومات الطلب والشحن.</li>
                                <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-2 shrink-0" />لا يحق استخدام المنصة لأغراض غير مشروعة أو مخالفة للأنظمة السعودية.</li>
                                <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-2 shrink-0" />نحتفظ بحق تعليق أو حذف أي حساب يخالف هذه الشروط.</li>
                            </ul>
                        </div>
                    </section>

                    <div className="section-divider" />

                    {/* ─── Privacy ─── */}
                    <section id="privacy" className="scroll-mt-24">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                                <Lock className="w-5 h-5 text-gold" />
                            </div>
                            <h2 className="text-xl font-bold text-theme-strong">سياسة الخصوصية</h2>
                        </div>
                        <div className="theme-surface-panel rounded-[1.75rem] p-6 sm:p-8 space-y-5 text-sm text-theme-subtle leading-relaxed">
                            <div>
                                <h3 className="font-bold text-theme-soft mb-2">البيانات التي نجمعها</h3>
                                <ul className="space-y-2 list-none">
                                    <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-2 shrink-0" />معلومات الحساب: الاسم، البريد الإلكتروني، رقم الجوال.</li>
                                    <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-2 shrink-0" />معلومات الطلب: عنوان الشحن، تفاصيل المنتجات.</li>
                                    <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-2 shrink-0" />بيانات الاستخدام: الصفحات المزارة، الوقت المستغرق (لتحسين التجربة).</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-bold text-theme-soft mb-2">كيف نستخدم بياناتك</h3>
                                <ul className="space-y-2 list-none">
                                    <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-2 shrink-0" />معالجة الطلبات وتوصيلها.</li>
                                    <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-2 shrink-0" />إرسال إشعارات حول الطلبات والتحديثات.</li>
                                    <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-2 shrink-0" />تحسين الخدمات وتخصيص التجربة.</li>
                                </ul>
                            </div>
                            <div>
                                <h3 className="font-bold text-theme-soft mb-2">حماية البيانات</h3>
                                <p>نستخدم تشفير SSL/TLS لحماية جميع البيانات المنقولة. لا نشارك بياناتك الشخصية مع أطراف ثالثة إلا لأغراض تنفيذ الطلب (شركات الشحن، بوابة الدفع).</p>
                            </div>
                        </div>
                    </section>

                    <div className="section-divider" />

                    {/* ─── Copyright ─── */}
                    <section id="copyright" className="scroll-mt-24">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                                <Copyright className="w-5 h-5 text-gold" />
                            </div>
                            <h2 className="text-xl font-bold text-theme-strong">حقوق الملكية الفكرية</h2>
                        </div>
                        <div className="theme-surface-panel rounded-[1.75rem] p-6 sm:p-8 space-y-5 text-sm text-theme-subtle leading-relaxed">
                            <ul className="space-y-3 list-none">
                                <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-2 shrink-0" />جميع المحتويات المعروضة على المنصة (شعارات، تصاميم، نصوص) محمية بموجب حقوق الملكية الفكرية.</li>
                                <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-2 shrink-0" />الأعمال الفنية المعروضة في المعرض ملك لأصحابها ولا يجوز نسخها أو استخدامها بدون إذن.</li>
                                <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-2 shrink-0" />التصاميم المنشأة عبر خدمة الذكاء الاصطناعي تصبح ملكاً للعميل بعد إتمام الدفع.</li>
                                <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-2 shrink-0" />يحق لوشّى استخدام الأعمال المعروضة لأغراض تسويقية ما لم يطلب الفنان خلاف ذلك.</li>
                                <li className="flex items-start gap-3"><span className="w-1.5 h-1.5 rounded-full bg-gold/40 mt-2 shrink-0" />أي انتهاك لحقوق الملكية الفكرية سيُتخذ بحقه إجراء قانوني وفق أنظمة المملكة العربية السعودية.</li>
                            </ul>
                        </div>
                    </section>

                    {/* Contact for Legal */}
                    <div className="text-center pt-8">
                        <p className="text-theme-subtle text-sm mb-1">لأي استفسار قانوني، تواصل معنا عبر</p>
                        <a href="mailto:washaksa@hotmail.com" className="text-gold hover:text-gold-light transition-colors text-sm font-bold">
                            washaksa@hotmail.com
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
