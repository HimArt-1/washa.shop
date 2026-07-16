import Image from "next/image";
import Link from "next/link";

const utilityLinks = [
    { label: "الدعم", href: "/support" },
    { label: "الشحن", href: "/shipping" },
    { label: "الشروط والخصوصية", href: "/terms" },
] as const;

export function SubpageFooter() {
    return (
        <footer className="subpage-footer" aria-label="تذييل الموقع">
            <div className="container-wusha">
                <div className="subpage-footer-shell">
                    <div className="subpage-footer-brand">
                        <Link href="/" className="subpage-footer-mark" aria-label="وشّى — الصفحة الرئيسية">
                            <Image
                                src="/header-logo-identity.png"
                                alt=""
                                width={38}
                                height={34}
                                className="subpage-footer-logo"
                            />
                        </Link>
                        <span className="subpage-footer-rule" aria-hidden="true" />
                        <div>
                            <p className="subpage-footer-name">وشّى</p>
                            <p className="subpage-footer-note">تجربة محلية للفن والأزياء</p>
                        </div>
                    </div>

                    <nav className="subpage-footer-links" aria-label="روابط مساندة">
                        {utilityLinks.map((link) => (
                            <Link key={link.href} href={link.href}>
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    <div className="subpage-footer-meta">
                        <span className="subpage-footer-location">
                            <span aria-hidden="true" />
                            المملكة العربية السعودية
                        </span>
                        <span dir="ltr">© {new Date().getFullYear()} WASHA</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
