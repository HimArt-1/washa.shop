"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Search, User, Home, ArrowUpLeft } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/stores/cartStore";
import { CartDrawer } from "@/components/cart/CartDrawer";

const navItems = [
  { label: "المعرض", href: "/gallery" },
  { label: "المتجر", href: "/store" },
  { label: "صمّم قطعتك", href: "/design" },
];

export function Header({ visibility }: { visibility?: { gallery?: boolean; store?: boolean; design_piece?: boolean; hero_auth_buttons?: boolean; join_artist?: boolean; signup?: boolean; join?: boolean; ai_section?: boolean; } }) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { toggleCart, getCartCount } = useCartStore();
  const lastScrollY = useRef(0);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    // Auto-open cart if DTF Studio pushed an order to it
    if (typeof window !== 'undefined') {
      const flag = localStorage.getItem('wusha-open-cart');
      if (flag === '1') {
        localStorage.removeItem('wusha-open-cart');
        toggleCart(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter Nav Items according to visibility settings
  const filteredNavItems = navItems.filter((item) => {
    if (visibility === undefined) return true; // Show all by default if not passed
    
    if (item.href === "/gallery" && visibility.gallery === false) return false;
    if (item.href === "/store" && visibility.store === false) return false;
    if (item.href === "/design" && visibility.design_piece === false) return false;
    
    return true;
  });

  const isNavItemActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const scrollingDown = currentY > lastScrollY.current;

      setIsScrolled(currentY > 50);

      // Hide header when scrolling down past 100px, show when scrolling up
      if (currentY > 100) {
        setIsHidden(scrollingDown);
      } else {
        setIsHidden(false);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
      setIsHidden(false); // Always show when menu is open
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const headerBg =
    isScrolled || isMobileMenuOpen
      ? "backdrop-blur-xl border-b"
      : "bg-transparent";
  const headerSurfaceActive = isScrolled || isMobileMenuOpen;

  return (
    <>
      {/* ─── Header Bar ───────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-[100] isolate transition-all duration-500 ease-out ${headerBg}`}
        style={{
          transform: isHidden ? "translateY(-100%)" : "translateY(0)",
          transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.5s ease-out, border-color 0.5s ease-out",
          backgroundColor: isScrolled || isMobileMenuOpen ? "color-mix(in srgb, var(--wusha-bg) 95%, transparent)" : "transparent",
          borderColor: "color-mix(in srgb, var(--wusha-gold) 10%, transparent)",
        }}
      >
        <div className="container-wusha">
          <div
            className={`relative flex items-center justify-between h-16 sm:h-[72px] min-h-[64px] px-3 sm:px-4 lg:px-6 ${headerSurfaceActive ? "theme-surface-panel rounded-[1.75rem]" : ""}`}
            style={
              headerSurfaceActive
                ? {
                    background:
                      "linear-gradient(180deg, color-mix(in srgb, var(--wusha-surface) 92%, transparent), color-mix(in srgb, var(--wusha-surface-2) 72%, transparent))",
                    borderColor: "color-mix(in srgb, var(--wusha-text) 10%, transparent)",
                    boxShadow:
                      "0 24px 64px color-mix(in srgb, var(--wusha-bg) 18%, transparent), 0 0 0 1px color-mix(in srgb, var(--wusha-gold) 4%, transparent) inset",
                  }
                : undefined
            }
          >
            {!headerSurfaceActive && (
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, color-mix(in srgb, var(--wusha-gold) 25%, transparent), transparent)",
                }}
              />
            )}
            {/* Logo — دائماً ظاهر وواضح */}
            <div className="relative z-[110] flex-shrink-0">
              <Logo size="sm" className="block" />
            </div>

            {/* Desktop Navigation */}
            <nav
              className="hidden md:flex items-center justify-center gap-5 lg:gap-7 flex-1 max-w-2xl mx-6 rounded-full border px-5 py-2.5"
              style={{
                backgroundColor: "color-mix(in srgb, var(--wusha-text) 4%, transparent)",
                borderColor: "color-mix(in srgb, var(--wusha-text) 8%, transparent)",
              }}
            >
              {filteredNavItems.map((item, index) => (
                <Link key={item.href} href={item.href} className="group">
                  <motion.span
                    className={`relative inline-block rounded-full px-3 py-2 text-sm font-medium transition-colors duration-300 ${
                      isNavItemActive(item.href)
                        ? "text-[var(--wusha-gold)]"
                        : "group-hover:text-[var(--wusha-gold)]"
                    }`}
                    style={{
                      color: isNavItemActive(item.href)
                        ? "var(--wusha-gold)"
                        : "color-mix(in srgb, var(--wusha-text) 70%, transparent)",
                      backgroundColor: isNavItemActive(item.href)
                        ? "color-mix(in srgb, var(--wusha-gold) 12%, transparent)"
                        : "transparent",
                    }}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 + 0.2 }}
                    whileHover={{ y: -1 }}
                  >
                    {item.label}
                    <span className="absolute bottom-0 right-0 left-0 h-px scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" style={{ backgroundColor: "var(--wusha-gold)" }} />
                  </motion.span>
                </Link>
              ))}
            </nav>

            {/* Desktop: Search + Auth */}
            <div
              className="hidden md:flex items-center gap-2 flex-shrink-0 rounded-full border px-2 py-2"
              style={{
                backgroundColor: "color-mix(in srgb, var(--wusha-text) 4%, transparent)",
                borderColor: "color-mix(in srgb, var(--wusha-text) 8%, transparent)",
              }}
            >
              <ThemeToggle />
              <Link href="/search" aria-label="البحث">
                <motion.div
                  className="theme-icon-button"
                  whileTap={{ scale: 0.95 }}
                >
                  <Search className="w-5 h-5" />
                </motion.div>
              </Link>

              <SignedIn>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <NotificationBell />
                    
                    {/* Cart Icon Desktop */}
                    <button
                      onClick={() => toggleCart()}
                      className="theme-icon-button relative"
                      aria-label="سلة المشتريات"
                    >
                      <ShoppingBag className="w-5 h-5" />
                      {hasMounted && getCartCount() > 0 && (
                        <div className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-gold rounded-full border-2 border-[var(--wusha-surface)]">
                          <span className="text-[10px] font-bold text-white leading-none">
                            {getCartCount() > 99 ? "99+" : getCartCount()}
                          </span>
                        </div>
                      )}
                    </button>
                  </div>
                  
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link href="/account" className="btn-gold text-sm py-2.5 px-5 flex items-center gap-2 cursor-pointer">
                      <User className="w-4 h-4" />
                      حسابي
                    </Link>
                  </motion.div>
                  <div className="[&_.cl-userButtonBox]:flex [&_.cl-userButtonTrigger]:rounded-xl">
                    <UserButton
                      afterSignOutUrl="/"
                      appearance={{
                        elements: {
                          avatarBox: "w-10 h-10 border-2 border-gold/30 hover:border-gold transition-colors duration-300",
                          userButtonPopoverCard: "rounded-2xl !bg-[var(--wusha-surface)] !text-[var(--wusha-text)] !border-[var(--wusha-border)]",
                          userButtonPopoverActions: "[&>button]:hover:bg-gold/10",
                          userButtonPopoverActionButton: "!text-[var(--wusha-text)] hover:!text-[var(--wusha-gold)] hover:bg-gold/10",
                          userButtonPopoverActionButtonText: "!text-[var(--wusha-text)]",
                          userButtonPopoverActionButtonIconBox: "text-gold/60",
                          userButtonPopoverFooter: "hidden",
                          userPreviewMainIdentifier: "!text-[var(--wusha-text)]",
                          userPreviewSecondaryIdentifier: "!text-[color-mix(in_srgb,var(--wusha-text)_60%,transparent)]",
                        },
                        variables: {
                          colorBackground: "var(--wusha-surface)",
                          colorText: "var(--wusha-text)",
                          colorTextSecondary: "color-mix(in srgb, var(--wusha-text) 60%, transparent)",
                          colorPrimary: "var(--wusha-gold)",
                          colorDanger: "var(--wusha-text)",
                          borderRadius: "1rem",
                        },
                      }}
                    />
                  </div>
                </div>
              </SignedIn>
              <SignedOut>
                {visibility?.hero_auth_buttons !== false && (
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Link href="/sign-in" className="btn-gold text-sm py-2.5 px-5 flex items-center gap-2 cursor-pointer">
                      <User className="w-4 h-4" />
                      تسجيل الدخول
                    </Link>
                  </motion.div>
                )}
              </SignedOut>
            </div>

            {/* Mobile: Search + Bell + Menu Toggle */}
            <div className="flex md:hidden items-center gap-1.5">
              <ThemeToggle />
              <Link href="/search" aria-label="البحث">
                <span className="theme-icon-button inline-flex">
                  <Search className="w-5 h-5" />
                </span>
              </Link>
              <SignedIn>
                <div className="flex items-center gap-2 [&>div]:flex [&>div]:items-center">
                  <NotificationBell />
                  
                  {/* Cart Icon Mobile */}
                  <button
                    onClick={() => toggleCart()}
                    className="theme-icon-button relative"
                    aria-label="سلة المشتريات"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    {hasMounted && getCartCount() > 0 && (
                      <div className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-gold rounded-full border-2 border-[var(--wusha-surface)]">
                        <span className="text-[10px] font-bold text-white leading-none">
                          {getCartCount() > 99 ? "99+" : getCartCount()}
                        </span>
                      </div>
                    )}
                  </button>
                </div>
              </SignedIn>
              <button
                className="theme-icon-button relative z-[110] -mr-1"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? "إغلاق القائمة" : "فتح القائمة"}
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Mobile Menu Overlay ───────────────────────────────── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            className="fixed inset-0 z-[90] md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 backdrop-blur-xl"
              style={{ backgroundColor: "color-mix(in srgb, var(--wusha-bg) 90%, transparent)" }}
              onClick={() => setIsMobileMenuOpen(false)}
              aria-hidden="true"
            />

            {/* Menu Content — تحت الهيدر */}
            <motion.div
              className="relative flex min-h-full items-start justify-center overflow-y-auto px-4 pt-20 pb-10 sm:px-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className="w-full max-w-sm rounded-[2rem] border px-5 py-6 shadow-2xl sm:px-6 sm:py-7"
                style={{
                  background:
                    "linear-gradient(180deg, color-mix(in srgb, var(--wusha-surface) 96%, transparent), color-mix(in srgb, var(--wusha-surface-2) 82%, transparent))",
                  borderColor: "color-mix(in srgb, var(--wusha-text) 10%, transparent)",
                  boxShadow:
                    "0 30px 80px color-mix(in srgb, var(--wusha-bg) 35%, transparent), inset 0 1px 0 color-mix(in srgb, var(--wusha-text) 4%, transparent)",
                }}
              >
                <div className="mb-5 space-y-2">
                  <p className="text-xs font-bold tracking-[0.24em] text-theme-faint">
                    WASHA
                  </p>
                  <h2 className="text-2xl font-black text-theme-strong">
                    تنقّل سريع داخل المنصة
                  </h2>
                  <p className="text-sm text-theme-subtle">
                    تحرّك بين المعرض والمتجر والتصميم من مكان واحد بتجربة متناسقة في الفاتح والداكن.
                  </p>
                </div>

                <div className="mb-5 grid grid-cols-2 gap-2.5">
                  <Link
                    href="/"
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold transition-all duration-300 ${
                      pathname === "/" ? "text-[var(--wusha-gold)]" : "text-theme"
                    }`}
                    style={{
                      backgroundColor: pathname === "/"
                        ? "color-mix(in srgb, var(--wusha-gold) 12%, transparent)"
                        : "color-mix(in srgb, var(--wusha-text) 4%, transparent)",
                      borderColor: pathname === "/"
                        ? "color-mix(in srgb, var(--wusha-gold) 18%, transparent)"
                        : "color-mix(in srgb, var(--wusha-text) 8%, transparent)",
                    }}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>الرئيسية</span>
                    <Home className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/search"
                    className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold transition-all duration-300 ${
                      pathname === "/search" ? "text-[var(--wusha-gold)]" : "text-theme"
                    }`}
                    style={{
                      backgroundColor: pathname === "/search"
                        ? "color-mix(in srgb, var(--wusha-gold) 12%, transparent)"
                        : "color-mix(in srgb, var(--wusha-text) 4%, transparent)",
                      borderColor: pathname === "/search"
                        ? "color-mix(in srgb, var(--wusha-gold) 18%, transparent)"
                        : "color-mix(in srgb, var(--wusha-text) 8%, transparent)",
                    }}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <span>البحث</span>
                    <Search className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => {
                      toggleCart(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold text-theme transition-all duration-300"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--wusha-text) 4%, transparent)",
                      borderColor: "color-mix(in srgb, var(--wusha-text) 8%, transparent)",
                    }}
                  >
                    <span>السلة</span>
                    <div className="flex items-center gap-2">
                      {hasMounted && getCartCount() > 0 && (
                        <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-bold text-[var(--wusha-bg)]">
                          {getCartCount() > 99 ? "99+" : getCartCount()}
                        </span>
                      )}
                      <ShoppingBag className="h-4 w-4" />
                    </div>
                  </button>
                  <SignedIn>
                    <Link
                      href="/account"
                      className="flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold text-theme transition-all duration-300"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--wusha-text) 4%, transparent)",
                        borderColor: "color-mix(in srgb, var(--wusha-text) 8%, transparent)",
                      }}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span>حسابي</span>
                      <User className="h-4 w-4" />
                    </Link>
                  </SignedIn>
                  <SignedOut>
                    {visibility?.hero_auth_buttons !== false && (
                      <Link
                        href="/sign-in"
                        className="flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold text-theme transition-all duration-300"
                        style={{
                          backgroundColor: "color-mix(in srgb, var(--wusha-text) 4%, transparent)",
                          borderColor: "color-mix(in srgb, var(--wusha-text) 8%, transparent)",
                        }}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span>الدخول</span>
                        <User className="h-4 w-4" />
                      </Link>
                    )}
                  </SignedOut>
                </div>

                <div className="space-y-2">
                  {filteredNavItems.map((item, index) => (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.06 + 0.1 }}
                    >
                      <Link
                        href={item.href}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-lg font-bold transition-all duration-300 hover:-translate-y-0.5 ${
                          isNavItemActive(item.href) ? "text-[var(--wusha-gold)]" : "hover:text-[var(--wusha-gold)]"
                        }`}
                        style={{
                          color: isNavItemActive(item.href)
                            ? "var(--wusha-gold)"
                            : "color-mix(in srgb, var(--wusha-text) 88%, transparent)",
                          backgroundColor: isNavItemActive(item.href)
                            ? "color-mix(in srgb, var(--wusha-gold) 12%, transparent)"
                            : "color-mix(in srgb, var(--wusha-text) 4%, transparent)",
                          borderColor: isNavItemActive(item.href)
                            ? "color-mix(in srgb, var(--wusha-gold) 18%, transparent)"
                            : "color-mix(in srgb, var(--wusha-text) 8%, transparent)",
                        }}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span>{item.label}</span>
                        <ArrowUpLeft className="h-4 w-4 text-theme-faint" />
                      </Link>
                    </motion.div>
                  ))}
                </div>

                <SignedIn>
                  <motion.div
                    className="mt-6 flex flex-col gap-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25 }}
                  >
                    <Link
                      href="/account"
                      className="flex items-center justify-center gap-3 rounded-2xl border px-4 py-4 text-lg font-bold transition-colors hover:text-[var(--wusha-gold)]"
                      style={{
                        color: "color-mix(in srgb, var(--wusha-text) 88%, transparent)",
                        backgroundColor: "color-mix(in srgb, var(--wusha-text) 4%, transparent)",
                        borderColor: "color-mix(in srgb, var(--wusha-text) 8%, transparent)",
                      }}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <User className="h-5 w-5" />
                      حسابي
                    </Link>

                    <div className="flex justify-center">
                      <UserButton
                        afterSignOutUrl="/"
                        appearance={{
                          baseTheme: undefined,
                          elements: {
                            avatarBox: "w-12 h-12 border-2 border-gold/30",
                            userButtonPopoverCard: "rounded-2xl !bg-[var(--wusha-surface)] !text-[var(--wusha-text)] !border-[var(--wusha-border)]",
                            userButtonPopoverActions: "[&>button]:hover:bg-gold/10",
                            userButtonPopoverActionButton: "!text-[var(--wusha-text)] hover:!text-[var(--wusha-gold)] hover:bg-gold/10",
                            userButtonPopoverActionButtonText: "!text-[var(--wusha-text)]",
                            userButtonPopoverActionButtonIconBox: "text-gold/60",
                            userButtonPopoverFooter: "hidden",
                            userPreviewMainIdentifier: "!text-[var(--wusha-text)]",
                            userPreviewSecondaryIdentifier: "!text-[color-mix(in_srgb,var(--wusha-text)_60%,transparent)]",
                          },
                          variables: {
                            colorBackground: "var(--wusha-surface)",
                            colorText: "var(--wusha-text)",
                            colorTextSecondary: "color-mix(in srgb, var(--wusha-text) 60%, transparent)",
                            colorPrimary: "var(--wusha-gold)",
                            colorDanger: "var(--wusha-text)",
                            borderRadius: "1rem",
                          },
                        }}
                      />
                    </div>
                  </motion.div>
                </SignedIn>
                <SignedOut>
                  {visibility?.hero_auth_buttons !== false && (
                    <motion.div
                      className="mt-6"
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 }}
                    >
                      <Link href="/sign-in" onClick={() => setIsMobileMenuOpen(false)} className="btn-gold flex items-center gap-2 cursor-pointer py-3 px-6">
                          <User className="w-5 h-5" />
                          تسجيل الدخول
                      </Link>
                    </motion.div>
                  )}
                </SignedOut>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Global Cart Drawer */}
      <CartDrawer />
    </>
  );
}
