// إنشاء حساب أدمن في Supabase Auth وربطه بالملف الشخصي
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_DISPLAY_NAME = process.env.ADMIN_DISPLAY_NAME || "WASHA Admin";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "washa_admin";

if (!url) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL is missing");
    process.exit(1);
}

if (!serviceKey) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY is missing");
    process.exit(1);
}

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error("❌ ADMIN_EMAIL and ADMIN_PASSWORD are required");
    process.exit(1);
}

if (ADMIN_PASSWORD.length < 12) {
    console.error("❌ ADMIN_PASSWORD must be at least 12 characters");
    process.exit(1);
}

const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
});

async function main() {
    console.log("🔧 Creating admin user in Supabase Auth...");

    // 1. Create auth user
    const { data: authUser, error: authError } =
        await supabase.auth.admin.createUser({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            email_confirm: true,
            user_metadata: { full_name: ADMIN_DISPLAY_NAME },
        });

    if (authError) {
        if (authError.message?.includes("already been registered")) {
            console.log("⚠️ User already exists, fetching...");
            const { data: { users } } = await supabase.auth.admin.listUsers();
            const existing = users?.find((u) => u.email === ADMIN_EMAIL);
            if (existing) {
                console.log("✅ Found existing user:", existing.id);
                await linkProfile(existing.id);
            }
            return;
        }
        console.error("❌ Auth error:", authError);
        return;
    }

    console.log("✅ Auth user created:", authUser.user.id);

    // 2. Link to profile
    await linkProfile(authUser.user.id);
}

async function linkProfile(userId) {
    // Check if admin profile exists
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, clerk_id, display_name, role")
        .eq("role", "admin")
        .limit(1)
        .single();

    if (profile) {
        console.log("📝 Found admin profile:", profile.display_name, "| current clerk_id:", profile.clerk_id);
        const { error } = await supabase
            .from("profiles")
            .update({ clerk_id: userId })
            .eq("id", profile.id);

        if (error) {
            console.error("❌ Update error:", error);
        } else {
            console.log("✅ Profile linked to Supabase Auth user:", userId);
        }
    } else {
        console.log("📝 No admin profile found. Creating one...");
        const { error } = await supabase.from("profiles").insert({
            clerk_id: userId,
            display_name: ADMIN_DISPLAY_NAME,
            username: ADMIN_USERNAME,
            role: "admin",
        });
        if (error) {
            console.error("❌ Insert error:", error);
        } else {
            console.log("✅ Admin profile created and linked.");
        }
    }

    console.log("\n═══════════════════════════════════════");
    console.log("  بيانات تسجيل الدخول:");
    console.log("  البريد:", ADMIN_EMAIL);
    console.log("  كلمة المرور: محفوظة في ADMIN_PASSWORD ولن تتم طباعتها");
    console.log("═══════════════════════════════════════\n");
}

main().catch(console.error);
