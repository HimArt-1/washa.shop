"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, type ProfileFormData } from "@/lib/validations";
import { updateProfile, uploadProfileImage } from "@/app/actions/profile";
import { useState, useTransition } from "react";
import { Loader2, Save, AtSign, Globe, Instagram, Twitter, Youtube, Dribbble, ImagePlus, X } from "lucide-react";
import Image from "next/image";
import { compressImage } from "@/lib/image-compress";

interface ProfileFormProps {
    initialData?: Partial<ProfileFormData>;
    userRole?: "admin" | "wushsha" | "subscriber";
}

export function ProfileForm({ initialData, userRole = "subscriber" }: ProfileFormProps) {
    const [isPending, startTransition] = useTransition();
    const [state, setState] = useState<{ message?: string; success?: boolean; errors?: any }>({});
    const [avatarUrl, setAvatarUrl] = useState(initialData?.avatar_url || "");
    const [coverUrl, setCoverUrl] = useState(initialData?.cover_url || "");
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<ProfileFormData>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            display_name: initialData?.display_name || "",
            username: initialData?.username || "",
            bio: initialData?.bio || "",
            website: initialData?.website || "",
            avatar_url: initialData?.avatar_url || "",
            cover_url: initialData?.cover_url || "",
            social_links: {
                instagram: initialData?.social_links?.instagram || "",
                twitter: initialData?.social_links?.twitter || "",
                youtube: initialData?.social_links?.youtube || "",
                behance: initialData?.social_links?.behance || "",
                dribbble: initialData?.social_links?.dribbble || "",
            }
        },
    });

    const onSubmit = (data: ProfileFormData) => {
        startTransition(async () => {
            const formData = new FormData();
            formData.append("display_name", data.display_name);
            formData.append("username", data.username);

            if (data.bio) formData.append("bio", data.bio);
            if (data.website) formData.append("website", data.website);
            if (avatarUrl) formData.append("avatar_url", avatarUrl);
            if (coverUrl) formData.append("cover_url", coverUrl);

            if (data.social_links?.instagram) formData.append("social.instagram", data.social_links.instagram);
            if (data.social_links?.twitter) formData.append("social.twitter", data.social_links.twitter);
            if (data.social_links?.youtube) formData.append("social.youtube", data.social_links.youtube);
            if (data.social_links?.behance) formData.append("social.behance", data.social_links.behance);
            if (data.social_links?.dribbble) formData.append("social.dribbble", data.social_links.dribbble);

            const result = await updateProfile({}, formData);
            setState(result);
        });
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl space-y-8">
            {/* Success/Error Message */}
            {state.message && (
                <div className={`p-4 rounded-xl text-sm font-medium ${state.success ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                    {state.message}
                </div>
            )}

            {/* Avatar & Cover */}
            <div className="theme-surface-panel space-y-6 rounded-[2rem] p-6">
                <h3 className="text-lg font-bold text-theme border-b border-theme-subtle pb-4">الصور</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-theme-soft mb-2">صورة الملف الشخصي</label>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-theme-soft bg-theme-subtle flex items-center justify-center shrink-0">
                                {avatarUrl ? (
                                    <Image src={avatarUrl} alt="" width={96} height={96} className="object-cover w-full h-full" />
                                ) : (
                                    <ImagePlus className="w-10 h-10 text-theme-faint" />
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        disabled={uploadingAvatar}
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            setUploadingAvatar(true);
                                            try {
                                                let fileToUpload: File = file;
                                                try {
                                                    fileToUpload = await compressImage(file, "avatar");
                                                } catch {
                                                    // Compression not supported for this format, use original
                                                }
                                                const fd = new FormData();
                                                fd.append("file", fileToUpload);
                                                const res = await uploadProfileImage(fd, "avatar");
                                                if (res.success) setAvatarUrl(res.url);
                                                else setState({ success: false, message: res.error });
                                            } catch {
                                                setState({ success: false, message: "فشل ضغط الصورة" });
                                            }
                                            setUploadingAvatar(false);
                                        }}
                                    />
                                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/10 text-gold text-sm font-medium hover:bg-gold/20 transition-colors">
                                        {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                                        {uploadingAvatar ? "جاري الرفع..." : "رفع صورة"}
                                    </span>
                                </label>
                                {avatarUrl && (
                                    <button
                                        type="button"
                                        onClick={() => setAvatarUrl("")}
                                        className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                                    >
                                        <X className="w-3 h-3" /> إزالة
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-theme-soft mb-2">صورة الغلاف</label>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                            <div className="w-full max-w-[180px] h-24 rounded-2xl overflow-hidden border-2 border-theme-soft bg-theme-subtle flex items-center justify-center shrink-0">
                                {coverUrl ? (
                                    <Image src={coverUrl} alt="" width={180} height={96} className="object-cover w-full h-full" />
                                ) : (
                                    <ImagePlus className="w-10 h-10 text-theme-faint" />
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="cursor-pointer">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        disabled={uploadingCover}
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            setUploadingCover(true);
                                            try {
                                                let fileToUpload: File = file;
                                                try {
                                                    fileToUpload = await compressImage(file, "cover");
                                                } catch {
                                                    // Compression not supported for this format, use original
                                                }
                                                const fd = new FormData();
                                                fd.append("file", fileToUpload);
                                                const res = await uploadProfileImage(fd, "cover");
                                                if (res.success) setCoverUrl(res.url);
                                                else setState({ success: false, message: res.error });
                                            } catch {
                                                setState({ success: false, message: "فشل ضغط الصورة" });
                                            }
                                            setUploadingCover(false);
                                        }}
                                    />
                                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold/10 text-gold text-sm font-medium hover:bg-gold/20 transition-colors">
                                        {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
                                        {uploadingCover ? "جاري الرفع..." : "رفع غلاف"}
                                    </span>
                                </label>
                                {coverUrl && (
                                    <button
                                        type="button"
                                        onClick={() => setCoverUrl("")}
                                        className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                                    >
                                        <X className="w-3 h-3" /> إزالة
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Basic Info */}
            <div className="theme-surface-panel space-y-6 rounded-[2rem] p-6">
                <h3 className="text-lg font-bold text-theme border-b border-theme-subtle pb-4">البيانات الأساسية</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-theme-soft mb-2">الاسم المعروض</label>
                        <input
                            {...register("display_name")}
                            className="input-dark w-full rounded-xl p-3"
                            placeholder={userRole === "wushsha" ? "اسمك الفني أو الحقيقي" : "أدخل اسمك"}
                        />
                        {errors.display_name && <p className="text-red-500 text-xs mt-1">{errors.display_name.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-theme-soft mb-2">اسم المستخدم</label>
                        <div className="relative">
                            <AtSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-faint" />
                            <input
                                {...register("username")}
                                className="input-dark w-full rounded-xl p-3 pr-10 dir-ltr text-right"
                                placeholder="username"
                            />
                        </div>
                        {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
                        {state.errors?.username && <p className="text-red-500 text-xs mt-1">{state.errors.username[0]}</p>}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-theme-soft mb-2">نبذة عنك (Bio)</label>
                    <textarea
                        {...register("bio")}
                        className="input-dark h-32 w-full resize-none rounded-xl p-3"
                        placeholder={userRole === "wushsha" ? "اخبرنا قليلاً عن نفسك وفنك..." : "نبذة قصيرة عنك..."}
                    />
                    {errors.bio && <p className="text-red-500 text-xs mt-1">{errors.bio.message}</p>}
                </div>
            </div>

            {/* Social Links (Only for Wushsha & Admin) */}
            {(userRole === "wushsha" || userRole === "admin") && (
                <div className="theme-surface-panel space-y-6 rounded-[2rem] p-6">
                    <h3 className="text-lg font-bold text-theme border-b border-theme-subtle pb-4">التواجد الرقمي</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-theme-soft mb-2">
                                <Globe className="w-4 h-4" /> الموقع الشخصي
                            </label>
                            <input
                                {...register("website")}
                                className="input-dark w-full rounded-xl p-3 dir-ltr"
                                placeholder="https://your-portfolio.com"
                            />
                            {errors.website && <p className="text-red-500 text-xs mt-1">{errors.website.message}</p>}
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-theme-soft mb-2">
                                <Instagram className="w-4 h-4" /> انستجرام
                            </label>
                            <input
                                {...register("social_links.instagram")}
                                className="input-dark w-full rounded-xl p-3 dir-ltr"
                                placeholder="@username or URL"
                            />
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-theme-soft mb-2">
                                <Twitter className="w-4 h-4" /> تويتر / X
                            </label>
                            <input
                                {...register("social_links.twitter")}
                                className="input-dark w-full rounded-xl p-3 dir-ltr"
                                placeholder="@username or URL"
                            />
                        </div>

                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-theme-soft mb-2">
                                <Dribbble className="w-4 h-4" /> Dribbble
                            </label>
                            <input
                                {...register("social_links.dribbble")}
                                className="input-dark w-full rounded-xl p-3 dir-ltr"
                                placeholder="@username or URL"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-end">
                <button
                    type="submit"
                    disabled={isPending}
                    className="btn-gold flex items-center justify-center gap-2 rounded-xl px-8 py-3 font-bold shadow-lg shadow-gold/20 disabled:opacity-50"
                >
                    {isPending ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            جاري الحفظ...
                        </>
                    ) : (
                        <>
                            <Save className="w-5 h-5" />
                            حفظ التغييرات
                        </>
                    )}
                </button>
            </div>
        </form>
    );
}
