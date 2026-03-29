"use client";

import { motion } from "framer-motion";
import { 
  Phone, 
  Mail, 
  Globe, 
  Droplets, 
  Wind, 
  Sparkles,
  Thermometer,
  ShieldAlert,
  Shirt,
  Download,
  Instagram
} from "lucide-react";
import { toPng } from "html-to-image";
import { Logo } from "@/components/ui/Logo";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.98a8.18 8.18 0 0 0 4.76 1.52V7.05a4.84 4.84 0 0 1-1-.36z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function SnapchatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.124 0c-1.397.025-3.027.601-3.951 1.636-.78.88-.707 2.072-.663 3.123.018.497.042 1.054-.108 1.488-.13.374-.326.541-.53.69-.328.24-.707.306-1.127.35-.38.038-.802.055-1.125.32-.239.197-.433.486-.531.815-.098.33-.039.69.213 1.01.217.282.516.48.868.647l.116.035c.264.12.56.242.8.448.242.203.456.492.656.848.33.606.671.865.986.97.039 0 .092.016.14.016.3 0 .633-.066.883-.186l.01-.005c.162-.07.332-.142.493-.198.242-.1.49-.18.736-.243.262-.128.528-.21.821-.21h.001c.294 0 .56.082.822.21.246.063.494.143.736.243.16.056.331.128.494.198l.01.005c.25.12.582.186.882.186.048 0 .101-.016.14-.016.315-.105.656-.364.986-.97.2-.356.414-.645.656-.848.24-.206.536-.328.8-.448l.117-.035c.351-.167.65-.365.867-.647.252-.32.311-.68.213-1.01-.098-.329-.292-.618-.531-.815-.323-.265-.745-.282-1.125-.32-.42-.044-.799-.11-1.127-.35-.205-.15-.401-.316-.53-.69-.15-.434-.125-.991-.107-1.488.043-1.051.116-2.243-.664-3.123C15.151.6 13.521.024 12.124 0zm-1.898 14.885c-.25 0-.583.076-.89.206-.188.083-.388.188-.59.298l-.02.012c-.443.25-.826.41-1.107.41h-.033c-.44 0-.854-.253-.889-.276l-.039-.028c-.167-.105-.33-.2-.516-.296-.28-.153-.49-.228-.59-.228-.052.014-.15.068-.225 0-.071-.065-.008-.182.02-.236l.015-.027c.606-.826 1.54-.959 1.948-.992.115 0 .227-.014.33-.014.623 0 1.25.26 1.705.808.204.24.417.41.652.514.225.097.466.142.697.142.233 0 .473-.045.698-.142.235-.104.448-.274.652-.514.455-.548 1.082-.808 1.705-.808.103 0 .215.014.33.014.408.033 1.341.166 1.947.992l.016.027c.027.054.09.171.019.236-.075.068-.173.014-.224 0-.1-.001-.312.074-.591.228-.186.095-.349.19-.517.296l-.038.028c-.035.023-.45.276-.89.276h-.032c-.282 0-.665-.16-1.107-.41l-.02-.012c-.201-.11-.402-.215-.59-.298-.306-.13-.64-.206-.89-.206z"/>
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

