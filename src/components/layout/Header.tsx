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

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { toggleCart, getCartCount } = useCartStore();
  const lastScrollY = useRef(0);

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
          <div className="flex items-center justify-between h-16 sm:h-[72px] min-h-[64px]">
            {/* Logo — دائماً ظاهر وواضح */}
            <div className="relative z-[110] flex-shrink-0">
              <Logo size="sm" className="block" />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center justify-center gap-6 lg:gap-8 flex-1">
              {navItems.map((item, index) => (
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
            <div className="hidden md:flex items-center gap-3 flex-shrink-0">
              <ThemeToggle />
              <Link href="/search" aria-label="البحث">
                <motion.div
                  className="p-2.5 rounded-xl transition-all duration-300 hover:scale-105 [color:color-mix(in_srgb,var(--wusha-text)_60%,transparent)] hover:text-[var(--wusha-gold)] hover:bg-[color:color-mix(in_srgb,var(--wusha-text)_5%,transparent)]"
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
                      className="relative p-2.5 rounded-xl text-theme-soft hover:text-gold hover:bg-theme-subtle transition-all duration-300"
                      aria-label="سلة المشتريات"
                    >
                      <ShoppingBag className="w-5 h-5" />
                      {getCartCount() > 0 && (
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
              </SignedOut>
            </div>

            {/* Mobile: Search + Bell + Menu Toggle */}
            <div className="flex md:hidden items-center gap-1">
              <ThemeToggle />
              <Link href="/search" aria-label="البحث">
                <span className="p-2.5 rounded-xl transition-colors inline-block [color:color-mix(in_srgb,var(--wusha-text)_80%,transparent)] hover:text-[var(--wusha-gold)] hover:bg-[color:color-mix(in_srgb,var(--wusha-text)_5%,transparent)]">
                  <Search className="w-5 h-5" />
                </span>
              </Link>
              <SignedIn>
                <div className="flex items-center gap-2 [&>div]:flex [&>div]:items-center">
                  <NotificationBell />
                  
                  {/* Cart Icon Mobile */}
                  <button
                    onClick={() => toggleCart()}
                    className="relative p-2.5 rounded-xl text-theme-soft hover:text-gold hover:bg-theme-subtle transition-all duration-300"
                    aria-label="سلة المشتريات"
                  >
                    <ShoppingBag className="w-5 h-5" />
                    {getCartCount() > 0 && (
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
                className="relative z-[110] p-3 -mr-1 transition-colors rounded-xl [color:color-mix(in_srgb,var(--wusha-text)_90%,transparent)] hover:text-[var(--wusha-gold)] hover:bg-[color:color-mix(in_srgb,var(--wusha-text)_5%,transparent)]"
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
              className="relative flex flex-col items-center justify-center min-h-full pt-20 pb-12 px-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              {navItems.map((item, index) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06 + 0.1 }}
                >
                  <Link
                    href={item.href}
                    className="block text-2xl sm:text-3xl font-bold transition-colors py-4 [color:color-mix(in_srgb,var(--wusha-text)_85%,transparent)] hover:text-[var(--wusha-gold)]"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </motion.div>
              ))}

              <SignedIn>
                <motion.div
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <Link
                    href="/account"
                    className="flex items-center gap-3 text-2xl sm:text-3xl font-bold transition-colors py-4 [color:color-mix(in_srgb,var(--wusha-text)_85%,transparent)] hover:text-[var(--wusha-gold)]"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User className="w-6 h-6" />
                    حسابي
                  </Link>
                </motion.div>

                <motion.div
                  className="flex flex-col items-center gap-4 mt-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
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
                </motion.div>
              </SignedIn>
              <SignedOut>
                <motion.div
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
              </SignedOut>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Global Cart Drawer */}
      <CartDrawer />
    </>
  );
}
