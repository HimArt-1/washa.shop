export default function DashboardLoading() {
    return (
        <div className="flex items-center justify-center min-h-[50vh]" dir="rtl">
            <div className="flex flex-col items-center gap-6">
                <div className="relative">
                    <div className="w-14 h-14 border-2 border-gold/20 rounded-2xl" />
                    <div className="absolute inset-0 w-14 h-14 border-2 border-transparent border-t-gold rounded-2xl animate-spin" />
                    <div className="absolute inset-1 w-10 h-10 border-2 border-transparent border-b-gold/50 rounded-xl animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.8s" }} />
                </div>
                <div className="text-center">
                    <p className="text-theme-soft text-sm font-medium">جاري تحميل لوحة الإدارة</p>
                    <p className="text-theme-faint text-xs mt-1">يرجى الانتظار...</p>
                </div>
            </div>
        </div>
    );
}
