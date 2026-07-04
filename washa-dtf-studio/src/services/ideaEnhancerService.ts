const API_BASE_URL = '/api/washa-dtf-studio';

type EnhanceIdeaInput = {
  idea: string;
  garmentType?: string | null;
  style?: string | null;
  technique?: string | null;
  palette?: string | null;
};

export type EnhanceIdeaSource = 'ai' | 'local';

export type EnhanceIdeaResult = {
  enhancedIdea: string;
  source: EnhanceIdeaSource;
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

  if (!cleaned || INTERNAL_OUTPUT_PATTERN.test(cleaned)) {
    return buildLocalEnhancedIdea({ idea: fallback }).enhancedIdea;
  }

  return cleaned.slice(0, 420).trim();
}

function includesAny(value: string, words: string[]) {
  return words.some((word) => value.includes(word));
}

export function buildLocalEnhancedIdea(input: EnhanceIdeaInput): EnhanceIdeaResult {
  const idea = cleanIdea(input.idea);
  if (!idea) {
    return { enhancedIdea: '', source: 'local' };
  }

  const lower = idea.toLowerCase();
  const style = stripOptionLabel(input.style);
  const palette = stripOptionLabel(input.palette);
  const stylePhrase = style ? `بأسلوب ${style}` : 'بأسلوب بصري أنيق';
  const palettePhrase = palette && !/تلقائي|auto/i.test(palette) ? ` ولمسات لونية مستوحاة من ${palette}` : '';

  let scene = 'في مشهد غني وواضح، مع خلفية مناسبة للفكرة وتفاصيل تمنحها حياة وحركة بصرية جذابة';

  if (includesAny(lower, ['ديناصور', 'dinosaur'])) {
    scene = includesAny(lower, ['يرقص', 'رقص', 'dance'])
      ? 'ديناصور مرح يرقص وسط غابة كثيفة مليئة بالأشجار، وخلفه شلال كبير يلمع تحت ضوء ناعم، بتعبير سعيد وحركة مليئة بالطاقة'
      : 'ديناصور قوي وسط غابة استوائية واسعة، تحيط به أوراق ضخمة وضباب خفيف وصخور قديمة تمنح المشهد إحساساً بالمغامرة';
  } else if (includesAny(lower, ['ذئب', 'wolf'])) {
    scene = 'ذئب واثق يقف تحت ضوء قمر هادئ، تحيط به جبال بعيدة ونسيم ليلي، بنظرة حادة وتفاصيل تمنح التصميم قوة وهدوءاً';
  } else if (includesAny(lower, ['أسد', 'lion'])) {
    scene = 'أسد مهيب بنظرة ملكية وسط هالة ضوء دافئة، مع تفاصيل شعر قوية وتكوين يمنح التصميم حضوراً فاخراً وواضحاً';
  } else if (includesAny(lower, ['تنين', 'dragon'])) {
    scene = 'تنين أسطوري يلتف وسط شرارات ضوء ودخان خفيف، بأجنحة واسعة وحركة درامية تمنح الفكرة طاقة وخيالاً';
  } else if (includesAny(lower, ['فراشة', 'butterfly'])) {
    scene = 'فراشة حالمة بأجنحة واسعة مليئة بتفاصيل ناعمة، تحيط بها نجوم صغيرة وضوء هادئ يمنح التصميم إحساساً بالرقة والانطلاق';
  } else if (includesAny(lower, ['قهوة', 'coffee'])) {
    scene = 'كوب قهوة دافئ يتصاعد منه بخار ناعم، محاط بتفاصيل بسيطة وهادئة تمنح الفكرة شعوراً بالراحة والذوق';
  } else if (includesAny(lower, ['بحر', 'موج', 'سمك', 'sea', 'ocean'])) {
    scene = 'مشهد بحري عميق تتداخل فيه الأمواج والضوء المنعكس، مع حركة ناعمة وتفاصيل منعشة تمنح الفكرة حياة وعمقاً';
  } else if (includesAny(lower, ['فضاء', 'كوكب', 'قمر', 'نجوم', 'space'])) {
    scene = 'مشهد فضائي واسع تتناثر فيه النجوم والكواكب البعيدة، مع إضاءة حالمة وشعور بالمغامرة والدهشة';
  } else if (includesAny(lower, ['نخلة', 'palm'])) {
    scene = 'نخلة أنيقة بتكوين متوازن، تحيط بها خطوط ضوء دافئة وتفاصيل مستوحاة من الهدوء والهوية العربية المعاصرة';
  } else if (idea.length > 80) {
    scene = `${idea}، مع ترتيب أوضح للتفاصيل وإبراز العنصر الرئيسي بطريقة متوازنة تمنح الفكرة حضوراً بصرياً أقوى`;
  } else {
    scene = `${idea} في مشهد متكامل وواضح، مع خلفية مناسبة وتفاصيل دقيقة تضيف عمقاً وشخصية وحركة للفكرة`;
  }

  return {
    enhancedIdea: cleanIdea(`${scene}، ${stylePhrase}${palettePhrase}.`).slice(0, 420).trim(),
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

export async function enhanceDesignIdea(input: EnhanceIdeaInput): Promise<EnhanceIdeaResult> {
  const idea = cleanIdea(input.idea);
  if (!idea) {
    return { enhancedIdea: '', source: 'local' };
  }

  const abortController = new AbortController();
  const timeoutHandle = window.setTimeout(() => abortController.abort(), 14_000);

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
    };
  } catch (error) {
    console.warn('Falling back to local idea enhancer:', error);
    return buildLocalEnhancedIdea(input);
  } finally {
    window.clearTimeout(timeoutHandle);
  }
}
