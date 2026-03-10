export default function PublicLoading() {
    return (
        <div
            className="min-h-screen bg-bg flex items-center justify-center"
            dir="rtl"
        >
            <div className="text-center">
                {/* Spinner */}
                <div className="relative w-16 h-16 mx-auto mb-6">
                    <div className="absolute inset-0 rounded-full border-2 border-gold/10" />
                    <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold animate-spin" />
                    <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-gold/50 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
                </div>

                {/* Text */}
                <p className="text-theme-faint text-sm animate-pulse">
                    جاري التحميل...
                </p>
            </div>
        </div>
    );
}
