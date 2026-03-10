"use client";

import { useState, useEffect } from "react";
import { Star, Send, Loader2 } from "lucide-react";
import { getArtworkReviews, submitArtworkReview, getUserArtworkReview } from "@/app/actions/reviews";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";

interface ArtworkReviewsProps {
    artworkId: string;
    initialReviews: { id: string; rating: number; comment: string | null; created_at: string; user: { display_name: string; avatar_url: string | null } }[];
}

export function ArtworkReviews({ artworkId, initialReviews }: ArtworkReviewsProps) {
    const { isSignedIn } = useUser();
    const [reviews, setReviews] = useState(initialReviews);
    const [userReview, setUserReview] = useState<{ rating: number; comment: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingUser, setLoadingUser] = useState(true);

    const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

    useEffect(() => {
        if (isSignedIn) {
            getUserArtworkReview(artworkId).then((r) => {
                if (r) setUserReview({ rating: r.rating, comment: r.comment || "" });
                setLoadingUser(false);
            });
        } else {
            setLoadingUser(false);
        }
    }, [artworkId, isSignedIn]);

    const handleSubmit = async () => {
        if (!userReview || userReview.rating < 1) return;
        setLoading(true);
        const res = await submitArtworkReview(artworkId, userReview.rating, userReview.comment || undefined);
        setLoading(false);
        if (res.success) {
            const fresh = await getArtworkReviews(artworkId);
            setReviews(fresh);
        }
    };

    return (
        <div className="mt-12 pt-8 border-t border-theme-subtle">
            <h2 className="text-xl font-bold text-theme mb-6">التقييمات والمراجعات</h2>

            <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                            key={s}
                            className={`w-5 h-5 ${s <= Math.round(avgRating) ? "text-gold fill-gold" : "text-theme-faint"}`}
                        />
                    ))}
                </div>
                <span className="text-theme-soft text-sm">{avgRating.toFixed(1)} ({reviews.length} تقييم)</span>
            </div>

            {isSignedIn && !loadingUser && (
                <div className="mb-8 p-5 rounded-2xl bg-theme-faint border border-theme-subtle">
                    <p className="text-sm text-theme-soft mb-3">أضف تقييمك</p>
                    <div className="flex gap-2 mb-3">
                        {[1, 2, 3, 4, 5].map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setUserReview((u) => ({ ...(u || { rating: 0, comment: "" }), rating: s }))}
                                className={`p-1 rounded ${(userReview?.rating ?? 0) >= s ? "text-gold" : "text-theme-faint hover:text-theme-subtle"}`}
                            >
                                <Star className={`w-6 h-6 ${(userReview?.rating ?? 0) >= s ? "fill-gold" : ""}`} />
                            </button>
                        ))}
                    </div>
                    <textarea
                        value={userReview?.comment ?? ""}
                        onChange={(e) => setUserReview((u) => ({ ...(u || { rating: 0, comment: "" }), comment: e.target.value }))}
                        placeholder="اكتب مراجعتك (اختياري)..."
                        className="w-full px-4 py-3 rounded-xl bg-theme-subtle border border-theme-soft text-theme text-sm mb-3 resize-none"
                        rows={3}
                        dir="rtl"
                    />
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !userReview?.rating}
                        className="btn-gold py-2.5 px-6 text-sm inline-flex items-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        إرسال
                    </button>
                </div>
            )}

            {!isSignedIn && (
                <p className="text-theme-subtle text-sm mb-6">سجّل الدخول لإضافة تقييمك</p>
            )}

            <div className="space-y-4">
                {reviews.map((r) => (
                    <div key={r.id} className="p-4 rounded-xl bg-theme-faint border border-theme-faint">
                        <div className="flex items-center gap-3 mb-2">
                            {r.user?.avatar_url ? (
                                <Image src={r.user.avatar_url} alt="" width={32} height={32} className="rounded-full" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-gold/20" />
                            )}
                            <div>
                                <p className="text-sm font-medium text-theme">{r.user?.display_name || "مستخدم"}</p>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? "text-gold fill-gold" : "text-theme-faint"}`} />
                                    ))}
                                    <span className="text-xs text-theme-subtle mr-2">
                                        {new Date(r.created_at).toLocaleDateString("ar-SA")}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {r.comment && <p className="text-sm text-theme-soft pr-11">{r.comment}</p>}
                    </div>
                ))}
            </div>

            {reviews.length === 0 && (
                <p className="text-theme-subtle text-sm py-8 text-center">لا توجد مراجعات بعد. كن أول من يقيّم!</p>
            )}
        </div>
    );
}
