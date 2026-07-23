const API_BASE_URL = '/api/washa-dtf-studio';

export type EnhanceIdeaInput = {
  idea: string;
  garmentType?: string | null;
  style?: string | null;
  technique?: string | null;
  palette?: string | null;
  surface?: 'classic' | 'dev-v3';
  creativeDirection?: string | null;
};

export type EnhanceIdeaSource = 'ai' | 'local';

export type EnhanceIdeaResult = {
  enhancedIdea: string;
  source: EnhanceIdeaSource;
  provider?: string | null;
};

const INTERNAL_OUTPUT_PATTERN =
  /DTF|prompt|WASHA AI|مواصفات القطعة|موضع الطباعة|لون القطعة|المقاس|خلفية شفافة|قيود مهمة|الأسلوب الفني المطلوب|طريقة التنفيذ البصرية|لوحة الألوان/i;

function cleanIdea(value: string) {
  return value
    .replace(/\s+/g, ' ')
    .replace(/^[\s"'“”«»]+|[\s"'“”«»]+$/g, '')
    .trim();
}

function stripOptionLabel(value?: string | null) {
  return cleanIdea(value || '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeEnhancedIdea(value: string, fallback: string) {
  const cleaned = cleanIdea(value)
    .split(/\n+/)
    .map((line) =>
      line
        .replace(/^\s*[-*•\d.]+ـ?\s*/, '')
        .replace(/^(الفكرة المحسنة|الوصف المحسن|النتيجة|الإجابة)\s*[:：]\s*/i, '')
        .trim()
    )
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  const wordCount = cleaned.split(/\s+/).filter(Boolean).length;
  const minimumUsefulLength = Math.min(150, Math.max(110, Math.round(cleanIdea(fallback).length * 0.72)));
  const isIncomplete = cleaned.length < minimumUsefulLength || wordCount < 24;

  if (!cleaned || INTERNAL_OUTPUT_PATTERN.test(cleaned) || isIncomplete) {
    return buildLocalEnhancedIdea({ idea: fallback }).enhancedIdea;
  }

  return cleaned.slice(0, 420).trim();
}

function includesAny(value: string, words: string[]) {
  return words.some((word) => value.includes(word));
}

type LocalSceneProfile = {
  keywords: string[];
  subject: string;
  setting: string;
  action: string;
  details: string;
  mood: string;
};

const LOCAL_SCENE_PROFILES: LocalSceneProfile[] = [
  {
    keywords: ['ديناصور', 'dinosaur'],
    subject: 'ديناصور مرح',
    setting: 'وسط غابة كثيفة مليئة بالأشجار العالية وخلفه شلال واسع يتناثر منه رذاذ مضيء',
    action: 'يتحرك بطاقة سعيدة وحضور لافت',
    details: 'تتطاير حوله أوراق خضراء وقطرات ماء صغيرة تمنح المشهد حياة وحركة',
    mood: 'بروح مرحة ومغامرة واضحة',
  },
  {
    keywords: ['ذئب', 'wolf'],
    subject: 'ذئب واثق',
    setting: 'فوق مرتفع صخري تحت ضوء قمر هادئ وجبال بعيدة',
    action: 'ينظر بثبات وكأن الريح تحرك تفاصيله',
    details: 'تظهر حوله خطوط ضوء باردة وضباب خفيف يضيف عمقاً وغموضاً',
    mood: 'بإحساس قوي يجمع الهدوء والشجاعة',
  },
  {
    keywords: ['أسد', 'lion'],
    subject: 'أسد مهيب',
    setting: 'داخل هالة ضوء دافئة توحي بالفخامة والقوة',
    action: 'يرفع رأسه بنظرة ملكية ثابتة',
    details: 'تنساب حوله تفاصيل شعر دقيقة ولمسات ضوء تمنح المشهد حضوراً واضحاً',
    mood: 'بشعور راقٍ وواثق',
  },
  {
    keywords: ['تنين', 'dragon'],
    subject: 'تنين أسطوري',
    setting: 'بين سحب داكنة وشرارات ضوء متوهجة',
    action: 'يلتف بحركة درامية واسعة',
    details: 'تظهر حول أجنحته خطوط نار ودخان ناعم يمنح المشهد خيالاً وحماساً',
    mood: 'بطابع ملحمي مليء بالطاقة',
  },
  {
    keywords: ['فراشة', 'butterfly'],
    subject: 'فراشة حالمة',
    setting: 'في فضاء هادئ تتناثر فيه نقاط ضوء صغيرة ونجوم ناعمة',
    action: 'تفرد جناحيها بحركة خفيفة وانسيابية',
    details: 'تظهر على الأجنحة تفاصيل دقيقة ولمعات شفافة تمنح الفكرة رقة وانطلاقاً',
    mood: 'بإحساس شاعري وخفيف',
  },
  {
    keywords: ['قهوة', 'coffee'],
    subject: 'كوب قهوة دافئ',
    setting: 'على سطح هادئ بإضاءة صباحية ناعمة',
    action: 'يتصاعد منه بخار رقيق يرسم حركة مريحة',
    details: 'تحيط به لمسات بسيطة وتفاصيل ظل دافئة تمنح المشهد ذوقاً وطمأنينة',
    mood: 'بمزاج هادئ وأنيق',
  },
  {
    keywords: ['بحر', 'موج', 'أمواج', 'سمك', 'حوت', 'sea', 'ocean', 'wave'],
    subject: 'مشهد بحري عميق',
    setting: 'بين أمواج متداخلة وضوء منعكس على سطح الماء',
    action: 'يتحرك بإيقاع ناعم ومنساب',
    details: 'تظهر فقاعات صغيرة ولمعات زرقاء تضيف انتعاشاً وعمقاً بصرياً',
    mood: 'بإحساس حر ومنعش',
  },
  {
    keywords: ['فضاء', 'كوكب', 'قمر', 'نجوم', 'مجرة', 'space', 'planet'],
    subject: 'مشهد فضائي واسع',
    setting: 'بين كواكب بعيدة ونجوم لامعة وضوء كوني هادئ',
    action: 'يمتد كرحلة خيالية في عمق السماء',
    details: 'تظهر مسارات ضوء ناعمة وغبار نجمي يمنحان الفكرة دهشة ومغامرة',
    mood: 'بطابع حالِم ومثير للاستكشاف',
  },
  {
    keywords: ['نخلة', 'palm'],
    subject: 'نخلة أنيقة',
    setting: 'وسط أفق دافئ مستوحى من الهدوء والهوية العربية المعاصرة',
    action: 'تميل بانسيابية كأن النسيم يحركها',
    details: 'تحيط بها خطوط ضوء ذهبية وتفاصيل بسيطة تمنحها حضوراً راقياً',
    mood: 'بإحساس أصيل ومعاصر',
  },
  {
    keywords: ['سيارة', 'car', 'دراجة', 'motor'],
    subject: 'مشهد سريع مليء بالحركة',
    setting: 'على طريق مضاء بانعكاسات عصرية وخطوط سرعة واضحة',
    action: 'ينطلق بطاقة عالية واتجاه حاد',
    details: 'تظهر حوله لمعات معدنية وظلال ديناميكية تضيف إحساساً بالقوة والسرعة',
    mood: 'بطابع عصري وحماسي',
  },
  {
    keywords: ['وردة', 'زهرة', 'flower', 'rose'],
    subject: 'زهرة رقيقة',
    setting: 'داخل تكوين نباتي هادئ تحيط به أوراق ناعمة وقطرات ضوء صغيرة',
    action: 'تتفتح بانسيابية واضحة',
    details: 'تظهر على البتلات تفاصيل دقيقة وتدرجات لطيفة تمنح المشهد نعومة وفخامة',
    mood: 'بإحساس شاعري وراقي',
  },
  {
    keywords: ['جمجمة', 'skull'],
    subject: 'جمجمة مزخرفة',
    setting: 'داخل أجواء غامضة بإضاءة جانبية حادة وتفاصيل زخرفية متوازنة',
    action: 'تظهر كرمز قوي في منتصف المشهد',
    details: 'تحيط بها عناصر نباتية أو هندسية تضيف عمقاً دون أن تزدحم الفكرة',
    mood: 'بطابع جريء وفني',
  },
  {
    keywords: ['تراث', 'نجدي', 'عربي', 'سعودي', 'زخرفة', 'heritage'],
    subject: 'تكوين عربي معاصر',
    setting: 'مستوحى من الزخارف التراثية والخطوط الهندسية الهادئة',
    action: 'يتوازن بين الأصالة والبساطة الحديثة',
    details: 'تظهر فيه تفاصيل دقيقة ولمسات ضوء دافئة تمنح الفكرة هوية واضحة',
    mood: 'بإحساس فاخر وأصيل',
  },
];

function getLocalProfile(idea: string) {
  const lower = idea.toLowerCase();
  return LOCAL_SCENE_PROFILES.find((profile) => includesAny(lower, profile.keywords)) || null;
}

function inferAction(idea: string, profile: LocalSceneProfile | null) {
  const lower = idea.toLowerCase();
  if (includesAny(lower, ['يرقص', 'ترقص', 'رقص', 'dance', 'dancing'])) return 'يرقص بفرح وحركة واضحة كأن المشهد كله يتفاعل معه';
  if (includesAny(lower, ['يطير', 'تحلق', 'يحلق', 'fly', 'flying'])) return 'ينطلق في الهواء بحركة واسعة تمنح المشهد إحساساً بالحرية';
  if (includesAny(lower, ['يجري', 'يركض', 'run', 'running'])) return 'يندفع للأمام بطاقة سريعة وخطوط حركة قوية';
  if (includesAny(lower, ['يضحك', 'سعيد', 'فرح', 'happy'])) return 'يظهر بتعبير سعيد وحضور مبهج';
  if (includesAny(lower, ['حزين', 'دموع', 'sad'])) return 'يظهر في لحظة هادئة ومؤثرة تحمل شعوراً عميقاً';
  if (includesAny(lower, ['غاضب', 'قوي', 'شرس', 'angry'])) return 'يظهر بطاقة قوية ونظرة حادة تسيطر على المشهد';
  return profile?.action || 'يظهر في وضعية واضحة تمنح الفكرة حضوراً وحركة';
}

function inferSetting(idea: string, profile: LocalSceneProfile | null) {
  const lower = idea.toLowerCase();
  if (includesAny(lower, ['غابة', 'أشجار', 'jungle', 'forest'])) return 'وسط غابة غنية بالأشجار والضوء المتسلل بين الأوراق';
  if (includesAny(lower, ['شلال', 'ماء', 'waterfall'])) return 'قرب شلال واسع تتطاير حوله قطرات ماء مضيئة';
  if (includesAny(lower, ['صحراء', 'رمل', 'desert'])) return 'وسط صحراء هادئة بضوء غروب دافئ وخطوط رمل ناعمة';
  if (includesAny(lower, ['مدينة', 'شارع', 'urban', 'city'])) return 'داخل مشهد حضري أنيق بإضاءات ليلية وانعكاسات عصرية';
  if (includesAny(lower, ['ليل', 'قمر', 'moon', 'night'])) return 'تحت ضوء قمر هادئ وظلال ناعمة تضيف عمقاً وغموضاً';
  return profile?.setting || 'في مشهد متكامل بخلفية مختارة بعناية تعزز معنى الفكرة';
}

function inferMood(idea: string, profile: LocalSceneProfile | null) {
  const lower = idea.toLowerCase();
  if (includesAny(lower, ['ملكي', 'فخم', 'luxury'])) return 'بإحساس فاخر وواثق';
  if (includesAny(lower, ['لطيف', 'ناعم', 'cute', 'soft'])) return 'بإحساس لطيف وناعم';
  if (includesAny(lower, ['مرعب', 'غامض', 'dark'])) return 'بطابع غامض وجذاب';
  if (includesAny(lower, ['مرح', 'سعيد', 'fun'])) return 'بروح مرحة وسهلة القراءة';
  return profile?.mood || 'بإحساس واضح ومميز';
}

function buildGenericScene(idea: string) {
  if (idea.length > 90) {
    return `${idea}، مع إبراز العنصر الرئيسي بوضوح وإضافة طبقات من الحركة والضوء والتفاصيل الصغيرة التي تجعل المشهد أكثر عمقاً وتميزاً`;
  }

  return `${idea} داخل مشهد بصري متكامل، يظهر فيه العنصر الرئيسي بوضوح وسط خلفية لها معنى، مع حركة خفيفة وإضاءة مدروسة وتفاصيل صغيرة تجعل الفكرة أكثر حضوراً`;
}

export function buildLocalEnhancedIdea(input: EnhanceIdeaInput): EnhanceIdeaResult {
  const idea = cleanIdea(input.idea);
  if (!idea) {
    return { enhancedIdea: '', source: 'local' };
  }

  const lower = idea.toLowerCase();
  const style = stripOptionLabel(input.style);
  const palette = stripOptionLabel(input.palette);
  const profile = getLocalProfile(idea);
  const subject = profile?.subject || idea;
  const action = inferAction(idea, profile);
  const setting = inferSetting(idea, profile);
  const mood = inferMood(idea, profile);
  const details = profile?.details || 'تظهر حوله تفاصيل ضوء وظلال ناعمة تضيف عمقاً دون ازدحام';
  const scene = profile
    ? `${subject} ${action} ${setting}، ${details}، ${mood}`
    : buildGenericScene(idea);
  const wantsCleanGraphic = /ملصق|sticker|هندسي|geometric|بسيط|minimal/i.test(style);
  const wantsRichColor = palette && !/تلقائي|auto/i.test(palette);
  const visualFinish = wantsCleanGraphic
    ? 'بتكوين نظيف وحواف واضحة وتفاصيل سهلة القراءة'
    : wantsRichColor
      ? 'بتناغم لوني غني وإضاءة تمنح المشهد عمقاً وحياة'
      : 'بتكوين بصري أنيق ومتوازن';
  const finish = includesAny(lower, ['نص', 'عبارة', 'كلمة', 'اسم'])
    ? 'مع الحفاظ على النص المطلوب كعنصر واضح دون إضافة كلمات جديدة'
    : 'مع تركيز واضح على العنصر الرئيسي وسهولة فهم الفكرة من النظرة الأولى';

  return {
    enhancedIdea: cleanIdea(`${scene}، ${visualFinish}، ${finish}.`).slice(0, 420).trim(),
    source: 'local',
  };
}

async function parseEnhanceResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return { error: await response.text() };
}

export async function enhanceDesignIdea(
  input: EnhanceIdeaInput,
  options: { allowLocalFallback?: boolean } = {}
): Promise<EnhanceIdeaResult> {
  const idea = cleanIdea(input.idea);
  if (!idea) {
    return { enhancedIdea: '', source: 'local' };
  }

  const abortController = new AbortController();
  const timeoutHandle = window.setTimeout(() => abortController.abort(), 24_000);

  try {
    const response = await fetch(`${API_BASE_URL}/enhance-idea`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, idea }),
      signal: abortController.signal,
    });

    const data = await parseEnhanceResponse(response);
    if (!response.ok || typeof data?.enhancedIdea !== 'string') {
      throw new Error(typeof data?.error === 'string' ? data.error : 'Idea enhancement API failed');
    }

    return {
      enhancedIdea: sanitizeEnhancedIdea(data.enhancedIdea, idea),
      source: 'ai',
      provider: typeof data?.provider === 'string' ? data.provider : null,
    };
  } catch (error) {
    if (options.allowLocalFallback === false) {
      throw error;
    }
    console.warn('Falling back to local idea enhancer:', error);
    return buildLocalEnhancedIdea(input);
  } finally {
    window.clearTimeout(timeoutHandle);
  }
}
