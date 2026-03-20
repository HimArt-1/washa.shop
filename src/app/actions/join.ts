// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — Join Form Action
//  حفظ بيانات المنضمين الجدد
// ═══════════════════════════════════════════════════════════

"use server";

import { submitJoinLead } from "@/app/actions/forms";

interface JoinFormData {
    name: string;
    email: string;
    phone: string;
    joinType: "artist" | "designer" | "model" | "customer" | "partner" | "";
    gender: "male" | "female" | "";
    birthDate: string;
    clothing: string[];
}

export async function submitJoinForm(data: JoinFormData) {
    return submitJoinLead(data);
}
