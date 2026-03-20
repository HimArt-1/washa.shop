"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Search, User } from "lucide-react";
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
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { toggleCart, getCartCount } = useCartStore();
  const lastScrollY = useRef(0);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => { setHasMounted(true); }, []);

  // Filter Nav Items according to visibility settings
  const filteredNavItems = navItems.filter((item) => {
    if (visibility === undefined) return true; // Show all by default if not passed
    
    if (item.href === "/gallery" && visibility.gallery === false) return false;
    if (item.href === "/store" && visibility.store === false) return false;
    if (item.href === "/design" && visibility.design_piece === false) return false;
    
    return true;
  });

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
                    className="relative inline-block transition-colors duration-300 text-sm font-medium py-2 group-hover:text-[var(--wusha-gold)]"
                    style={{ color: "color-mix(in srgb, var(--wusha-text) 70%, transparent)" }}
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
                  
                  <Link href="/account">
                    <motion.button
                      className="btn-gold text-sm py-2.5 px-5 flex items-center gap-2 cursor-pointer"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <User className="w-4 h-4" />
                      حسابي
                    </motion.button>
                  </Link>
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
                  <Link href="/sign-in">
                    <motion.button
                      className="btn-gold text-sm py-2.5 px-5 flex items-center gap-2 cursor-pointer"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <User className="w-4 h-4" />
                      تسجيل الدخول
                    </motion.button>
                  </Link>
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
              className="relative flex min-h-full items-center justify-center px-6 pt-20 pb-12"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div
                className="w-full max-w-sm rounded-[2rem] border px-6 py-7 shadow-2xl"
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
                        className="flex items-center justify-between rounded-2xl border px-4 py-4 text-lg font-bold transition-all duration-300 hover:-translate-y-0.5 hover:text-[var(--wusha-gold)]"
                        style={{
                          color: "color-mix(in srgb, var(--wusha-text) 88%, transparent)",
                          backgroundColor: "color-mix(in srgb, var(--wusha-text) 4%, transparent)",
                          borderColor: "color-mix(in srgb, var(--wusha-text) 8%, transparent)",
                        }}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span>{item.label}</span>
                        <span className="text-sm text-theme-faint">↗</span>
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
                      <Link href="/sign-in" onClick={() => setIsMobileMenuOpen(false)}>
                        <button className="btn-gold flex items-center gap-2 cursor-pointer py-3 px-6">
                          <User className="w-5 h-5" />
                          تسجيل الدخول
                        </button>
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
