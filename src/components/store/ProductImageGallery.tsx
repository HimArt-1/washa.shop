"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductImageGalleryProps {
    mainImage: string;
    images: string[];
    title: string;
    type: string;
}

export function ProductImageGallery({ mainImage, images, title, type }: ProductImageGalleryProps) {
    // Combine main + extra images, deduplicate
    const allImages = [mainImage, ...images.filter((img) => img !== mainImage)];
    const [activeIdx, setActiveIdx] = useState(0);
    const hasMultiple = allImages.length > 1;

    const goTo = (idx: number) => {
        setActiveIdx((idx + allImages.length) % allImages.length);
    };

    return (
        <div className="theme-surface-panel rounded-[2rem] p-3 sm:p-4 xl:sticky xl:top-28 xl:self-start">
            {/* Main Image */}
            <div className="relative aspect-square rounded-[1.55rem] overflow-hidden bg-theme-subtle group">
                <Image
                    src={allImages[activeIdx]}
                    alt={`${title} - صورة ${activeIdx + 1}`}
                    fill
                    className="object-cover transition-all duration-500"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority={activeIdx === 0}
                />
                <span className="absolute top-4 right-4 text-xs bg-[color:rgba(15,15,15,0.42)] backdrop-blur-md text-on-dark px-3 py-1 rounded-full">
                    {type}
                </span>

                {/* Navigation Arrows */}
                {hasMultiple && (
                    <>
                        <button
                            onClick={() => goTo(activeIdx - 1)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[color:rgba(15,15,15,0.5)] backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-[color:rgba(15,15,15,0.7)] hover:scale-110"
                            aria-label="الصورة السابقة"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => goTo(activeIdx + 1)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[color:rgba(15,15,15,0.5)] backdrop-blur-md text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-[color:rgba(15,15,15,0.7)] hover:scale-110"
                            aria-label="الصورة التالية"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>

                        {/* Dots indicator */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-[color:rgba(15,15,15,0.4)] backdrop-blur-md rounded-full px-2.5 py-1.5">
                            {allImages.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveIdx(idx)}
                                    className={cn(
                                        "rounded-full transition-all duration-300",
                                        idx === activeIdx
                                            ? "w-5 h-2 bg-[color:var(--wusha-gold)]"
                                            : "w-2 h-2 bg-white/40 hover:bg-white/70"
                                    )}
                                    aria-label={`صورة ${idx + 1}`}
                                />
                            ))}
                        </div>
                    </>
                )}

                {/* Image counter */}
                {hasMultiple && (
                    <span className="absolute top-4 left-4 text-[10px] bg-[color:rgba(15,15,15,0.42)] backdrop-blur-md text-on-dark px-2 py-0.5 rounded-full">
                        {activeIdx + 1}/{allImages.length}
                    </span>
                )}
            </div>

            {/* Thumbnails */}
            {hasMultiple && (
                <div className="mt-3 flex gap-2 overflow-x-auto styled-scrollbar pb-1 px-0.5">
                    {allImages.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveIdx(idx)}
                            className={cn(
                                "relative shrink-0 w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl overflow-hidden transition-all duration-300 border-2",
                                idx === activeIdx
                                    ? "border-[color:var(--wusha-gold)] ring-2 ring-[color:var(--wusha-gold)]/20 scale-105"
                                    : "border-transparent opacity-60 hover:opacity-100 hover:border-theme-subtle"
                            )}
                        >
                            <Image
                                src={img}
                                alt={`${title} - مصغرة ${idx + 1}`}
                                fill
                                className="object-cover"
                                sizes="72px"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
