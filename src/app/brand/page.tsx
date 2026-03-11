import { getSiteSettings } from "@/app/actions/settings";
import BrandAssetsClient from "./BrandAssetsClient";

export default async function BrandAssetsPage() {
  const settings = await getSiteSettings();
  const config = settings.brand_assets || {
    business_card_name: "هشام الزهراني",
    business_card_title: "المدير التنفيذي",
    business_card_phone: "+966 53 223 5005",
    business_card_email: "washaksa@hotmail.com",
    business_card_website: "www.washa.shop",
    thank_you_title: "شكراً لثقتكم",
    thank_you_message: "نحن في \"وشّى\" نصنع الفن بحُب وإتقان، \nونتمنى أن تنال هذه القطعة الفنية إعجابك كما نالت شغفنا بصنعها.\n\nيسعدنا مشاركتك لإطلالتك معنا!",
    thank_you_handle: "@washha.sa"
  };

  return <BrandAssetsClient config={config} />;
}
