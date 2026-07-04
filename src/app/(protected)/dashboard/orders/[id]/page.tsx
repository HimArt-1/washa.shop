import { redirect } from "next/navigation";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
    const { id } = await params;
    // Just redirect to the main orders page with focus
    redirect(`/dashboard/orders?focus=${id}`);
}
