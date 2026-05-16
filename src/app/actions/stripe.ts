"use server";

import { stripe } from "@/lib/stripe";
import { currentUser } from "@clerk/nextjs/server";
import { getSupabaseAdminClient } from "@/lib/supabase";

export interface CheckoutItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  description?: string;
  // Custom design fields (if applicable)
  custom_design_url?: string;
  custom_design_order_id?: string;
  custom_garment?: string;
}

export async function createCheckoutSession(items: CheckoutItem[], successUrl: string, cancelUrl: string, couponId?: string) {
  try {
    const user = await currentUser();
    if (!user) {
      return { success: false, error: "يجب تسجيل الدخول لإتمام الطلب" };
    }

    if (!stripe) {
      return { success: false, error: "بوابة الدفع غير مفعلة حالياً" };
    }

    const supabase = getSupabaseAdminClient();

    // 1. Get or create buyer's profile to attach to the Stripe session
    const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("clerk_id", user.id)
        .single();

    let buyerId: string;

    if (profile) {
        buyerId = profile.id;
    } else {
        const { data: newProfile, error: profileError } = await supabase
            .from("profiles")
            .insert({
                clerk_id: user.id,
                display_name: user.firstName || user.username || "مشترك",
                username: user.username || `user_${user.id.slice(-8)}`,
                role: "subscriber",
                bio: null,
                avatar_url: null,
                cover_url: null,
                website: null,
                wushsha_level: null,
            } as any)
            .select("id")
            .single();

        if (profileError || !newProfile) {
            return { success: false, error: "فشل في إنشاء الملف الشخصي" };
        }
        buyerId = newProfile.id;
    }

    // 2. Format line items for Stripe Checkout
    const lineItems = items.map((item) => {
      return {
        price_data: {
          currency: "SAR",
          product_data: {
          name: item.name,
          description: item.description || `Size / Details included in order record`,
          images: item.image ? [item.image] : undefined,
          },
          // Stripe requires amounts in the smallest currency unit (Halalas for SAR)
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      };
    });

    // Add shipping cost as a line item for now (or use Stripe Shipping Rates)
    lineItems.push({
      price_data: {
        currency: "SAR",
        product_data: {
          name: "تكلفة الشحن",
          description: "شحن قياسي داخل المملكة",
          images: [],
        },
        unit_amount: 30 * 100, // 30 SAR Shipping
      },
      quantity: 1,
    });

    // Calculate Subtotal for the pending order record
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    // 2.5 Server-side Security Coupon Validation
    let finalDiscountValue = 0;
    let stripeCouponParams = {};

    if (couponId) {
        const { data: validCoupon } = await supabase
            .from("discount_coupons")
            .select("*")
            .eq("id", couponId)
            .eq("is_active", true)
            .single();

        if (validCoupon) {
            // Check limits again on backend
            const isValidDate = !validCoupon.valid_until || new Date(validCoupon.valid_until) > new Date();
            const isUnderLimit = validCoupon.max_uses === 0 || validCoupon.current_uses < validCoupon.max_uses;
            
            if (isValidDate && isUnderLimit) {
                if (validCoupon.discount_type === 'percentage') {
                    finalDiscountValue = (subtotal * validCoupon.discount_value) / 100;
                    
                    // We generate an ephemeral inline stripe coupon/discount mapping if needed, 
                    // or just inject negative line items. We'll use stripe's discount system API loosely:
                     stripeCouponParams = {
                        discounts: [{
                           coupon: await createEphemeralStripeCoupon(
                               validCoupon.discount_value, 
                               'percentage', 
                               validCoupon.code
                           ) 
                        }]
                    };
                } else {
                    finalDiscountValue = Math.min(validCoupon.discount_value, subtotal);
                    stripeCouponParams = {
                        discounts: [{
                           coupon: await createEphemeralStripeCoupon(
                               finalDiscountValue * 100, 
                               'amount', 
                               validCoupon.code
                           ) 
                        }]
                    };
                }
            }
        }
    }

    const discountedSubtotal = Math.max(0, subtotal - finalDiscountValue);
    const tax = discountedSubtotal * 0.15; // 15% VAT AFTER discount is standard
    const total = discountedSubtotal + 30 + tax;

    // 3. Create a "Pending" order in Supabase BEFORE creating the checkout session
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
          buyer_id: buyerId,
          subtotal,
          shipping_cost: 30,
          tax,
          total,
          currency: "SAR",
          status: "pending",
          payment_status: "pending",
          discount_amount: finalDiscountValue,
          coupon_id: couponId || null,
          notes: null,
          shipping_address: { 
            name: user.firstName || "Customer", 
            line1: "TBD from Stripe", 
            city: "TBD", 
            country: "SA", 
            postal_code: "00000" 
          },
      })
      .select("id, order_number")
      .single();

    if (orderError || !order) {
        console.error("[StripeCheckout] Order creation error:", orderError);
        return { success: false, error: "حدث خطأ أثناء إعداد الطلب" };
    }

    // Insert the order items
    const orderItemsRecord = items.map((item) => ({
      order_id: order.id,
      product_id: item.id.startsWith("custom-") ? null : item.id, // differentiate if needed
      quantity: item.quantity,
      size: null, 
      unit_price: item.price,
      total_price: item.price * item.quantity,
      ...((item.custom_design_url || item.custom_design_order_id) && {
          custom_design_url: item.custom_design_url ?? null,
          custom_garment: item.custom_garment,
          custom_title: item.name,
      }),
      ...(item.custom_design_order_id && {
          custom_design_order_id: item.custom_design_order_id,
      }),
    })) as any;

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItemsRecord);

    if (itemsError) {
      console.error("[StripeCheckout] Order items error:", itemsError);
    } // Continue even if items fail partially, or roll back in a real robust system.

    // 4. Create the Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      ...stripeCouponParams,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${successUrl}?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${cancelUrl}`,
      customer_email: user.emailAddresses?.[0]?.emailAddress,
      // Pass the Supabase order ID to Stripe metadata so the webhook can retrieve it later
      metadata: {
        order_id: order.id,
        buyer_id: buyerId,
        coupon_id: couponId || "",
      },
      // Optionally collect shipping address via Stripe
      shipping_address_collection: {
        allowed_countries: ['SA', 'AE', 'KW', 'BH', 'QA', 'OM'],
      },
      // You can also compute and add actual tax rates within Stripe if pre-configured
    });

    return { success: true, url: session.url };

  } catch (error: any) {
    console.error("[StripeCheckout] Error setting up session:", error);
    return { success: false, error: error.message || "حدث خطأ غير متوقع" };
  }
}

/**
 * Creates a one-off ephemeral coupon in Stripe to match WUSHA's internal DB discount values.
 * This ensures the Stripe Hosted Checkout displays the exact matching discount line item.
 */
async function createEphemeralStripeCoupon(value: number, type: 'percentage' | 'amount', internalCode: string) {
    if (!stripe) throw new Error("Stripe client is not initialized");
    try {
        const coupon = await stripe.coupons.create({
            ...(type === 'percentage' ? { percent_off: value } : { amount_off: value, currency: 'SAR' }),
            duration: 'once',
            name: internalCode, // Will display as "WUSHA20" on the checkout page
        });
        return coupon.id;
    } catch (error) {
        console.error("[StripeCheckout] Failed to create ephemeral coupon:", error);
        throw new Error("فشل تطبيق الخصم على بوابة الدفع");
    }
}
