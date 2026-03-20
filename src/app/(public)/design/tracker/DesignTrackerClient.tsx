"use client";

import { OrderTracker } from "@/components/design-your-piece/OrderTracker";

export default function DesignTrackerClient({ orderId, trackerToken }: { orderId: string; trackerToken?: string | null }) {
    return <OrderTracker orderId={orderId} trackerToken={trackerToken} />;
}
