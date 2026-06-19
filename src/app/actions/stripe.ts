"use server";

export interface CheckoutItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  description?: string;
  custom_design_url?: string;
  custom_design_order_id?: string;
  custom_garment?: string;
}

export async function createCheckoutSession(
  _items: CheckoutItem[],
  _successUrl: string,
  _cancelUrl: string,
  _couponId?: string
) {
  return {
    success: false,
    error: "مسار Stripe القديم معطل. استخدم صفحة إتمام الطلب لإنشاء طلب مسعر من السيرفر.",
  };
}
