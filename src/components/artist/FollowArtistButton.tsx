"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { followArtist, unfollowArtist, isFollowingArtist } from "@/app/actions/social";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";

interface FollowArtistButtonProps {
    artistId: string;
    artistUsername: string;
    followersCount: number;
}

export function FollowArtistButton({ artistId, artistUsername, followersCount: initialCount }: FollowArtistButtonProps) {
    const [isFollowing, setIsFollowing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [count, setCount] = useState(initialCount);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && artistId) {
            isFollowingArtist(artistId).then(setIsFollowing);
        }
    }, [mounted, artistId]);

    const handleClick = async () => {
        if (loading) return;
        setLoading(true);
        const result = isFollowing
            ? await unfollowArtist(artistId)
            : await followArtist(artistId);
        setLoading(false);
        if (result.success) {
            setIsFollowing(!isFollowing);
            setCount((c) => (isFollowing ? c - 1 : c + 1));
            router.refresh();
        }
    };

    if (!mounted) return null;

    return (
        <>
            <SignedIn>
                <button
                    onClick={handleClick}
                    disabled={loading}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        isFollowing
                            ? "border border-white/20 bg-theme-subtle text-theme-soft hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400"
                            : "bg-gold/20 border border-gold/30 text-gold hover:bg-gold/30"
                    }`}
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isFollowing ? (
                        <>
                            <UserMinus className="w-4 h-4" />
                            إلغاء المتابعة
                        </>
                    ) : (
                        <>
                            <UserPlus className="w-4 h-4" />
                            متابعة
                        </>
                    )}
                </button>
            </SignedIn>
            <SignedOut>
                <Link
                    href={`/sign-in?redirect_url=/artists/${artistUsername}`}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-gold/20 border border-gold/30 text-gold hover:bg-gold/30 transition-all"
                >
                    <UserPlus className="w-4 h-4" />
                    متابعة
                </Link>
            </SignedOut>
            <span className="text-theme-faint text-sm">{count} متابع</span>
        </>
    );
}
