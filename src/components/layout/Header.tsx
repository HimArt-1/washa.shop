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
  const toggleCart = useCartStore((s) => s.toggleCart);
  const items = useCartStore((s) => s.items);
  const cartCount = items.reduce((a, b) => a + b.quantity, 0);
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
  const headerTokens = {
    overlayBg: "var(--header-overlay-bg)",
    overlayBorder: "var(--header-overlay-border)",
    surfaceGradient: "var(--header-surface-gradient)",
    surfaceBorder: "var(--header-surface-panel-border)",
    surfaceShadow: "var(--header-surface-panel-shadow)",
    lineGradient: "var(--header-line-gradient)",
    chipBg: "var(--header-chip-bg)",
    chipBorder: "var(--header-chip-border)",
    chipText: "var(--header-chip-text)",
    chipTextStrong: "var(--header-chip-text-strong)",
    chipActiveBg: "var(--header-chip-active-bg)",
    chipActiveBorder: "var(--header-chip-active-border)",
    menuBackdrop: "var(--header-menu-backdrop)",
    menuCardGradient: "var(--header-menu-card-gradient)",
    menuCardShadow: "var(--header-menu-card-shadow)",
    clerkSecondary: "var(--clerk-secondary-text)",
  };

  return (
    <>
      {/* ─── Header Bar ───────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-[100] isolate transition-all duration-500 ease-out ${headerBg}`}
        style={{
          transform: isHidden ? "translateY(-100%)" : "translateY(0)",
          transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.5s ease-out, border-color 0.5s ease-out",
          backgroundColor: isScrolled || isMobileMenuOpen ? headerTokens.overlayBg : "transparent",
          borderColor: headerTokens.overlayBorder,
        }}
      >
        <div className="container-wusha">
          <div
            className={`relative flex items-center justify-between h-16 sm:h-[72px] min-h-[64px] px-3 sm:px-4 lg:px-6 ${headerSurfaceActive ? "theme-surface-panel rounded-[1.75rem]" : ""}`}
            style={
              headerSurfaceActive
                ? {
                    background: headerTokens.surfaceGradient,
                    borderColor: headerTokens.surfaceBorder,
                    boxShadow: headerTokens.surfaceShadow,
                  }
                : undefined
            }
          >
            {!headerSurfaceActive && (
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
                style={{
                  background: headerTokens.lineGradient,
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
                backgroundColor: headerTokens.chipBg,
                borderColor: headerTokens.chipBorder,
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
                        : headerTokens.chipText,
                      backgroundColor: isNavItemActive(item.href)
                        ? headerTokens.chipActiveBg
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
                backgroundColor: headerTokens.chipBg,
                borderColor: headerTokens.chipBorder,
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
                      {hasMounted && cartCount > 0 && (
                        <div className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-gold rounded-full border-2 border-[var(--wusha-surface)]">
                          <span className="text-[10px] font-bold text-white leading-none">
                            {cartCount > 99 ? "99+" : cartCount}
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
                          userPreviewSecondaryIdentifier: "!text-[var(--clerk-secondary-text)]",
                        },
                        variables: {
                          colorBackground: "var(--wusha-surface)",
                          colorText: "var(--wusha-text)",
                          colorTextSecondary: headerTokens.clerkSecondary,
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
                      {hasMounted && cartCount > 0 && (
                        <div className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-gold rounded-full border-2 border-[var(--wusha-surface)]">
                          <span className="text-[10px] font-bold text-white leading-none">
                            {cartCount > 99 ? "99+" : cartCount}
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
              style={{ backgroundColor: headerTokens.menuBackdrop }}
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
                  background: headerTokens.menuCardGradient,
                  borderColor: headerTokens.surfaceBorder,
                  boxShadow: headerTokens.menuCardShadow,
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
                        ? headerTokens.chipActiveBg
                        : headerTokens.chipBg,
                      borderColor: pathname === "/"
                        ? headerTokens.chipActiveBorder
                        : headerTokens.chipBorder,
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
                        ? headerTokens.chipActiveBg
                        : headerTokens.chipBg,
                      borderColor: pathname === "/search"
                        ? headerTokens.chipActiveBorder
                        : headerTokens.chipBorder,
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
                      backgroundColor: headerTokens.chipBg,
                      borderColor: headerTokens.chipBorder,
                    }}
                  >
                    <span>السلة</span>
                    <div className="flex items-center gap-2">
                      {hasMounted && cartCount > 0 && (
                        <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-gold px-1.5 py-0.5 text-[10px] font-bold text-[var(--wusha-bg)]">
                          {cartCount > 99 ? "99+" : cartCount}
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
                        backgroundColor: headerTokens.chipBg,
                        borderColor: headerTokens.chipBorder,
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
                          backgroundColor: headerTokens.chipBg,
                          borderColor: headerTokens.chipBorder,
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
                            : headerTokens.chipTextStrong,
                          backgroundColor: isNavItemActive(item.href)
                            ? headerTokens.chipActiveBg
                            : headerTokens.chipBg,
                          borderColor: isNavItemActive(item.href)
                            ? headerTokens.chipActiveBorder
                            : headerTokens.chipBorder,
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
                        color: headerTokens.chipTextStrong,
                        backgroundColor: headerTokens.chipBg,
                        borderColor: headerTokens.chipBorder,
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
                            userPreviewSecondaryIdentifier: "!text-[var(--clerk-secondary-text)]",
                          },
                          variables: {
                            colorBackground: "var(--wusha-surface)",
                            colorText: "var(--wusha-text)",
                            colorTextSecondary: headerTokens.clerkSecondary,
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
