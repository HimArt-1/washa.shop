import { getNewsletterSubscribers } from "@/app/actions/settings";
import { NewsletterClient } from "./NewsletterClient";

export default async function AdminNewsletterPage() {
    const { data: subscribers } = await getNewsletterSubscribers();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-fg">إدارة المشتركين</h1>
                <p className="text-fg/40 mt-1">عرض وإدارة مشتركي النشرة البريدية.</p>
            </div>

            <NewsletterClient subscribers={subscribers} />
        </div>
    );
}
