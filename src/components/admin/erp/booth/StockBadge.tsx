"use client";

import { useBooth } from "./BoothContext";
import { stockLevel, totalStock } from "./format";
import { Pill } from "./ui";

export function StockBadge({ pid }: { pid: number }) {
    const { stock, thresholds } = useBooth();
    const tot = totalStock(pid, stock);
    const level = stockLevel(pid, stock, thresholds);
    if (level === "out") return <Pill tone="red">نافذ</Pill>;
    if (level === "low") return <Pill tone="amber">منخفض {tot}</Pill>;
    return <Pill tone="forest">كافٍ {tot}</Pill>;
}
