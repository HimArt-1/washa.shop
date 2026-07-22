import { useAuth } from '@clerk/clerk-react';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  Cross2Icon,
  DownloadIcon,
  MagicWandIcon,
  ReloadIcon,
} from '@radix-ui/react-icons';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState, type ReactNode } from 'react';
import SingleImageOutputMonitor from './SingleImageOutputMonitor';

type Composition = 'horizontal' | 'vertical' | 'diagonal' | 'centered' | 'asymmetrical';
type Movement = 'lower_left_to_upper_right' | 'left_to_right' | 'bottom_to_top' | 'center_outward';
type PrintPosition = 'front' | 'back' | 'left_chest' | 'right_chest' | 'full_back' | 'custom';
type Background = 'ice_vanilla' | 'light_beige' | 'soft_concrete' | 'muted_charcoal';
type PrintMethod = 'dtf' | 'screen_print' | 'embroidery' | 'mixed';
type PrintFinish = 'matte' | 'soft_hand' | 'metallic' | 'puff' | 'custom';
type TypographyStyle = 'modern_sans_serif' | 'condensed' | 'serif' | 'arabic_calligraphy' | 'monospace' | 'custom';

type V4Brief = {
  designIdea: string;
  mainSubject: string;
  secondarySubjects: string;
  environment: string;
  composition: Composition;
  visualMovement: Movement;
  heroPosition: 'left';
  garmentView: 'front' | 'back';
  designWidth: number;
  designHeight: number;
  detailOne: string;
  detailTwo: string;
  visualStyle: string;
  mainText: string;
  secondaryText: string;
  typographyStyle: TypographyStyle;
  customTypographyStyle: string;
  printMethod: PrintMethod;
  printFinish: PrintFinish;
  customPrintFinish: string;
  background: Background;
  backgroundColor: string;
  additionalInstructions: string;
};

type V4State = {
  brief: V4Brief;
  garmentColorName: string;
  garmentColorHex: string;
  printPosition: PrintPosition;
  customPrintPosition: string;
  styleName: string;
  artStyleName: string;
  artworkColors: Array<{ name: string; hex: string }>;
};

type GenerationResult = {
  imageUrl: string;
  provider: string;
  model: string;
  width: number;
  height: number;
  durationMs: number;
};

const BACKGROUND_HEX: Record<Background, string> = {
  ice_vanilla: '#F4F0E6',
  light_beige: '#D9CDBD',
  soft_concrete: '#B9B7B0',
  muted_charcoal: '#343432',
};

const PLACEMENT: Record<PrintPosition, { label: string; view: 'front' | 'back' | null; width: number; height: number; maxWidth: number; maxHeight: number }> = {
  front: { label: 'الأمام', view: 'front', width: 40, height: 27, maxWidth: 45, maxHeight: 55 },
  back: { label: 'الظهر', view: 'back', width: 32, height: 25, maxWidth: 40, maxHeight: 40 },
  left_chest: { label: 'الصدر الأيسر', view: 'front', width: 10, height: 10, maxWidth: 15, maxHeight: 15 },
  right_chest: { label: 'الصدر الأيمن', view: 'front', width: 10, height: 10, maxWidth: 15, maxHeight: 15 },
  full_back: { label: 'الظهر الكامل', view: 'back', width: 40, height: 45, maxWidth: 45, maxHeight: 60 },
  custom: { label: 'موضع مخصص', view: null, width: 30, height: 30, maxWidth: 45, maxHeight: 60 },
};

const INITIAL_STATE: V4State = {
  brief: {
    designIdea: '',
    mainSubject: '',
    secondarySubjects: '',
    environment: '',
    composition: 'centered',
    visualMovement: 'center_outward',
    heroPosition: 'left',
    garmentView: 'front',
    designWidth: 40,
    designHeight: 27,
    detailOne: '',
    detailTwo: '',
    visualStyle: '',
    mainText: '',
    secondaryText: '',
    typographyStyle: 'modern_sans_serif',
    customTypographyStyle: '',
    printMethod: 'dtf',
    printFinish: 'matte',
    customPrintFinish: '',
    background: 'ice_vanilla',
    backgroundColor: '#F4F0E6',
    additionalInstructions: '',
  },
  garmentColorName: 'Washed Black',
  garmentColorHex: '#1C1C1A',
  printPosition: 'front',
  customPrintPosition: '',
  styleName: 'Modern Saudi streetwear',
  artStyleName: 'Premium editorial illustration',
  artworkColors: [
    { name: 'Bone', hex: '#E7DFC9' },
    { name: 'Ink', hex: '#242724' },
    { name: 'Rust', hex: '#9A543B' },
    { name: '', hex: '' },
    { name: '', hex: '' },
  ],
};

