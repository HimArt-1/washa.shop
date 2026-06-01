import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "washa-brand-identity.html");
const pdfPath = path.join(root, "WASHA_Brand_Identity_2026.pdf");

const colors = [
  ["حبر الهوية", "Identity Ink", "#4B3434", "الشعار، العناوين، بطاقات الطباعة"],
  ["ذهب هادئ", "Muted Gold", "#CEAE7F", "النمط الداكن، اللمعات، الحالات المميزة"],
  ["ذهب فاتح", "Pale Gold", "#E0C99A", "الهالات الخفيفة والتفاصيل الدقيقة"],
  ["عاج", "Ivory", "#FFF8ED", "الأسطح المطبوعة والخلفيات البيضاء الدافئة"],
  ["قطن", "Cotton", "#F5ECDD", "الخلفيات الثانوية ومساحات التنفس"],
  ["كاكاو", "Cacao", "#2A1A19", "الأسطح الداكنة والمواد الفاخرة"],
  ["حجر", "Stone", "#817E86", "النصوص الثانوية والتوازن المحايد"],
  ["غابة", "Forest", "#1E5C42", "إشارات النمو والثقة عند الحاجة"],
];

const sections = [
  ["01", "الجوهر", "Essence"],
  ["02", "الشعار", "Logo"],
  ["03", "الألوان", "Color"],
  ["04", "الخطوط", "Type"],
  ["05", "النظام الرقمي", "Digital"],
  ["06", "الهوية المطبوعة", "Print"],
  ["07", "الصوت", "Voice"],
  ["08", "التصوير", "Art Direction"],
  ["09", "الحوكمة", "Governance"],
  ["10", "التطبيق", "Implementation"],
];

const TOTAL_PAGES = 17;
page.counter = 1;
const pages = [
  coverPage(),
  contentsPage(),
  essencePage(),
  logoSystemPage(),
  logoUsagePage(),
  colorSystemPage(),
  colorModesPage(),
  typographyPage(),
  layoutSystemPage(),
  digitalSystemPage(),
  printIdentityPage(),
  socialAndMotionPage(),
  voicePage(),
  artDirectionPage(),
  compliancePage(),
  implementationPage(),
  closingPage(),
];

await fs.writeFile(htmlPath, renderHtml(pages), "utf8");

const browser = await chromium.launch({ headless: true });
const browserPage = await browser.newPage({ viewport: { width: 1240, height: 1754 }, deviceScaleFactor: 1 });
await browserPage.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
await browserPage.pdf({
  path: pdfPath,
  printBackground: true,
  displayHeaderFooter: false,
  preferCSSPageSize: true,
});
await browser.close();

