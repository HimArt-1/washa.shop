"use client";

import { motion } from "framer-motion";
import { 
  Sparkles, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Droplets, 
  Wind, 
  Sun,
  Thermometer,
  ShieldAlert,
  Shirt
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";

export default function BrandAssetsClient({ config }: { config: any }) {

  return (
    <div className="min-h-screen bg-theme-bg pt-24 pb-32 overflow-hidden selection:bg-gold/30 selection:text-gold">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-theme-strong/5 blur-[150px] rounded-full mix-blend-screen" />
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
                className="relative w-full max-w-[400px] aspect-[1.75/1] rounded-xl shadow-2xl border border-white/5 overflow-hidden group cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #322014 0%, #1A110A 100%)",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(202, 160, 82, 0.1) inset"
                }}
              >
                 {/* Gold Edge shine */}
                 <div className="absolute inset-0 border border-gold/10 rounded-xl" />
                 <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-3xl" />
                 
                 <div className="h-full flex flex-col justify-between p-8">
                   <div className="flex justify-between items-start">
                     <div>
                       <h2 className="text-2xl font-bold text-white mb-1">{config.business_card_name}</h2>
                       <p className="text-gold text-sm font-medium tracking-wide">{config.business_card_title}</p>
                     </div>
                     <Logo size="sm" />
                   </div>
                   
                   <div className="space-y-3 mt-8">
                     <div className="flex items-center gap-3 text-white/70 text-sm">
                       <Phone className="w-4 h-4 text-gold flex-shrink-0" />
                       <span dir="ltr" className="tracking-wider">{config.business_card_phone}</span>
                     </div>
                     <div className="flex items-center gap-3 text-white/70 text-sm">
                       <Mail className="w-4 h-4 text-gold flex-shrink-0" />
                       <span dir="ltr">{config.business_card_email}</span>
                     </div>
                     <div className="flex items-center gap-3 text-white/70 text-sm">
                       <Globe className="w-4 h-4 text-gold flex-shrink-0" />
                       <span dir="ltr">{config.business_card_website}</span>
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
                className="relative w-full max-w-[400px] aspect-[1.75/1] rounded-xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden flex items-center justify-center cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #3D2719 0%, #20140D 100%)",
                }}
              >
                {/* Spot UV logic (hidden visually unless hovered) */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-700" />
                <div className="absolute -inset-1/2 bg-gradient-to-r from-transparent via-gold/10 to-transparent -rotate-45 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
                
                <Logo size="lg" className="scale-125" />
              </motion.div>
            </div>

            <div className="w-full lg:w-2/5 space-y-6">
              <h3 className="text-3xl font-bold text-theme-strong">انعكاس الهوية</h3>
              <p className="text-theme-subtle leading-loose">
                صُممت بطاقة العمل لتعكس فلسفة "وشّى" بمزج الأناقة الكلاسيكية بالتقنية الحديثة. يرمز اللون الأسود العميق للغموض والفخامة، في حين يبرز الشعار الذهبي البصمة الفريدة، بالإضافة لمعلومات الاتصال المنسقة بعناية لسهولة الوصول.
              </p>
              <div className="flex gap-4 pt-4">
                <span className="px-3 py-1 bg-theme-strong/5 border border-theme-strong/10 rounded-md text-xs font-semibold text-theme-subtle">الطباعة: رقائق الذهب الساخنة</span>
                <span className="px-3 py-1 bg-theme-strong/5 border border-theme-strong/10 rounded-md text-xs font-semibold text-theme-subtle">الورق: أسود مطفي 600 جرام</span>
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
            </div>

            <div className="w-full lg:w-3/5 flex justify-center perspective-1000">
              <motion.div 
                initial={{ opacity: 0, y: 50, rotateX: 10 }}
                whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
                whileHover={{ y: -10, boxShadow: "0 30px 60px -15px rgba(202,160,82,0.2)" }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="relative w-full max-w-[320px] aspect-[1/1.4] bg-[#FDFBF7] dark:bg-[#1A1A1A] rounded-sm p-8 shadow-2xl border border-[#E5E0D8] dark:border-white/10 flex flex-col items-center text-center overflow-hidden"
              >
                {/* Paper Texture Overlay */}
                <div className="absolute inset-0 opacity-[0.4] bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')] pointer-events-none mix-blend-multiply dark:mix-blend-overlay dark:opacity-10" />
                
                <Logo size="sm" className="mb-8" />
                
                <div className="flex-1 flex flex-col justify-center">
                  <h3 className="text-2xl font-serif text-[#111] dark:text-white mb-6">{config.thank_you_title}</h3>
                  <div className="text-[#555] dark:text-gray-400 text-sm leading-8 mb-8 whitespace-pre-line">
                    {config.thank_you_message}
                  </div>
                </div>

                <div className="w-full flex items-center justify-between mt-auto pt-6 border-t border-[#E5E0D8] dark:border-white/10">
                  <span className="text-gold font-bold tracking-widest text-xs">{config.thank_you_handle}</span>
                  <div className="w-8 h-8 rounded-full border border-gold flex items-center justify-center">
                    <span className="text-gold font-serif italic text-sm">W</span>
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
                 className="relative w-full max-w-[450px] bg-theme-bg border border-theme-strong/10 rounded-2xl p-8 sm:p-10 shadow-xl overflow-hidden glass-card"
               >
                 <div className="text-center mb-10 border-b border-theme-strong/10 pb-6">
                   <h3 className="text-2xl font-bold tracking-wide text-theme-strong mb-2">تعليمات الغسيل والكي</h3>
                   <p className="text-theme-subtle text-sm">للحفاظ على جودة القطعة والطباعة لأطول فترة ممكنة</p>
                 </div>

                 <div className="space-y-6">
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
                 
                 <div className="mt-10 text-center flex justify-center">
                   <Logo size="sm" className="opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all" />
                 </div>
               </motion.div>
            </div>

            <div className="w-full lg:w-2/5 space-y-6">
              <h3 className="text-3xl font-bold text-theme-strong">العناية بالفن</h3>
              <p className="text-theme-subtle leading-loose">
                كل قطعة من وشّى ليست مجرد ملابس، بل هي لوحة فنية مطبوعة باستخدام أفضل تقنيات الطباعة المباشرة على القماش (DTG). لضمان بقاء الألوان نابضة بالحياة، قمنا بتصميم بطاقة تعليمات العناية التي تشرح بدقة وسهولة كيفية المحافظة على القطعة.
              </p>
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
    <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-theme-strong/5 transition-colors border border-transparent hover:border-theme-strong/10">
      <div className="w-10 h-10 rounded-full bg-theme-strong/5 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-theme-strong" />
      </div>
      <div>
        <h4 className="font-bold text-theme-strong text-sm sm:text-base mb-1">{title}</h4>
        <p className="text-xs sm:text-sm text-theme-subtle">{desc}</p>
      </div>
    </div>
  );
}