export default function BrandAssetsClient({ config }: { config: any }) {
  const socialCardWebsite = (
    config.business_card_website ||
    config.brand_assets?.business_card_website ||
    "www.washa.shop"
  )
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "www.");

  const handleDownload = async (elementId: string, filename: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    try {
      // Use toPng from html-to-image which renders DOM properly including SVGs and Arabic Fonts
      const dataUrl = await toPng(element, { 
        cacheBust: true,
        pixelRatio: 4, // High Quality
        style: {
          transform: 'none', // Force flat rendering (Remove 3D tilt)
          transition: 'none', // Disable animations during capture
          boxShadow: 'none', // Remove external floating shadow for a clean export
        }
      });
      const link = document.createElement("a");
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to capture image:", err);
    }
  };

  return (
    <div className="min-h-screen bg-theme-bg pt-24 pb-32 overflow-hidden selection:bg-gold/30 selection:text-gold">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold/10 blur-[150px] rounded-full mix-blend-multiply dark:mix-blend-screen opacity-60 dark:opacity-20" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-theme-strong/5 blur-[150px] rounded-full mix-blend-multiply dark:mix-blend-screen opacity-40 dark:opacity-20" />
        <div className="absolute inset-0 bg-[url('/images/noise.png')] opacity-[0.03] mix-blend-overlay" />
      </div>

      <div className="container-wusha relative z-10 max-w-6xl mx-auto">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-20 md:mb-32"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gold/30 bg-gold/5 backdrop-blur-sm mb-6">
            <Sparkles className="w-4 h-4 text-gold" />
            <span className="text-sm font-medium text-gold tracking-widest uppercase">التصاميم والهوية</span>
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight text-gradient leading-tight">
            هوية وشّى المطبوعة
          </h1>
          <p className="text-lg md:text-xl text-theme-subtle max-w-2xl mx-auto leading-relaxed">
            لأن التفاصيل تصنع الفارق.. نستعرض هنا مجموعة التصاميم الورقية الفاخرة التي تمثل جزءاً من تجربة عملاء وشّى المُميزة.
          </p>
        </motion.div>

        {/* 1. Business Card Showcase */}
        <div className="mb-32 md:mb-48">
          <SectionTitle title="بطاقة العمل" subtitle="Business Card" number="01" />
          
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            {/* The Cards Container (Perspective wrapper) */}
            <div className="w-full lg:w-3/5 perspective-1000 flex flex-col md:flex-row gap-6 md:gap-8 justify-center items-center">
              
              {/* Back of Card (Left / Top) */}
              <motion.div 
                initial={{ opacity: 0, x: -50, rotateY: -15, rotateZ: -5 }}
                whileInView={{ opacity: 1, x: 0, rotateY: 10, rotateZ: -5 }}
                viewport={{ once: true, margin: "-100px" }}
                whileHover={{ scale: 1.05, rotateY: 0, rotateZ: 0, zIndex: 10 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                className="relative w-full max-w-[400px] aspect-[1.65/1] group cursor-pointer"
              >
                <div
                  id="business-card-back"
                  className="w-full h-full rounded-2xl border overflow-hidden relative shadow-2xl glass-premium hover-glow transition-all duration-700"
                >
                  {/* Subtle Top Glow */}
                  <div className="absolute top-0 right-0 w-40 h-24 bg-gold/20 dark:bg-gold/15 blur-[50px] z-0 rounded-full" />
                  {/* Grainy Texture */}
                  <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none mix-blend-overlay z-0" />
                  
                  <div className="h-full flex flex-col justify-between p-6 sm:px-8 sm:py-6 relative z-10">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-bold mb-1 text-theme-strong">{config.business_card_name}</h2>
                        <p className="text-gold text-sm font-medium tracking-wide">{config.business_card_title}</p>
                      </div>
                      <Logo size="sm" />
                    </div>
                    
                    <div className="space-y-1 sm:space-y-1.5 mt-2 mb-1 w-full">
                      <div className="flex items-center gap-3 text-xs sm:text-sm w-full text-theme-subtle">
                        <Phone className="w-4 h-4 text-gold flex-shrink-0" />
                        <span dir="ltr" className="tracking-wider px-1 pb-1 inline-block truncate min-w-0">{config.business_card_phone}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs sm:text-sm w-full text-theme-subtle">
                        <Mail className="w-4 h-4 text-gold flex-shrink-0" />
                        <span dir="ltr" className="px-1 pb-1 inline-block truncate min-w-0">{config.business_card_email}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs sm:text-sm w-full text-theme-subtle">
                        <Globe className="w-4 h-4 text-gold flex-shrink-0" />
                        <span dir="ltr" className="px-1 pb-1.5 inline-block truncate min-w-0 text-left leading-relaxed">{config.business_card_website}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Front of Card (Right / Bottom) */}
              <motion.div 
                initial={{ opacity: 0, x: 50, rotateY: 15, rotateZ: 5 }}
                whileInView={{ opacity: 1, x: 0, rotateY: -10, rotateZ: 5 }}
                viewport={{ once: true, margin: "-100px" }}
                whileHover={{ scale: 1.05, rotateY: 0, rotateZ: 0, zIndex: 10 }}
                transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
                className="relative w-full max-w-[400px] aspect-[1.65/1] group cursor-pointer"
              >
                <div
                  id="business-card-front"
                  className="w-full h-full rounded-2xl border overflow-hidden flex items-center justify-center relative shadow-2xl glass-premium hover-glow transition-all duration-700"
                >
                  {/* Subtle Center Glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gold/15 dark:bg-gold/10 blur-[60px] z-0 rounded-full" />
                  {/* Grainy Texture */}
                  <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none mix-blend-overlay z-0" />
                  {/* Spot UV shine sweep on hover */}
                  <div className="absolute -inset-1/2 bg-gradient-to-r from-transparent via-gold/10 to-transparent -rotate-45 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
                  
                  <Logo size="lg" className="scale-125 relative z-10" />
                </div>
              </motion.div>
            </div>

            <div className="w-full lg:w-2/5 space-y-6">
              <h3 className="text-3xl font-bold text-theme-strong">انعكاس الهوية</h3>
              <p className="text-theme-subtle leading-loose">
                صُممت بطاقة العمل لتعكس فلسفة "وشّى" بمزج الأناقة الكلاسيكية بالتقنية الحديثة. يرمز اللون البني الغامق #322014 للغموض والفخامة، في حين يبرز الشعار الذهبي البصمة الفريدة، بالإضافة لمعلومات الاتصال المنسقة بعناية لسهولة الوصول.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <span className="px-3 py-1 bg-theme-strong/5 border border-theme-strong/10 rounded-md text-xs font-semibold text-theme-subtle">الطباعة: رقائق الذهب الساخنة</span>
                <span className="px-3 py-1 bg-theme-strong/5 border border-theme-strong/10 rounded-md text-xs font-semibold text-theme-subtle">الورق: بني غامق #322014 مطفي 600 جرام</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-theme-strong/10">
                <button
                  onClick={() => handleDownload("business-card-back", "wusha-business-card-back")}
                  className="flex flex-1 items-center justify-center gap-2 px-4 py-3 bg-theme-strong/5 hover:bg-gold hover:text-white transition-colors text-theme-strong rounded-xl text-sm font-bold shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  حفظ الوجه الخلفي (معلومات)
                </button>
                <button
                  onClick={() => handleDownload("business-card-front", "wusha-business-card-front")}
                  className="flex flex-1 items-center justify-center gap-2 px-4 py-3 bg-theme-strong/5 hover:bg-gold hover:text-white transition-colors text-theme-strong rounded-xl text-sm font-bold shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  حفظ الوجه الأمامي (الشعار)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Thank You Card */}
        <div className="mb-32 md:mb-48">
          <SectionTitle title="بطاقة الشكر" subtitle="Thank You Card" number="02" align="right" />
          
          <div className="flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-20">
            <div className="w-full lg:w-2/5 space-y-6">
              <h3 className="text-3xl font-bold text-theme-strong">تقدير لكل عميل</h3>
              <p className="text-theme-subtle leading-loose">
                بطاقة شخصية تُرفق مع كل طلب، نعبر فيها عن امتنانا الصادق لثقة العميل بنا. التصميم عمودي أنيق يُشبه رسائل الدعوات الفاخرة، مع رسالة مميزة تجعل من تجربة فتح الصندوق (Unboxing) لحظة لا تُنسى.
              </p>
              <div className="pt-4 border-t border-theme-strong/10">
                <button
                  onClick={() => handleDownload("thank-you-card", "wusha-thank-you-card")}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-theme-strong/5 hover:bg-gold hover:text-white transition-colors text-theme-strong rounded-xl text-sm font-bold shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  حفظ بطاقة الشكر (جودة عالية)
                </button>
              </div>
            </div>

            <div className="w-full lg:w-3/5 flex justify-center perspective-1000">
              <motion.div 
                initial={{ opacity: 0, y: 50, rotateX: 10 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                whileHover={{ y: -10, boxShadow: "0 30px 60px -15px rgba(202,160,82,0.2)" }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="relative w-full max-w-[320px] aspect-[1/1.4]"
              >
                <div
                  id="thank-you-card"
                  className="w-full h-full rounded-2xl p-8 shadow-2xl border flex flex-col items-center text-center overflow-hidden relative glass-premium hover-glow transition-all duration-700"
                >
                  {/* Subtle Top Glow */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-20 bg-gold/20 dark:bg-gold/15 blur-[50px] z-0 rounded-full" />
                  {/* Grainy Texture */}
                  <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none mix-blend-overlay z-0" />
                  
                  <Logo size="sm" className="mb-8 relative z-10" />
                  
                  <div className="flex-1 flex flex-col justify-center relative z-10 w-full text-center">
                    <h3 className="text-2xl font-serif mb-6 text-theme-strong">{config.thank_you_title}</h3>
                    <div className="text-sm leading-8 mb-8 whitespace-pre-line px-2 text-theme-subtle">
                      {config.thank_you_message}
                    </div>
                  </div>

                  <div className="w-full flex items-center justify-center mt-auto pt-6 border-t border-theme-subtle/60 relative z-10">
                    <span
                      dir="ltr"
                      className="inline-flex items-center justify-center rounded-full border border-theme-subtle/70 bg-theme-faint px-4 py-2 text-[11px] tracking-[0.18em] text-theme-subtle uppercase"
                    >
                      washa.shop
                    </span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* 3. Wash & Care Instructions */}
        <div>
          <SectionTitle title="تعليمات العناية" subtitle="Care Instructions" number="03" />
          
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <div className="w-full lg:w-3/5 flex justify-center">
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95 }}
                 whileInView={{ opacity: 1, scale: 1 }}
                 viewport={{ once: true, margin: "-100px" }}
                 className="relative w-full max-w-[450px]"
               >
                 <div
                   id="care-card"
                   className="w-full h-full border rounded-2xl p-8 sm:p-10 shadow-2xl overflow-hidden relative glass-premium hover-glow transition-all duration-700"
                 >
                   {/* Subtle Top Glow */}
                   <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-gold/20 dark:bg-gold/15 blur-[50px] z-0 rounded-full" />
                   {/* Grainy Texture */}
                   <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none mix-blend-overlay z-0" />

                   <div className="text-center mb-10 border-b border-theme-subtle/60 pb-6 relative z-10">
                     <h3 className="text-2xl font-bold tracking-wide text-theme-strong mb-2">تعليمات الغسيل والكي</h3>
                     <p className="text-theme-subtle text-sm">للحفاظ على جودة القطعة والطباعة لأطول فترة ممكنة</p>
                   </div>

                   <div className="space-y-4 relative z-10">
                     <CareItem 
                       icon={Droplets}
                       title="الغسيل بالماء البارد"
                       desc="لا تتجاوز درجة حرارة الماء 30 مئوية"
                     />
                     <CareItem 
                       icon={Shirt}
                       title="قلب القطعة"
                       desc="اغسل القطعة مقلوبة من الداخل للخارج"
                     />
                     <CareItem 
                       icon={Wind}
                       title="تجفيف بالهواء الطلق"
                       desc="تجنب استخدام النشافة الحرارية (Tumble Dry)"
                     />
                     <CareItem 
                       icon={ShieldAlert}
                       title="بدون مبيضات"
                       desc="لا تستخدم الكلور أو المبيضات القوية"
                     />
                     <CareItem 
                       icon={Thermometer}
                       title="الكي بحذر"
                       desc="لا تقم بكي منطقة الطباعة مباشرة، اكوها مقلوبة أو ضع قطعة قماش فاصلة"
                     />
                   </div>
                   
                   <div className="mt-10 text-center flex justify-center relative z-10">
                     <Logo size="sm" className="opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all" />
                   </div>
                 </div>
               </motion.div>
            </div>

            <div className="w-full lg:w-2/5 space-y-6">
              <h3 className="text-3xl font-bold text-theme-strong">العناية بالفن</h3>
              <p className="text-theme-subtle leading-loose">
                كل قطعة من وشّى ليست مجرد ملابس، بل هي لوحة فنية مطبوعة باستخدام أفضل تقنيات الطباعة المباشرة على القماش (DTG). لضمان بقاء الألوان نابضة بالحياة، قمنا بتصميم بطاقة تعليمات العناية التي تشرح بدقة وسهولة كيفية المحافظة على القطعة.
              </p>
              <div className="pt-4 border-t border-theme-strong/10">
                <button
                  onClick={() => handleDownload("care-card", "wusha-care-instructions")}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-theme-strong/5 hover:bg-gold hover:text-white transition-colors text-theme-strong rounded-xl text-sm font-bold shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  حفظ بطاقة التعليمات (جودة عالية)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Social Media (Linktree) Card */}
        <div className="mt-32 md:mt-48 mb-32 md:mb-48">
          <SectionTitle title="بطاقة التواصل الاجتماعي" subtitle="Social Links Card" number="04" align="right" />
          
          <div className="flex flex-col-reverse lg:flex-row items-center gap-12 lg:gap-20">
            <div className="w-full lg:w-2/5 space-y-6">
              <h3 className="text-3xl font-bold text-theme-strong">منصة رقمية موحدة</h3>
              <p className="text-theme-subtle leading-loose">
                بطاقة أنيقة بأسلوب مباشر (Linktree) تجمع كافة روابط وشّى الرقمية. مُصممة بأسلوب عصري يسهل مشاركته عبر منصات التواصل الاجتماعي أو إضافتها لملف التعريف الخاص بشركتكم لتكون بوابة شاملة للتواصل مع العملاء.
              </p>
              <div className="pt-4 border-t border-theme-strong/10">
                <button
                  onClick={() => handleDownload("social-card", "wusha-social-links-card")}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-theme-strong/5 hover:bg-gold hover:text-white transition-colors text-theme-strong rounded-xl text-sm font-bold shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  حفظ بطاقة التواصل بالكامل (رأسية)
                </button>
              </div>
            </div>

            <div className="w-full lg:w-3/5 flex justify-center perspective-1000">
              <motion.div 
                initial={{ opacity: 0, y: 50, rotateX: -10 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                whileHover={{ scale: 1.02 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="relative w-full max-w-[320px] aspect-[9/16]"
              >
                <div
                  id="social-card"
                  className="w-full h-full rounded-2xl p-5 sm:p-6 flex flex-col items-center justify-start overflow-hidden relative shadow-2xl border glass-premium hover-glow transition-all duration-700"
                >
                  
                  {/* Subtle Top Glow & Shimmers */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-gold/20 dark:bg-gold/15 blur-[50px] z-0 rounded-full" />
                  
                  {/* Grainy Texture */}
                  <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] pointer-events-none mix-blend-overlay z-0" />
                  
                  <div className="relative z-10 flex w-full flex-1 flex-col items-center pt-2 min-h-0">
                    <Logo size="md" className="mb-4 drop-shadow-xl" />
                    <h2 className="text-xl font-bold text-theme-strong mb-1 tracking-wide">{config.linktree_title || "وشّى منصة الفن"}</h2>
                    <p className="text-gold text-xs tracking-widest uppercase mb-6">{config.linktree_subtitle || "@washha.sa"}</p>

                    {/* Social Buttons List */}
                    <div className="w-full flex flex-col gap-2.5">
                      {config.social_instagram && config.show_instagram !== false && (
                        <div className="w-full px-4 py-2.5 rounded-2xl border border-theme-subtle bg-theme-faint flex items-center gap-3 relative overflow-hidden group transition-all duration-300">
                          <Instagram className="w-5 h-5 text-gold shrink-0" />
                          <span className="text-theme-strong text-[13px] font-medium tracking-wide flex-1 min-w-0 truncate text-left" dir="ltr">{config.social_instagram}</span>
                        </div>
                      )}
                      
                      {config.social_twitter && config.show_twitter !== false && (
                        <div className="w-full px-4 py-2.5 rounded-2xl border border-theme-subtle bg-theme-faint flex items-center gap-3 relative overflow-hidden group transition-all duration-300">
                          <XIcon className="w-5 h-5 text-gold shrink-0" />
                          <span className="text-theme-strong text-[13px] font-medium tracking-wide flex-1 min-w-0 truncate text-left" dir="ltr">{config.social_twitter}</span>
                        </div>
                      )}
                      
                      {config.social_tiktok && config.show_tiktok !== false && (
                        <div className="w-full px-4 py-2.5 rounded-2xl border border-theme-subtle bg-theme-faint flex items-center gap-3 relative overflow-hidden group transition-all duration-300">
                          <TikTokIcon className="w-5 h-5 text-gold shrink-0" />
                          <span className="text-theme-strong text-[13px] font-medium tracking-wide flex-1 min-w-0 truncate text-left" dir="ltr">{config.social_tiktok}</span>
                        </div>
                      )}
                      
                      {config.social_snapchat && config.show_snapchat !== false && (
                        <div className="w-full px-4 py-2.5 rounded-2xl border border-theme-subtle bg-theme-faint flex items-center gap-3 relative overflow-hidden group transition-all duration-300">
                          <SnapchatIcon className="w-5 h-5 text-gold shrink-0" />
                          <span className="text-theme-strong text-[13px] font-medium tracking-wide flex-1 min-w-0 truncate text-left" dir="ltr">{config.social_snapchat}</span>
                        </div>
                      )}

                      {config.social_whatsapp && config.show_whatsapp !== false && (
                        <div className="w-full px-4 py-2.5 rounded-2xl border border-theme-subtle bg-theme-faint flex items-center gap-3 relative overflow-hidden group transition-all duration-300 mt-0.5">
                          <WhatsAppIcon className="w-5 h-5 text-green-500 shrink-0" />
                          <span className="text-theme-strong text-[13px] font-medium tracking-wide flex-1 min-w-0 truncate text-left" dir="ltr">{config.social_whatsapp}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Web URL Footer Wrapper */}
                  {config.show_website !== false && (
                      <div className="relative z-10 mt-5 w-full border-t border-theme-subtle/60 pt-4 pb-1 text-center">
                        <span
                          dir="ltr"
                          className="mx-auto inline-flex max-w-full items-center justify-center rounded-full border border-theme-subtle/70 bg-theme-faint px-4 py-2 text-[11px] tracking-[0.18em] text-theme-subtle uppercase truncate"
                        >
                          {socialCardWebsite}
                        </span>
                      </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// Helper Components
function SectionTitle({ title, subtitle, number, align = "left" }: { title: string, subtitle: string, number: string, align?: "left" | "right" }) {
  return (
    <div className={`flex flex-col ${align === "right" ? "lg:items-end lg:text-right" : "lg:items-start lg:text-left"} mb-12 lg:mb-16`}>
      <span className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-theme-strong/10 to-transparent absolute opacity-50 -mt-8 md:-mt-12 select-none pointer-events-none">
        {number}
      </span>
      <h2 className="text-3xl md:text-5xl font-bold text-theme-strong relative z-10">{title}</h2>
      <p className="text-gold font-medium tracking-widest uppercase mt-2">{subtitle}</p>
    </div>
  );
}

function CareItem({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <div className="flex items-start gap-4 px-4 py-3 rounded-2xl border border-theme-subtle bg-theme-faint transition-all duration-300">
      <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-gold" />
      </div>
      <div>
        <h4 className="font-bold text-sm sm:text-base mb-1 text-theme-strong">{title}</h4>
        <p className="text-xs sm:text-sm text-theme-subtle">{desc}</p>
      </div>
    </div>
  );
}