function renderHtml(contentPages) {
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>وشّى — دليل الهوية البصرية 2026</title>
<style>
@font-face {
  font-family: "TheYearOfTheCamel";
  src: url("./public/fonts/TheYearofTheCamel-Thin.otf") format("opentype");
  font-weight: 100;
}
@font-face {
  font-family: "TheYearOfTheCamel";
  src: url("./public/fonts/TheYearofTheCamel-ExtraLight.otf") format("opentype");
  font-weight: 200;
}
@font-face {
  font-family: "TheYearOfTheCamel";
  src: url("./public/fonts/TheYearofTheCamel-Light.otf") format("opentype");
  font-weight: 300;
}
@font-face {
  font-family: "TheYearOfTheCamel";
  src: url("./public/fonts/TheYearofTheCamel-Regular.otf") format("opentype");
  font-weight: 400;
}
@font-face {
  font-family: "TheYearOfTheCamel";
  src: url("./public/fonts/TheYearofTheCamel-Medium.otf") format("opentype");
  font-weight: 500 600;
}
@font-face {
  font-family: "TheYearOfTheCamel";
  src: url("./public/fonts/TheYearofTheCamel-Bold.otf") format("opentype");
  font-weight: 700;
}
@font-face {
  font-family: "TheYearOfTheCamel";
  src: url("./public/fonts/TheYearofTheCamel-ExtraBold.otf") format("opentype");
  font-weight: 800 900;
}
@font-face {
  font-family: "ArabicPoetry";
  src: url("./public/fonts/ArabicPoetry-Medium.otf") format("opentype");
  font-weight: 400 700;
}

@page { size: A4; margin: 0; }

:root {
  --ink: #2A1A19;
  --identity: #4B3434;
  --identity-2: #5A3E2B;
  --gold: #CEAE7F;
  --gold-soft: #E0C99A;
  --paper: #F4EDE3;
  --paper-2: #FFF8ED;
  --paper-3: #EAD8C8;
  --muted: #817E86;
  --stone: #6E625F;
  --forest: #1E5C42;
  --dark: #080504;
  --dark-2: #130B0C;
  --dark-3: #1F1413;
  --line: rgba(75, 52, 52, .16);
  --line-dark: rgba(224, 201, 154, .16);
  --radius: 24px;
  --font: "TheYearOfTheCamel", "ArabicPoetry", system-ui, sans-serif;
  --poetry: "ArabicPoetry", "TheYearOfTheCamel", serif;
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  width: 210mm;
  background: #d9cec0;
  color: var(--ink);
  font-family: var(--font);
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.page {
  position: relative;
  width: 210mm;
  height: 297mm;
  overflow: hidden;
  break-after: page;
  page-break-after: always;
  padding: 18mm;
  background:
    radial-gradient(circle at 12% 10%, rgba(255, 255, 255, .75), transparent 26%),
    radial-gradient(circle at 92% 88%, rgba(206, 174, 127, .20), transparent 28%),
    linear-gradient(145deg, #fffaf4 0%, var(--paper) 52%, #ead8c8 100%);
}

.page.dark {
  color: var(--paper-2);
  background:
    radial-gradient(circle at 18% 12%, rgba(206, 174, 127, .18), transparent 28%),
    radial-gradient(circle at 86% 78%, rgba(75, 52, 52, .34), transparent 34%),
    linear-gradient(145deg, #080504 0%, #130b0c 58%, #241514 100%);
}

.page.split {
  background:
    radial-gradient(circle at 14% 12%, rgba(255, 255, 255, .82), transparent 25%),
    linear-gradient(90deg, #fff8ed 0%, #fff8ed 50%, #2a1a19 50%, #130b0c 100%);
}

.watermark {
  position: absolute;
  width: 86mm;
  height: 74mm;
  opacity: .055;
  left: -18mm;
  bottom: -12mm;
  background: url("./public/header-logo-identity.png") center / contain no-repeat;
}

.page.dark .watermark {
  opacity: .09;
  filter: brightness(0) saturate(100%) invert(83%) sepia(22%) saturate(489%) hue-rotate(357deg) brightness(93%) contrast(88%);
}

.page-header,
.page-footer {
  position: absolute;
  left: 18mm;
  right: 18mm;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  z-index: 5;
}
.page-header { top: 12mm; }
.page-footer { bottom: 10mm; color: rgba(42, 26, 25, .44); }
.dark .page-footer { color: rgba(245, 236, 221, .44); }
.mini-mark {
  width: 18px;
  height: 16px;
  background: url("./public/header-logo-identity.png") center / contain no-repeat;
}
.dark .mini-mark {
  filter: brightness(0) saturate(100%) invert(83%) sepia(22%) saturate(489%) hue-rotate(357deg) brightness(93%) contrast(88%);
}
.kicker {
  color: var(--identity);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .18em;
  text-transform: uppercase;
}
.dark .kicker { color: var(--gold-soft); }
.page-no {
  direction: ltr;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .16em;
}

h1, h2, h3, h4, p { margin: 0; }
h1 {
  font-size: 58px;
  line-height: .98;
  letter-spacing: 0;
  font-weight: 900;
}
h2 {
  font-size: 42px;
  line-height: 1.04;
  font-weight: 900;
  letter-spacing: 0;
}
h3 {
  font-size: 24px;
  line-height: 1.18;
  font-weight: 800;
}
h4 {
  font-size: 16px;
  line-height: 1.3;
  font-weight: 800;
}
p, li, td {
  font-size: 13px;
  line-height: 1.78;
  font-weight: 400;
}
.latin {
  direction: ltr;
  font-family: var(--font);
  letter-spacing: .08em;
}
.muted { color: rgba(42, 26, 25, .62); }
.dark .muted { color: rgba(245, 236, 221, .62); }
.gold { color: var(--gold); }
.earth { color: var(--identity); }
.display {
  font-size: 78px;
  line-height: .92;
  font-weight: 900;
}
.poetry { font-family: var(--poetry); }

.logo-mask {
  display: block;
  background-color: transparent;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
}
.logo-mark {
  background-image: url("./public/header-logo-identity.png");
}
.logo-wordmark {
  background-image: url("./public/hero-logo-wordmark.png");
}
.dark .logo-mask,
.dark-card .logo-mask,
.social-card .logo-mask {
  filter: brightness(0) saturate(100%) invert(83%) sepia(22%) saturate(489%) hue-rotate(357deg) brightness(93%) contrast(88%);
}

.hero-logo {
  width: 72mm;
  height: 50mm;
  color: var(--gold-soft);
  filter: drop-shadow(0 24px 70px rgba(0,0,0,.34));
}
.wordmark-big {
  width: 96mm;
  height: 42mm;
  color: var(--identity);
}
.dark .wordmark-big { color: var(--gold-soft); }

.pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid rgba(75, 52, 52, .16);
  background: rgba(255, 248, 237, .60);
  color: var(--identity);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .12em;
}
.dark .pill {
  border-color: rgba(224, 201, 154, .20);
  background: rgba(255, 248, 237, .06);
  color: var(--gold-soft);
}

.content {
  position: relative;
  z-index: 2;
  height: 100%;
  padding-top: 18mm;
  padding-bottom: 14mm;
}
.center { display: grid; place-items: center; text-align: center; }
.stack { display: grid; gap: 16px; }
.stack-lg { display: grid; gap: 24px; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.three { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.four { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.wide-grid { display: grid; grid-template-columns: 1.15fr .85fr; gap: 18px; align-items: stretch; }
.asym { display: grid; grid-template-columns: 1.35fr .65fr; gap: 16px; }
.two,
.three,
.four,
.wide-grid,
.asym,
.principles,
.section-index,
.swatches,
.weights,
.token-grid,
.print-mockups,
.do-dont,
.meta-row {
  direction: ltr;
}
.two > *,
.three > *,
.four > *,
.wide-grid > *,
.asym > *,
.principles > *,
.section-index > *,
.swatches > *,
.weights > *,
.token-grid > *,
.print-mockups > *,
.do-dont > *,
.meta-row > * {
  direction: rtl;
}

.card {
  border: 1px solid var(--line);
  background:
    radial-gradient(circle at 18% 12%, rgba(255,255,255,.74), transparent 30%),
    linear-gradient(145deg, rgba(255, 253, 250, .78), rgba(245, 236, 221, .72));
  border-radius: var(--radius);
  padding: 18px;
  box-shadow: 0 22px 70px rgba(75, 52, 52, .10), inset 0 1px 0 rgba(255,255,255,.62);
}
.dark .card {
  border-color: rgba(224, 201, 154, .16);
  background:
    radial-gradient(circle at 22% 12%, rgba(224,201,154,.10), transparent 32%),
    linear-gradient(145deg, rgba(255,248,237,.055), rgba(255,248,237,.025));
  box-shadow: 0 24px 80px rgba(0,0,0,.22), inset 0 1px 0 rgba(255,255,255,.08);
}
.card.tight { padding: 14px; border-radius: 18px; }
.card.large { padding: 24px; }

.bezel {
  padding: 8px;
  border-radius: calc(var(--radius) + 8px);
  border: 1px solid rgba(75, 52, 52, .12);
  background: rgba(255,248,237,.32);
}
.dark .bezel {
  border-color: rgba(224,201,154,.14);
  background: rgba(255,248,237,.045);
}
.core {
  border-radius: var(--radius);
  border: 1px solid rgba(75, 52, 52, .10);
  background: rgba(255, 253, 250, .72);
  padding: 18px;
}
.dark .core {
  border-color: rgba(224,201,154,.12);
  background: rgba(8,5,4,.36);
}

.cover-gridless {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 24px;
}
.cover-stage {
  height: 162mm;
  display: grid;
  place-items: center;
  text-align: center;
}
.cover-title {
  max-width: 145mm;
  display: grid;
  gap: 18px;
  justify-items: center;
}
.cover-title h1 { color: var(--paper-2); }
.cover-title .tagline {
  color: var(--gold-soft);
  font-size: 21px;
  font-weight: 700;
  letter-spacing: .02em;
}
.meta-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.meta {
  text-align: center;
  padding: 12px;
  border-radius: 16px;
  border: 1px solid rgba(224,201,154,.14);
  background: rgba(255,248,237,.045);
}
.meta b { display: block; font-size: 12px; color: var(--paper-2); margin-top: 4px; }
.meta span { font-size: 9px; color: rgba(224,201,154,.64); letter-spacing: .14em; }

.section-index {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.index-row {
  display: grid;
  grid-template-columns: 34px 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-radius: 18px;
  border: 1px solid var(--line);
  background: rgba(255,248,237,.50);
}
.index-row .num {
  direction: ltr;
  font-weight: 900;
  color: var(--identity);
}
.index-row strong { display: block; font-size: 14px; }
.index-row small { display: block; direction: ltr; color: var(--muted); letter-spacing: .10em; margin-top: 3px; }

.quote {
  padding: 26px;
  border-radius: 30px;
  background: linear-gradient(145deg, rgba(75,52,52,.98), rgba(42,26,25,.96));
  color: var(--paper-2);
}
.quote h2 { color: var(--gold-soft); }

.principles {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.principle {
  min-height: 118px;
  display: grid;
  align-content: end;
  gap: 8px;
}
.principle .mark {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--identity);
}
.dark .principle .mark { background: var(--gold); }

.logo-spec {
  height: 86mm;
  display: grid;
  place-items: center;
}
.logo-spec .logo-mask { color: var(--identity); }
.dark .logo-spec .logo-mask { color: var(--gold-soft); }
.clearspace {
  border: 1px dashed rgba(75,52,52,.28);
  border-radius: 26px;
  padding: 18mm;
  width: 128mm;
  height: 76mm;
  display: grid;
  place-items: center;
}
.dark .clearspace { border-color: rgba(224,201,154,.30); }

.swatches {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 11px;
}
.swatch {
  min-height: 112px;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(75,52,52,.13);
  background: rgba(255,248,237,.52);
}
.swatch-color { height: 54px; }
.swatch-body { padding: 9px 10px 11px; }
.swatch strong { display: block; font-size: 12px; }
.swatch small { display: block; direction: ltr; color: var(--muted); margin-top: 3px; letter-spacing: .05em; }
.swatch p { margin-top: 5px; font-size: 9.5px; line-height: 1.45; color: var(--stone); }

.mode-panel {
  min-height: 118mm;
  padding: 20px;
  border-radius: 30px;
  display: grid;
  align-content: space-between;
}
.mode-light {
  background: linear-gradient(145deg, #fffaf6, #f2dfd5);
  color: #28191a;
  border: 1px solid rgba(75,52,52,.16);
}
.mode-dark {
  background: linear-gradient(145deg, #2a1a19, #100909);
  color: #fff8ed;
  border: 1px solid rgba(224,201,154,.20);
}
.mode-dark .muted {
  color: rgba(255, 248, 237, .76);
}
.mode-dark .button-sample {
  background: var(--gold-soft);
  color: var(--ink);
}
.mode-card {
  border-radius: 22px;
  padding: 16px;
  background: rgba(255,255,255,.52);
  border: 1px solid rgba(75,52,52,.10);
}
.mode-dark .mode-card {
  background: rgba(255,248,237,.07);
  border-color: rgba(224,201,154,.16);
}

.type-sample {
  display: grid;
  gap: 8px;
  padding: 18px;
  border-radius: 22px;
  border: 1px solid var(--line);
  background: rgba(255,248,237,.55);
}
.type-sample .label { direction: ltr; color: var(--muted); font-size: 10px; letter-spacing: .18em; }
.type-sample .sample-xl { font-size: 46px; line-height: 1; font-weight: 900; }
.type-sample .sample-poetry { font-family: var(--poetry); font-size: 34px; line-height: 1.15; }
.weights {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.weight {
  border-radius: 18px;
  border: 1px solid var(--line);
  background: rgba(255,248,237,.46);
  padding: 14px 12px;
}
.weight b { display: block; font-size: 30px; line-height: 1; margin-bottom: 8px; }
.weight span { display: block; direction: ltr; color: var(--muted); font-size: 10px; letter-spacing: .08em; }

.token-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.token {
  min-height: 98px;
  border-radius: 18px;
  border: 1px solid var(--line);
  padding: 14px;
  background: rgba(255,248,237,.50);
}
.token code {
  direction: ltr;
  display: block;
  color: var(--identity);
  font-size: 11px;
  font-family: var(--font);
  letter-spacing: .05em;
  margin-bottom: 8px;
}

.ui-preview {
  height: 118mm;
  border-radius: 34px;
  padding: 18px;
  color: #28191a;
  background:
    radial-gradient(circle at 20% 12%, rgba(255,255,255,.85), transparent 32%),
    linear-gradient(145deg, #fff8ed, #ead8c8);
  border: 1px solid rgba(75,52,52,.14);
}
.ui-preview .muted {
  color: rgba(42, 26, 25, .62);
}
.ui-preview.dark-ui {
  background:
    radial-gradient(circle at 72% 18%, rgba(224,201,154,.16), transparent 30%),
    linear-gradient(145deg, #130b0c, #080504);
  color: var(--paper-2);
  border-color: rgba(224,201,154,.16);
}
.ui-preview.dark-ui .muted {
  color: rgba(245, 236, 221, .62);
}
.ui-window {
  border-radius: 24px;
  padding: 16px;
  min-height: 92mm;
  background: rgba(255,253,250,.64);
  border: 1px solid rgba(75,52,52,.12);
}
.dark-ui .ui-window {
  background: rgba(255,248,237,.06);
  border-color: rgba(224,201,154,.14);
}
.button-sample {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border-radius: 999px;
  background: var(--identity);
  color: var(--paper-2);
  font-size: 11px;
  font-weight: 800;
}
.dark-ui .button-sample {
  background: var(--gold-soft);
  color: var(--ink);
}

.print-mockups {
  display: grid;
  grid-template-columns: 1.1fr .9fr;
  gap: 14px;
}
.business-card {
  aspect-ratio: 1.65/1;
  border-radius: 22px;
  padding: 18px;
  background: linear-gradient(145deg, #fff8ed, #ead8c8);
  border: 1px solid rgba(75,52,52,.16);
  display: grid;
  align-content: space-between;
}
.business-card.dark-card {
  background: linear-gradient(145deg, #432b2b, #130b0c);
  color: var(--paper-2);
  border-color: rgba(224,201,154,.18);
}
.vertical-card {
  aspect-ratio: 1/1.4;
  border-radius: 22px;
  padding: 18px;
  background: linear-gradient(145deg, #fff8ed, #ead8c8);
  border: 1px solid rgba(75,52,52,.16);
  text-align: center;
}
.social-card {
  aspect-ratio: 9/16;
  border-radius: 22px;
  padding: 18px;
  background: linear-gradient(145deg, #432b2b, #130b0c);
  border: 1px solid rgba(224,201,154,.18);
  color: var(--paper-2);
}
.tiny-logo {
  width: 34px;
  height: 30px;
  color: currentColor;
}
.business-card .tiny-logo,
.vertical-card .tiny-logo { color: var(--identity); }
.dark-card .tiny-logo,
.social-card .tiny-logo { color: var(--paper-2); }
.wordmark-line {
  width: 116px;
  height: 42px;
  color: currentColor;
  margin: auto;
}
.list {
  display: grid;
  gap: 9px;
  list-style: none;
  padding: 0;
  margin: 0;
}
.list li {
  display: grid;
  grid-template-columns: 18px 1fr;
  gap: 10px;
  align-items: start;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--gold);
  margin-top: 9px;
}

.do-dont {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.do, .dont {
  min-height: 118mm;
}
.do h3 { color: var(--forest); }
.dont h3 { color: #7A2E2E; }

.codebox {
  direction: ltr;
  text-align: left;
  border-radius: 20px;
  padding: 16px;
  background: #120b0b;
  color: #fff8ed;
  border: 1px solid rgba(224,201,154,.16);
  font-size: 10px;
  line-height: 1.7;
  white-space: pre-wrap;
  font-family: var(--font);
}

.art-tile {
  min-height: 42mm;
  border-radius: 22px;
  padding: 18px;
  border: 1px solid rgba(75,52,52,.14);
  display: grid;
  align-content: space-between;
  overflow: hidden;
  position: relative;
}
.art-tile::after {
  content: "";
  position: absolute;
  width: 48mm;
  height: 42mm;
  left: -12mm;
  bottom: -10mm;
  background: url("./public/header-logo-identity.png") center / contain no-repeat;
  opacity: .08;
}
.art-tile h4 {
  position: relative;
  z-index: 1;
  font-size: 18px;
}
.art-tile p {
  position: relative;
  z-index: 1;
  font-size: 11px;
  line-height: 1.55;
}
.art-paper {
  background:
    radial-gradient(circle at 78% 12%, rgba(255,255,255,.76), transparent 26%),
    linear-gradient(145deg,#fff8ed,#dcc6b4);
}
.art-cacao {
  background:
    radial-gradient(circle at 28% 18%, rgba(224,201,154,.12), transparent 28%),
    linear-gradient(145deg,#2a1a19,#4b3434);
  color: var(--paper-2);
  border-color: rgba(224,201,154,.18);
}
.art-cacao .muted {
  color: rgba(255, 248, 237, .74);
}
.art-cacao::after {
  filter: brightness(0) saturate(100%) invert(83%) sepia(22%) saturate(489%) hue-rotate(357deg) brightness(93%) contrast(88%);
  opacity: .12;
}
.art-gold {
  background:
    radial-gradient(circle at 70% 16%, rgba(255,255,255,.78), transparent 26%),
    linear-gradient(145deg,#e0c99a,#fff8ed);
}

.closing-logo {
  width: 120mm;
  height: 72mm;
  color: var(--gold-soft);
  margin: 0 auto;
}
</style>
</head>
<body>
${contentPages.join("\n")}
</body>
</html>`;
}

function page({ theme = "light", title, eyebrow, children, className = "" }) {
  const dark = theme === "dark";
  const index = page.counter++;
  return `<section class="page ${dark ? "dark" : ""} ${className}">
  <div class="watermark"></div>
  <header class="page-header">
    <div style="display:flex;align-items:center;gap:8px"><span class="mini-mark"></span><span class="kicker">${eyebrow || "WASHA IDENTITY SYSTEM"}</span></div>
    <span class="page-no">${String(index).padStart(2, "0")} / ${String(TOTAL_PAGES).padStart(2, "0")}</span>
  </header>
  <main class="content">${title ? `<div class="stack" style="margin-bottom:22px"><span class="pill">${eyebrow || "SECTION"}</span><h2>${title}</h2></div>` : ""}${children}</main>
  <footer class="page-footer"><span class="latin">washa.shop</span><span>وشّى — دليل الهوية البصرية 2026</span></footer>
</section>`;
}
function coverPage() {
  const index = page.counter++;
  return `<section class="page dark cover-gridless">
  <div class="watermark"></div>
  <header class="page-header">
    <span class="kicker">VISUAL IDENTITY SYSTEM · 2026</span>
    <span class="page-no">${String(index).padStart(2, "0")} / ${String(TOTAL_PAGES).padStart(2, "0")}</span>
  </header>
  <main class="cover-stage">
    <div class="cover-title">
      <span class="logo-mask logo-mark hero-logo"></span>
      <span class="pill">WASHA · BRAND IDENTITY GUIDELINES · V7.07</span>
      <h1><span class="gold">وشّى</span><br />دليل الهوية البصرية</h1>
      <p class="tagline">فنٌ يرتدى · Art You Wear</p>
      <p class="muted" style="max-width:96mm">نظام بصري سعودي يجمع دفء التراث، دقة الطباعة، وهدوء التجربة الرقمية في لغة واحدة قابلة للتطبيق.</p>
    </div>
  </main>
  <footer class="meta-row">
    ${meta("الموقع", "washa.shop")}
    ${meta("الإصدار", "7.07")}
    ${meta("السنة", "2026")}
    ${meta("النطاق", "Digital · Print · AI")}
  </footer>
</section>`;
}

function contentsPage() {
  return page({
    title: "خريطة الهوية",
    eyebrow: "SYSTEM MAP",
    children: `<div class="wide-grid">
      <div class="card large stack-lg">
        <h3>دليل عملي لا يستعرض الشكل فقط، بل يحدد كيف تتحرك الهوية عبر المنتج، الواجهة، الطباعة، المحتوى، وتجربة العميل.</h3>
        <p class="muted">تم استبعاد الخلفيات ذات الخطوط الطولية والعرضية بالكامل، واستبدالها بعمق ورقي ناعم وهالات ضوئية هادئة لا تتعارض مع القراءة أو الطباعة.</p>
        <div class="bezel"><div class="core two">
          ${metric("10", "محاور أساسية")}
          ${metric("17", "صفحة مصممة")}
          ${metric("2", "نمط فاتح/داكن")}
          ${metric("1", "لغة بصرية موحدة")}
        </div></div>
      </div>
      <div class="section-index">${sections.map(([n, ar, en]) => `<div class="index-row"><span class="num">${n}</span><div><strong>${ar}</strong><small>${en}</small></div><span class="mini-mark"></span></div>`).join("")}</div>
    </div>`,
  });
}

function essencePage() {
  return page({
    theme: "dark",
    title: "الروح والرسالة",
    eyebrow: "01 · ESSENCE",
    children: `<div class="stack-lg">
      <div class="quote stack">
        <span class="pill">BRAND PROMISE</span>
        <h2>فنٌ يرتدى</h2>
        <p>وشّى منصة أزياء سعودية تحوّل الفن إلى ملبس، والملبس إلى هوية شخصية. كل قطعة تحمل أثراً: من الفنان، من التقنية، ومن الذاكرة البصرية المحلية.</p>
      </div>
      <div class="principles">
        ${principle("التراث", "عمق اللون، الدفء، والإشارة العربية الأصيلة دون زخرفة زائدة.")}
        ${principle("الحداثة", "ذكاء اصطناعي، واجهات هادئة، وتجربة رقمية متقنة قابلة للتوسع.")}
        ${principle("الفن", "الفنانون المحليون، الطباعة الرقمية، وكل قطعة كلوحة قابلة للارتداء.")}
      </div>
      <div class="card large">
        <h3 style="margin-bottom:12px">سمات الهوية</h3>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${["فاخر · Premium", "تراثي · Heritage", "ذكي · Intelligent", "محلي · Local", "حي · Alive", "دافئ · Warm", "حداثي · Modern", "فني · Artistic"].map((x) => `<span class="pill">${x}</span>`).join("")}
        </div>
      </div>
    </div>`,
  });
}

function logoSystemPage() {
  return page({
    title: "نظام الشعار",
    eyebrow: "02 · LOGO SYSTEM",
    children: `<div class="stack-lg">
      <div class="bezel"><div class="core logo-spec" style="height:78mm"><span class="logo-mask logo-wordmark wordmark-big"></span></div></div>
      <div class="two">
        <div class="card stack">
          <span class="pill">PRIMARY WORDMARK</span>
          <h3>الوردمارك هو التوقيع الرئيسي في المواد التعريفية، الصفحات الكبرى، وأغلفة العروض.</h3>
          <p class="muted">يظهر بلون الحبر في النمط الفاتح وبالذهب الهادئ على الخلفيات الداكنة.</p>
        </div>
        <div class="two">
          <div class="card center" style="height:42mm"><span class="logo-mask logo-mark" style="width:42mm;height:34mm"></span></div>
          <div class="card center dark-card" style="height:42mm;background:linear-gradient(145deg,#2a1a19,#130b0c)"><span class="logo-mask logo-mark" style="width:42mm;height:34mm"></span></div>
        </div>
      </div>
      <div class="three" style="margin-top:16px">
        ${logoRule("الشعار الكامل", "للغلاف، العروض، الصفحات الرسمية، وتوقيع المواد.")}
        ${logoRule("الرمز المختصر", "للهيدر، الأيقونات، أزرار التطبيق، وبطاقات الطباعة.")}
        ${logoRule("النسخة السينمائية", "للمشاهد البصرية، مقدمات الفيديو، واللحظات عالية التأثير.")}
      </div>
    </div>`,
  });
}

function logoUsagePage() {
  return page({
    theme: "dark",
    title: "مساحة الشعار واستخدامه",
    eyebrow: "02B · LOGO USAGE",
    children: `<div class="stack-lg">
      <div class="bezel"><div class="core logo-spec"><div class="clearspace"><span class="logo-mask logo-wordmark" style="width:78mm;height:34mm;color:var(--gold-soft)"></span></div></div></div>
      <div class="three">
        ${usageCard("Clear Space", "اترك مساحة حول الشعار لا تقل عن عرض نقطة الشعار أو 24px في الواجهات.")}
        ${usageCard("Minimum Size", "لا يقل الرمز عن 28px في الواجهات، ولا يقل الوردمارك عن 34mm في الطباعة.")}
        ${usageCard("Color Control", "لا تستخدم ألواناً خارج لوحة الهوية، ولا تضف حدوداً أو ظلالاً قاسية للشعار.")}
      </div>
    </div>`,
  });
}

function colorSystemPage() {
  return page({
    title: "لوحة الألوان",
    eyebrow: "03 · COLOR",
    children: `<div class="stack-lg">
      <div class="asym">
        <div class="card large stack">
          <h3>لوحة دافئة مبنية على الحبر البني، الذهب الهادئ، والورق العاجي.</h3>
          <p class="muted">الألوان تعمل كمواد ملموسة: حبر، ورق، طين، معدن خافت. لا يوجد اعتماد على زخارف شبكية أو ضوضاء بصرية لإظهار الهوية.</p>
        </div>
        <div class="card center" style="min-height:42mm"><span class="logo-mask logo-mark" style="width:44mm;height:38mm;color:var(--identity)"></span></div>
      </div>
      <div class="swatches">${colors.map(([ar, en, hex, usage]) => swatch(ar, en, hex, usage)).join("")}</div>
    </div>`,
  });
}

function colorModesPage() {
  return page({
    title: "النمط الفاتح والداكن",
    eyebrow: "03B · MODES",
    children: `<div class="two">
      <div class="mode-panel mode-light">
        <div><span class="pill">LIGHT HERITAGE</span><h3 style="margin-top:14px">ورق عاجي وحبر واضح</h3><p class="muted">للمتجر، بطاقات التصميم الفاتحة، المواد المقروءة، وصفحات الإعدادات.</p></div>
        <div class="mode-card stack"><b>سطح البطاقة</b><p>حدود دافئة، ظل ناعم، شعار بلون الحبر، و CTA بلون الهوية.</p><span class="button-sample">ابدأ التصميم</span></div>
      </div>
      <div class="mode-panel mode-dark">
        <div><span class="pill">DARK HERITAGE</span><h3 style="margin-top:14px">كاكاو عميق وذهب خافت</h3><p class="muted">للواجهة الرئيسية، المشاهد السينمائية، البطاقات الداكنة، وحالات العرض العالية.</p></div>
        <div class="mode-card stack"><b>سطح البطاقة</b><p>تباين مقروء، ذهب غير صارخ، وعمق بصري يحترم الشعار.</p><span class="button-sample">استكشف الهوية</span></div>
      </div>
    </div>`,
  });
}

function typographyPage() {
  return page({
    title: "نظام الخطوط",
    eyebrow: "04 · TYPOGRAPHY",
    children: `<div class="stack-lg">
      <div class="two">
        <div class="type-sample"><span class="label">TheYearOfTheCamel · Primary</span><span class="sample-xl">وشّى تصنع الفن</span><p class="muted">الخط الأساسي للعناوين، الواجهات، المتن، وبطاقات الطباعة.</p></div>
        <div class="type-sample"><span class="label">ArabicPoetry · Accent</span><span class="sample-poetry">فنٌ يرتدى</span><p class="muted">خط شعري للاقتباسات واللحظات التعبيرية المحدودة فقط.</p></div>
      </div>
      <div class="weights">
        ${weight("100", "Thin")}
        ${weight("300", "Light")}
        ${weight("500", "Medium")}
        ${weight("900", "ExtraBold")}
      </div>
      <div class="card large">
        <h3 style="margin-bottom:10px">قاعدة الاستخدام</h3>
        <p class="muted">العناوين الكبيرة بوزن 800–900، عناوين الأقسام بوزن 700، المتن بوزن 400–500. لا تخلط خطوطاً خارج ملفات المشروع إلا في حالات البريد أو الفواتير التقنية.</p>
      </div>
    </div>`,
  });
}

function layoutSystemPage() {
  return page({
    title: "المساحات والمكوّنات",
    eyebrow: "05 · LAYOUT",
    children: `<div class="stack-lg">
      <div class="token-grid">
        ${token("Radius", "8px / 16px / 24px", "البطاقات العملية 8px، المواد الفاخرة 24px، الحاويات الكبرى 32px.")}
        ${token("Spacing", "8 · 16 · 32 · 64", "نظام متدرج يمنع الازدحام ويترك مساحة كافية للشعار.")}
        ${token("Depth", "Soft Ambient", "ظلال ناعمة، لا ظلال قاسية، ولا حدود رمادية عامة.")}
        ${token("Surface", "Paper / Cacao", "الأسطح الفاتحة ورقية، والداكنة عميقة لكن مقروءة.")}
        ${token("Motion", "Transform + Opacity", "الحركة رقمية خفيفة، لا تعتمد على تغيير العرض أو الارتفاع.")}
        ${token("Texture", "No Grid", "الخلفيات لا تحتوي خطوطاً طولية أو عرضية متكررة.")}
      </div>
      <div class="bezel"><div class="core two">
        <div class="card tight"><h4>Double Bezel</h4><p class="muted">حاوية خارجية ثم نواة داخلية تعطي إحساساً مادياً دون مبالغة.</p></div>
        <div class="card tight"><h4>Quiet Controls</h4><p class="muted">الأزرار واضحة، الحواف دافئة، وحالات hover مرتبطة بلون الهوية.</p></div>
      </div></div>
    </div>`,
  });
}

function digitalSystemPage() {
  return page({
    theme: "dark",
    title: "النظام الرقمي",
    eyebrow: "05B · DIGITAL UI",
    children: `<div class="two">
      <div class="ui-preview">
        <div class="ui-window stack">
          <span class="pill">LIGHT UI</span>
          <h3>واجهات عملية بنبرة ورقية</h3>
          <p class="muted">للدشـبورد، النماذج، الإعدادات، وأي منطقة تحتاج قراءة طويلة ومقارنة متكررة.</p>
          <span class="button-sample">حفظ التغييرات</span>
        </div>
      </div>
      <div class="ui-preview dark-ui">
        <div class="ui-window stack">
          <span class="pill">DARK UI</span>
          <h3>واجهة رئيسية عميقة</h3>
          <p class="muted">للصفحة الرئيسية، المشاهد التقديمية، واجهات الذكاء الاصطناعي، وعناصر العرض البصرية.</p>
          <span class="button-sample">ابدأ مع وشّى AI</span>
        </div>
      </div>
    </div>`,
  });
}

function printIdentityPage() {
  return page({
    title: "الهوية المطبوعة",
    eyebrow: "06 · PRINT",
    children: `<div class="three">
      <div class="card large stack">
        <div class="business-card dark-card">
          <div style="display:flex;justify-content:space-between;align-items:flex-start"><span class="logo-mask logo-mark tiny-logo"></span><div><h4>هشام الزهراني</h4><p class="gold">المدير العام</p></div></div>
          <p class="latin">+966 53 223 5005<br />info@washa.shop<br />www.washa.shop</p>
        </div>
        <div class="business-card center">
          <span class="logo-mask logo-wordmark wordmark-line"></span>
          <p class="earth" style="font-weight:800">فنٌ يرتدى</p>
        </div>
        ${usageCard("Business Card", "وجه معلومات ووجه شعار بنسبة 1.65:1 وبحواف هادئة.")}
      </div>
      <div class="card large stack" style="align-items:center">
        <div class="vertical-card stack" style="width:100%;max-width:54mm"><span class="logo-mask logo-mark tiny-logo" style="margin:0 auto"></span><h4>شكراً لثقتكم</h4><p class="muted">نحن في وشّى نصنع الفن بحب وإتقان، ونتمنى أن تنال القطعة إعجابك.</p><span class="pill">@washha.sa</span></div>
        ${usageCard("Thank You", "بطاقة عمودية تشعر كرسالة داخل الصندوق، بنسبة 1:1.4.")}
      </div>
      <div class="card large stack" style="align-items:center">
        <div class="social-card stack" style="width:100%;max-width:48mm"><span class="logo-mask logo-wordmark wordmark-line"></span><h4>وشّى في يدك</h4><span class="pill">@WASHAKSA</span><span class="pill">@WASHAKSA</span><span class="pill">+966532235005</span></div>
        ${usageCard("Social Card", "بطاقة 9:16 للمشاركة الرقمية والروابط الاجتماعية.")}
      </div>
    </div>`,
  });
}

function socialAndMotionPage() {
  return page({
    theme: "dark",
    title: "التواصل والحركة",
    eyebrow: "06B · SOCIAL + MOTION",
    children: `<div class="wide-grid">
      <div class="card large stack-lg">
        <h3>الهوية تتحرك بهدوء لا باستعراض.</h3>
        <ul class="list">
          ${bullet("الحركة تدخل عبر opacity و transform فقط، وبزمن ناعم يحاكي الوزن الفعلي.")}
          ${bullet("المحتوى الاجتماعي يحافظ على ألوان وشّى ولا يستعير ألوان المنصات بشكل صارخ.")}
          ${bullet("التصميم المتحرك يستخدم الشعار كعنصر ظهور، وليس كزخرفة متكررة.")}
          ${bullet("لا تستخدم شبكات خلفية أو خطوط متكررة في الفيديو أو الـ PDF أو البطاقات.")}
        </ul>
      </div>
      <div class="bezel"><div class="core stack" style="min-height:118mm;align-content:center;text-align:center">
        <span class="logo-mask logo-mark" style="width:58mm;height:48mm;color:var(--gold-soft);margin:0 auto"></span>
        <h2 class="poetry">فنٌ يرتدى</h2>
        <p class="muted">ظهور هادئ · هالة خفيفة · لا ضوضاء بصرية</p>
      </div></div>
    </div>`,
  });
}

function voicePage() {
  return page({
    title: "الصوت والنبرة",
    eyebrow: "07 · VOICE",
    children: `<div class="two">
      <div class="quote stack">
        <span class="pill">VOICE PRINCIPLE</span>
        <h2>راقي، قريب، دقيق.</h2>
        <p>تتحدث وشّى بلغة إنسانية واثقة: لا تبالغ، لا تتكلف، ولا تختصر الفن إلى إعلان. النبرة تشرح قيمة القطعة وتمنح العميل شعوراً بالاقتناء لا الشراء فقط.</p>
      </div>
      <div class="stack">
        ${voice("قل", "قطعة فنية مطبوعة بعناية", "بدلاً من: تيشيرت بتصميم")}
        ${voice("قل", "فنٌ يرتدى", "بدلاً من: براند ملابس")}
        ${voice("قل", "ابدأ تصميمك", "بدلاً من: جرّب الآن بشكل عام")}
        ${voice("قل", "شكرًا لثقتكم", "بدلاً من: شكراً للشراء")}
      </div>
    </div>`,
  });
}

function artDirectionPage() {
  return page({
    title: "الاتجاه الفني",
    eyebrow: "08 · ART DIRECTION",
    children: `<div class="asym">
      <div class="card large stack-lg">
        <h3>صور واضحة، ملمس حقيقي، ومساحات تنفس.</h3>
        <p class="muted">الأصول البصرية يجب أن تكشف المنتج أو العمل الفني فعلياً. تجنب الصور المظلمة جداً، القص العنيف، والخلفيات التي تخفي التفاصيل.</p>
        <div class="three">
          ${mini("Product First", "المنتج يظهر بوضوح في أول نظرة.")}
          ${mini("Warm Light", "إضاءة ناعمة دافئة لا تغيّر لون القطعة.")}
          ${mini("Material Detail", "لقطات قريبة للطباعة والخامة عند الحاجة.")}
        </div>
      </div>
      <div class="stack">
        <div class="art-tile art-paper"><span class="pill latin">PRODUCT FIRST</span><div><h4>سطح ورقي دافئ</h4><p class="muted">للصور النظيفة، بطاقات المنتج، وخلفيات العرض التي تحفظ لون القطعة.</p></div></div>
        <div class="art-tile art-cacao"><span class="pill latin">CINEMATIC CACAO</span><div><h4>عمق داكن مقروء</h4><p class="muted">للمشاهد الرئيسية والمواد التي تحتاج حضوراً فاخراً دون إخفاء التفاصيل.</p></div></div>
        <div class="art-tile art-gold"><span class="pill latin">SOFT GOLD</span><div><h4>لمعة هادئة</h4><p class="muted">لإبراز التوقيع، الحواف، وحالات الاهتمام دون ضوضاء.</p></div></div>
      </div>
    </div>`,
  });
}

function compliancePage() {
  return page({
    theme: "dark",
    title: "قواعد الاستخدام",
    eyebrow: "09 · COMPLIANCE",
    children: `<div class="do-dont">
      <div class="card large do stack">
        <h3>استخدم</h3>
        <ul class="list">
          ${bullet("الشعار بلون الحبر في الفاتح وبالذهب الهادئ في الداكن.")}
          ${bullet("الخلفيات الورقية أو الكاكاو العميق بدون شبكات أو خطوط متكررة.")}
          ${bullet("TheYearOfTheCamel للواجهة والنصوص، وArabicPoetry للاقتباسات فقط.")}
          ${bullet("تباين واضح في كل بطاقة أو زر أو واجهة.")}
          ${bullet("مساحات كبيرة حول الشعار والعناوين.")}
        </ul>
      </div>
      <div class="card large dont stack">
        <h3>تجنب</h3>
        <ul class="list">
          ${bullet("تمديد الشعار أو ضغطه أو تدويره خارج سياق الحركة.")}
          ${bullet("إضافة خطوط طولية/عرضية كشبكة خلفية في الملفات الرسمية.")}
          ${bullet("استخدام ألوان منصات التواصل كألوان رئيسية للبطاقات.")}
          ${bullet("الظلال القاسية، الحواف العشوائية، والتدرجات الصارخة.")}
          ${bullet("خلط خطوط غير معتمدة مع خطوط المشروع.")}
        </ul>
      </div>
    </div>`,
  });
}

function implementationPage() {
  return page({
    title: "تطبيق الهوية تقنياً",
    eyebrow: "10 · IMPLEMENTATION",
    children: `<div class="wide-grid">
      <div class="stack-lg">
        <div class="card large">
          <h3 style="margin-bottom:10px">أصول الملفات</h3>
          <ul class="list">
            ${bullet("/public/header-logo-identity.png — الرمز المعتمد للهيدر والبطاقات.")}
            ${bullet("/public/hero-logo-wordmark.png — الوردمارك الرسمي.")}
            ${bullet("/public/hero-logo-new.png — النسخة السينمائية المختصرة.")}
            ${bullet("/public/fonts/TheYearofTheCamel-*.otf — خط المشروع الأساسي.")}
            ${bullet("/public/fonts/ArabicPoetry-Medium.otf — خط الاقتباسات.")}
          </ul>
        </div>
        <div class="token-grid">
          ${token("--wusha-bg", "#f4ede3", "خلفية الوضع الفاتح")}
          ${token("--wusha-text", "#1a1612", "النص الرئيسي")}
          ${token("--hero-logo-tone", "#4b3434 / #e0c99a", "لون الشعار حسب النمط")}
        </div>
      </div>
      <pre class="codebox">.brand-mark {
  background: var(--hero-logo-tone);
  -webkit-mask: url("/header-logo-identity.png") center / contain no-repeat;
  mask: url("/header-logo-identity.png") center / contain no-repeat;
}

.brand-surface {
  background: var(--wusha-surface);
  color: var(--wusha-text);
  border-color: var(--wusha-border);
}</pre>
    </div>`,
  });
}

function closingPage() {
  return page({
    theme: "dark",
    title: "",
    eyebrow: "FINAL",
    children: `<div class="center" style="height:210mm">
      <div class="stack-lg" style="justify-items:center">
        <span class="logo-mask logo-wordmark closing-logo"></span>
        <h1 class="poetry">فنٌ يرتدى</h1>
        <p class="muted" style="max-width:96mm">هذه الهوية ليست طبقة زخرفية؛ هي نظام يضبط كيف تبدو وشّى، كيف تتكلم، وكيف تترك أثراً مطبوعاً ورقمياً متسقاً.</p>
        <span class="pill">WASHA · BRAND IDENTITY SYSTEM · 2026</span>
      </div>
    </div>`,
  });
}

function meta(label, value) {
  return `<div class="meta"><span>${label}</span><b>${value}</b></div>`;
}

function metric(value, label) {
  return `<div class="center"><strong style="font-size:28px;line-height:1;color:var(--identity)">${value}</strong><span class="muted" style="font-size:11px">${label}</span></div>`;
}

function principle(title, text) {
  return `<div class="card principle"><span class="mark"></span><h3>${title}</h3><p class="muted">${text}</p></div>`;
}

function logoRule(title, text) {
  return `<div class="card tight"><h4>${title}</h4><p class="muted">${text}</p></div>`;
}

function usageCard(title, text) {
  return `<div class="card tight"><span class="pill latin">${title}</span><p class="muted" style="margin-top:10px">${text}</p></div>`;
}

function swatch(ar, en, hex, usage) {
  return `<div class="swatch"><div class="swatch-color" style="background:${hex}"></div><div class="swatch-body"><strong>${ar}</strong><small>${hex} · ${en}</small><p>${usage}</p></div></div>`;
}

function weight(num, label) {
  return `<div class="weight"><b style="font-weight:${num}">وش</b><span>${label} · ${num}</span></div>`;
}

function token(name, value, desc) {
  return `<div class="token"><code>${name}: ${value}</code><p class="muted">${desc}</p></div>`;
}

function bullet(text) {
  return `<li><span class="dot"></span><span>${text}</span></li>`;
}

function voice(label, text, note) {
  return `<div class="card tight"><span class="pill">${label}</span><h3 style="margin-top:10px">${text}</h3><p class="muted">${note}</p></div>`;
}

function mini(title, text) {
  return `<div class="card tight"><h4>${title}</h4><p class="muted">${text}</p></div>`;
}