const fieldClass = 'w-full rounded-xl border border-[#d2cbc0] bg-[#f8f5ee] px-4 py-3 text-sm text-[#292c29] outline-none transition-[border-color,background-color,transform] duration-200 placeholder:text-[#8c877d] focus:border-[#647667] focus:bg-white';
const labelClass = 'grid gap-2 text-sm font-bold text-[#343834]';

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className={labelClass}>
      <span>{label}</span>
      {children}
      {hint ? <span className="text-[11px] font-normal leading-5 text-[#77766f]">{hint}</span> : null}
    </label>
  );
}

function SectionHeading({ index, title, description }: { index: string; title: string; description: string }) {
  return (
    <div className="mb-7 border-t border-[#cec7bc] pt-5">
      <p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#6f806f]">{index}</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-[#282c28]">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-[#72736d]">{description}</p>
    </div>
  );
}

export default function WashaAiV4() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [stage, setStage] = useState(0);
  const [state, setState] = useState<V4State>(INITIAL_STATE);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);

  const updateBrief = (patch: Partial<V4Brief>) => setState((current) => ({
    ...current,
    brief: { ...current.brief, ...patch },
  }));

  const requiredComplete = useMemo(() => [
    state.brief.designIdea,
    state.brief.mainSubject,
    state.brief.detailOne,
    state.brief.detailTwo,
    state.artStyleName,
  ].every((value) => value.trim().length >= 2), [state]);
  const filledOutputInputs = useMemo(() => [
    state.brief.designIdea,
    state.brief.mainSubject,
    state.brief.detailOne,
    state.brief.detailTwo,
    state.artStyleName,
  ].filter((value) => value.trim().length >= 2).length, [state]);

  const placement = PLACEMENT[state.printPosition];
  const productionValid = state.brief.designWidth >= 5
    && state.brief.designHeight >= 5
    && state.brief.designWidth <= placement.maxWidth
    && state.brief.designHeight <= placement.maxHeight
    && state.brief.detailOne.trim().toLowerCase() !== state.brief.detailTwo.trim().toLowerCase()
    && (state.printPosition !== 'custom' || state.customPrintPosition.trim().length >= 2)
    && (state.brief.typographyStyle !== 'custom' || state.brief.customTypographyStyle.trim().length >= 2)
    && (state.brief.printFinish !== 'custom' || state.brief.customPrintFinish.trim().length >= 2);

  const goToStage = (next: number) => {
    setError(null);
    setStage(Math.max(0, Math.min(2, next)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const selectPlacement = (printPosition: PrintPosition) => {
    const next = PLACEMENT[printPosition];
    setState((current) => ({
      ...current,
      printPosition,
      brief: {
        ...current.brief,
        garmentView: next.view ?? current.brief.garmentView,
        designWidth: next.width,
        designHeight: next.height,
      },
    }));
  };

  const generate = async () => {
    if (!requiredComplete || !productionValid) {
      setError('أكمل الحقول الأساسية وتأكد من مقاس الطباعة قبل التوليد.');
      return;
    }
    if (!isLoaded) return;
    if (!isSignedIn) {
      window.location.assign(`/sign-in?redirect_url=${encodeURIComponent('/design/washa-ai/dev-v4')}`);
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const token = await getToken();
      const response = await fetch('/api/washa-ai-v4/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          requestId: `v4_${crypto.randomUUID().replaceAll('-', '')}`,
          brief: state.brief,
          garmentName: 'Premium oversized box-fit t-shirt',
          garmentColorName: state.garmentColorName,
          garmentColorHex: state.garmentColorHex,
          printPosition: state.printPosition,
          customPrintPosition: state.customPrintPosition,
          styleName: state.styleName,
          artStyleName: state.artStyleName,
          artworkColors: state.artworkColors.filter((color) => /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(color.hex)),
        }),
      });
      const payload = await response.json() as { ok?: boolean; error?: string } & Partial<GenerationResult>;
      if (!response.ok || !payload.ok || !payload.imageUrl) {
        throw new Error(payload.error || 'تعذر إنشاء اللوحة.');
      }
      setResult(payload as GenerationResult);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : 'تعذر إنشاء اللوحة.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="v4-grain min-h-[100dvh] overflow-x-clip bg-[#eee9de] text-[#292c29]" dir="rtl">
      <header className="border-b border-[#d1cabf] bg-[#eee9de]/95 px-4 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3 text-[#292c29] no-underline">
            <span className="flex h-10 w-10 items-center justify-center border border-[#77887a]/35 bg-[#77887a]/10 font-black text-[#506254]">و</span>
            <div><p className="m-0 text-sm font-black tracking-tight">WASHA AI v4</p><p className="m-0 mt-0.5 font-mono text-[9px] tracking-[0.16em] text-[#74766f]">INDEPENDENT BOARD ENGINE</p></div>
          </a>
          <div className="flex items-center gap-2 border border-[#d1cabf] bg-[#f7f3eb] px-3 py-2 font-mono text-[10px] font-bold tracking-[0.12em] text-[#5c6f60]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#6d806f]" /> 4:5 / 4K
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1480px] gap-8 px-4 py-7 md:px-8 lg:grid-cols-[minmax(0,1.18fr)_minmax(360px,0.82fr)] lg:py-10">
        <section className="min-w-0">
          <div className="grid gap-5 border-b border-[#cec7bc] pb-7 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <p className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#687b6b]">CUSTOM DESIGN PRESENTATION / V4</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-black leading-none tracking-tighter text-[#272b27] md:text-6xl">فكرة واحدة.<br />لوحة اعتماد كاملة.</h1>
              <p className="mt-5 max-w-[62ch] text-sm leading-7 text-[#696c66] md:text-base">مسار توليد مستقل يبني العمل، الموكب، لقطات التفاصيل والقياسات في صورة واحدة دون المرور بإزالة الخلفية أو إعادة التركيب.</p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-x-reverse divide-[#cec7bc] border border-[#cec7bc] bg-[#f5f1e9]">
              {['01 الفكرة', '02 الإنتاج', '03 التوليد'].map((label, index) => (
                <button key={label} type="button" onClick={() => index <= stage && goToStage(index)} className={`min-h-14 px-4 font-mono text-[10px] font-bold ${stage === index ? 'bg-[#536557] text-[#f8f5ee]' : 'text-[#777971]'}`}>{label}</button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={stage} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ type: 'spring', stiffness: 100, damping: 20 }} className="py-8">
              {stage === 0 ? (
                <div>
                  <SectionHeading index="01 / CONCEPT" title="ابنِ أصل العمل الفني" description="صف ما يجب أن يظهر بدقة. لن يضيف المحرك نصوصًا أو رموزًا غير مطلوبة." />
                  <div className="grid gap-5">
                    <Field label="فكرة التصميم الكاملة" hint="المشهد، العلاقة بين العناصر، والإحساس المطلوب."><textarea rows={5} className={`${fieldClass} resize-y leading-7`} value={state.brief.designIdea} onChange={(event) => updateBrief({ designIdea: event.target.value })} placeholder="مثال: صقر هندسي يعبر سماء هادئة بخطوط حبر دقيقة..." /></Field>
                    <div className="grid gap-5 md:grid-cols-2">
                      <Field label="العنصر الرئيسي"><input className={fieldClass} value={state.brief.mainSubject} onChange={(event) => updateBrief({ mainSubject: event.target.value })} placeholder="العنصر الذي يقود التكوين" /></Field>
                      <Field label="العناصر الثانوية"><input className={fieldClass} value={state.brief.secondarySubjects} onChange={(event) => updateBrief({ secondarySubjects: event.target.value })} placeholder="اختياري" /></Field>
                      <Field label="البيئة والخلفية داخل الرسم"><input className={fieldClass} value={state.brief.environment} onChange={(event) => updateBrief({ environment: event.target.value })} placeholder="فراغ سلبي، نجوم، عمارة..." /></Field>
                      <Field label="الأسلوب الفني"><input className={fieldClass} value={state.artStyleName} onChange={(event) => setState((current) => ({ ...current, artStyleName: event.target.value }))} /></Field>
                      <Field label="اتجاه التكوين"><select className={fieldClass} value={state.brief.composition} onChange={(event) => updateBrief({ composition: event.target.value as Composition })}><option value="centered">متمركز</option><option value="diagonal">قطري</option><option value="vertical">رأسي</option><option value="horizontal">أفقي</option><option value="asymmetrical">غير متماثل</option></select></Field>
                      <Field label="الحركة البصرية"><select className={fieldClass} value={state.brief.visualMovement} onChange={(event) => updateBrief({ visualMovement: event.target.value as Movement })}><option value="center_outward">من المركز إلى الخارج</option><option value="lower_left_to_upper_right">من أسفل اليسار إلى أعلى اليمين</option><option value="left_to_right">من اليسار إلى اليمين</option><option value="bottom_to_top">من الأسفل إلى الأعلى</option></select></Field>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      <Field label="DETAIL 01"><input className={fieldClass} value={state.brief.detailOne} onChange={(event) => updateBrief({ detailOne: event.target.value })} placeholder="تفصيل العين، الخطوط الدقيقة..." /></Field>
                      <Field label="DETAIL 02" hint="يجب أن يختلف عن التفصيل الأول."><input className={fieldClass} value={state.brief.detailTwo} onChange={(event) => updateBrief({ detailTwo: event.target.value })} placeholder="عنصر ثانٍ مختلف" /></Field>
                    </div>
                  </div>
                </div>
              ) : null}

              {stage === 1 ? (
                <div>
                  <SectionHeading index="02 / PRODUCTION" title="ثبّت مواصفات القطعة والطباعة" description="المنظور وحدود القياس مرتبطان بموضع الطباعة لمنع مخرجات غير قابلة للتنفيذ." />
                  <div className="grid gap-7">
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
                      {(Object.keys(PLACEMENT) as PrintPosition[]).map((position) => <button key={position} type="button" onClick={() => selectPlacement(position)} className={`min-h-16 border px-3 text-sm font-bold transition-transform active:scale-[0.98] ${state.printPosition === position ? 'border-[#5f7262] bg-[#5f7262] text-white' : 'border-[#cec7bc] bg-[#f6f2ea] text-[#5f625d]'}`}>{PLACEMENT[position].label}</button>)}
                    </div>
                    {state.printPosition === 'custom' ? <Field label="وصف موضع الطباعة المخصص"><input className={fieldClass} value={state.customPrintPosition} onChange={(event) => setState((current) => ({ ...current, customPrintPosition: event.target.value }))} placeholder="مثال: أسفل الجانب الأيسر" /></Field> : null}
                    <div className="grid gap-5 md:grid-cols-3">
                      <Field label="لون القطعة"><input className={fieldClass} value={state.garmentColorName} onChange={(event) => setState((current) => ({ ...current, garmentColorName: event.target.value }))} /></Field>
                      <Field label="HEX القطعة"><input dir="ltr" className={`${fieldClass} text-left font-mono`} value={state.garmentColorHex} onChange={(event) => setState((current) => ({ ...current, garmentColorHex: event.target.value }))} /></Field>
                      <Field label="تكوين القالب"><div className={`${fieldClass} flex items-center bg-[#eee9de] text-[#5e665f]`}>الهيرو يسارًا والتفاصيل يمينًا</div></Field>
                      <Field label="منظور القطعة" hint={state.printPosition === 'custom' ? 'اختر المنظور المناسب للموضع المخصص.' : 'يُضبط تلقائيًا حسب موضع الطباعة.'}><select className={fieldClass} disabled={state.printPosition !== 'custom'} value={state.brief.garmentView} onChange={(event) => updateBrief({ garmentView: event.target.value as 'front' | 'back' })}><option value="front">أمامي</option><option value="back">خلفي</option></select></Field>
                      <Field label="العرض (سم)" hint={`الحد: ${placement.maxWidth} سم`}><input type="number" min={5} max={placement.maxWidth} step={0.5} className={`${fieldClass} font-mono`} value={state.brief.designWidth} onChange={(event) => updateBrief({ designWidth: Number(event.target.value) })} /></Field>
                      <Field label="الارتفاع (سم)" hint={`الحد: ${placement.maxHeight} سم`}><input type="number" min={5} max={placement.maxHeight} step={0.5} className={`${fieldClass} font-mono`} value={state.brief.designHeight} onChange={(event) => updateBrief({ designHeight: Number(event.target.value) })} /></Field>
                      <Field label="طريقة الطباعة"><select className={fieldClass} value={state.brief.printMethod} onChange={(event) => updateBrief({ printMethod: event.target.value as PrintMethod })}><option value="dtf">DTF</option><option value="screen_print">Screen Print</option><option value="embroidery">Embroidery</option><option value="mixed">Mixed</option></select></Field>
                      <Field label="تشطيب الطباعة"><select className={fieldClass} value={state.brief.printFinish} onChange={(event) => updateBrief({ printFinish: event.target.value as PrintFinish })}><option value="matte">Matte</option><option value="soft_hand">Soft Hand</option><option value="metallic">Metallic</option><option value="puff">Puff</option><option value="custom">Custom</option></select></Field>
                      {state.brief.printFinish === 'custom' ? <Field label="التشطيب المخصص"><input className={fieldClass} value={state.brief.customPrintFinish} onChange={(event) => updateBrief({ customPrintFinish: event.target.value })} /></Field> : null}
                      <Field label="خلفية لوحة العرض"><select className={fieldClass} value={state.brief.background} onChange={(event) => { const background = event.target.value as Background; updateBrief({ background, backgroundColor: BACKGROUND_HEX[background] }); }}><option value="ice_vanilla">Ice Vanilla</option><option value="light_beige">Light Beige</option><option value="soft_concrete">Soft Concrete</option><option value="muted_charcoal">Muted Charcoal</option></select></Field>
                      <Field label="HEX الخلفية"><input dir="ltr" className={`${fieldClass} text-left font-mono`} value={state.brief.backgroundColor} onChange={(event) => updateBrief({ backgroundColor: event.target.value })} /></Field>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      <Field label="النص الرئيسي"><input className={fieldClass} value={state.brief.mainText} onChange={(event) => updateBrief({ mainText: event.target.value })} placeholder="اتركه فارغًا لعدم استخدام نص" /></Field>
                      <Field label="النص الثانوي"><input className={fieldClass} value={state.brief.secondaryText} onChange={(event) => updateBrief({ secondaryText: event.target.value })} placeholder="اختياري" /></Field>
                      <Field label="أسلوب الخط"><select className={fieldClass} value={state.brief.typographyStyle} onChange={(event) => updateBrief({ typographyStyle: event.target.value as TypographyStyle })}><option value="modern_sans_serif">Modern Sans Serif</option><option value="condensed">Condensed</option><option value="serif">Serif</option><option value="arabic_calligraphy">Arabic Calligraphy</option><option value="monospace">Monospace</option><option value="custom">Custom</option></select></Field>
                      {state.brief.typographyStyle === 'custom' ? <Field label="أسلوب الخط المخصص"><input className={fieldClass} value={state.brief.customTypographyStyle} onChange={(event) => updateBrief({ customTypographyStyle: event.target.value })} /></Field> : null}
                    </div>
                    <div>
                      <p className="mb-3 text-sm font-bold">ألوان العمل الفني</p>
                      <div className="grid gap-3 md:grid-cols-3">{state.artworkColors.map((color, index) => <div key={index} className="grid grid-cols-[1fr_92px] gap-2"><input className={fieldClass} value={color.name} onChange={(event) => setState((current) => ({ ...current, artworkColors: current.artworkColors.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) }))} /><input dir="ltr" className={`${fieldClass} px-2 text-left font-mono text-xs`} value={color.hex} onChange={(event) => setState((current) => ({ ...current, artworkColors: current.artworkColors.map((item, itemIndex) => itemIndex === index ? { ...item, hex: event.target.value } : item) }))} /></div>)}</div>
                    </div>
                  </div>
                </div>
              ) : null}

              {stage === 2 ? (
                <div>
                  <SectionHeading index="03 / GENERATE" title="راجع ثم أنشئ الصورة" description="استدعاء واحد ينتج صورة نهائية واحدة متماسكة 4:5؛ لا صور منفصلة، لا إزالة خلفية، ولا تركيب ثانوي." />
                  <div className="divide-y divide-[#d2cbc0] border-y border-[#d2cbc0]">
                    {[
                      ['الفكرة', state.brief.designIdea || 'غير مكتملة'],
                      ['القطعة', `${state.garmentColorName} / ${state.garmentColorHex}`],
                      ['الطباعة', `${PLACEMENT[state.printPosition].label} · ${state.brief.designWidth} × ${state.brief.designHeight} سم`],
                      ['الأسلوب', state.artStyleName],
                      ['الخلفية', `${state.brief.background} / ${state.brief.backgroundColor}`],
                    ].map(([label, value]) => <div key={label} className="grid gap-2 py-4 md:grid-cols-[140px_1fr]"><span className="font-mono text-[10px] font-bold tracking-[0.14em] text-[#738075]">{label}</span><span className="text-sm leading-6 text-[#424642]">{value}</span></div>)}
                  </div>
                  <Field label="تعليمات إضافية" hint="تُعامل كتفضيلات إبداعية ولا يمكنها تجاوز قواعد اللوحة."><textarea rows={3} className={`${fieldClass} mt-6 resize-y leading-7`} value={state.brief.additionalInstructions} onChange={(event) => updateBrief({ additionalInstructions: event.target.value })} /></Field>
                  <button type="button" disabled={generating} onClick={generate} className="mt-7 inline-flex min-h-14 w-full items-center justify-center gap-3 bg-[#3f5145] px-6 text-sm font-black text-[#f8f5ee] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition-transform active:scale-[0.98] disabled:opacity-55 md:w-auto md:min-w-64">
                    <MagicWandIcon className="h-5 w-5" /> {generating ? 'يتم إنشاء اللوحة...' : isSignedIn ? 'إنشاء WASHA AI v4' : 'سجّل الدخول وابدأ'}
                  </button>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>

          {error ? <div role="alert" className="mb-6 flex items-start gap-3 border border-[#a85d4f]/35 bg-[#a85d4f]/[0.07] p-4 text-sm leading-6 text-[#7a3e35]"><Cross2Icon className="mt-1 h-4 w-4 shrink-0" />{error}</div> : null}

          <div className="flex items-center justify-between border-t border-[#cec7bc] pt-5">
            <button type="button" onClick={() => goToStage(stage - 1)} disabled={stage === 0} className="inline-flex min-h-11 items-center gap-2 border border-[#c8c1b6] px-4 text-sm font-bold text-[#62655f] disabled:opacity-35"><ArrowRightIcon /> السابق</button>
            {stage < 2 ? <button type="button" onClick={() => goToStage(stage + 1)} disabled={(stage === 0 && !requiredComplete) || (stage === 1 && !productionValid)} className="inline-flex min-h-11 items-center gap-2 bg-[#536557] px-5 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-35">التالي <ArrowLeftIcon /></button> : null}
          </div>
        </section>

        <aside className="min-w-0 lg:sticky lg:top-6 lg:self-start">
          <div className="border border-[#bdb6ab] bg-[#ddd7cc]/70 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] md:p-4">
            <div className="mb-4 flex items-end justify-between gap-4 border-b border-[#bdb6ab] pb-3">
              <div><p className="font-mono text-[10px] font-bold tracking-[0.18em] text-[#52655a]">SINGLE IMAGE OUTPUT</p><p className="mt-1 text-sm font-black">شاشة الناتج المباشر</p></div>
              <div dir="ltr" className="flex items-center gap-2 font-mono text-[9px] tracking-[0.12em] text-[#667169]"><span className="h-1.5 w-1.5 rounded-full bg-[#637b6a]" /> 3200 × 4000</div>
            </div>
            {result && !generating ? (
              <motion.div initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 100, damping: 20 }}>
                <div className="relative overflow-hidden border border-[#3d4840] bg-[#171b18]">
                  <img src={result.imageUrl} alt="لوحة WASHA AI v4 الناتجة" className="block aspect-[4/5] w-full object-cover" />
                  <div dir="ltr" className="absolute left-3 right-3 top-3 flex items-center justify-between bg-[#171b18]/85 px-3 py-2 font-mono text-[8px] tracking-[0.16em] text-[#b8c5bb] backdrop-blur-sm"><span>RENDER COMPLETE</span><span>ONE FRAME</span></div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <a href={result.imageUrl} download className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#3f5145] px-4 text-sm font-bold text-white no-underline transition-transform active:scale-[0.98]"><DownloadIcon /> تنزيل</a>
                  <button type="button" onClick={generate} className="inline-flex min-h-11 items-center justify-center gap-2 border border-[#bbb4aa] bg-[#f4f0e8] px-4 text-sm font-bold transition-transform active:scale-[0.98]"><ReloadIcon /> إعادة التوليد</button>
                </div>
                <div className="mt-3 flex items-center justify-between font-mono text-[9px] tracking-[0.12em] text-[#73766f]"><span>{result.provider} / {result.model}</span><span>{(result.durationMs / 1000).toFixed(1)}s</span></div>
              </motion.div>
            ) : (
              <SingleImageOutputMonitor
                generating={generating}
                designWidth={state.brief.designWidth}
                designHeight={state.brief.designHeight}
                composition={state.brief.composition}
                filledInputs={filledOutputInputs}
                artworkColors={state.artworkColors}
              />
            )}
            <div dir="ltr" className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[#bdb6ab] pt-3 font-mono text-[8px] font-bold tracking-[0.14em] text-[#657068]">
              <span>ONE IMAGE</span><span>DIRECT PIPELINE</span><span>NO SIMULATION</span><span>4:5 LOCKED</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
