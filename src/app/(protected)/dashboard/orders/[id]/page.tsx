import { redirect } from "next/navigation";

interface PageProps {
    params: { id: string };
}

export default async function OrderDetailPage({ params }: PageProps) {
    // Just redirect to the main orders page with focus
    redirect(`/dashboard/orders?focus=${params.id}`);
}
