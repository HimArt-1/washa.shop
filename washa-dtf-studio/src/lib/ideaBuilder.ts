import type { GuidedIdeaBrief, GuidedIdeaDirection } from '../types';

export type GuidedIdeaQualityTier = 'needs-details' | 'ready' | 'strong';

export type GuidedIdeaQuality = {
  tier: GuidedIdeaQualityTier;
  score: number;
  label: string;
  message: string;
  suggestions: string[];
};

export type CreativeDirection = {
  id: GuidedIdeaDirection;
  label: string;
  eyebrow: string;
  description: string;
  promptFragment: string;
};

function clean(value: string) {
  return value.replace(/\s+/g, ' ').replace(/^[،,.\s]+|[،,.\s]+$/g, '').trim();
}

function cleanWithin(value: string, maxLength: number) {
  const normalized = clean(value);
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, maxLength).replace(/\s+\S*$/, '').trim();
}

export function createEmptyGuidedIdeaBrief(): GuidedIdeaBrief {
  return {
    subject: '',
    mood: '',
    meaning: '',
    wording: '',
    avoid: '',
    direction: '',
  };
}

export function buildCreativeDirections(brief: GuidedIdeaBrief): CreativeDirection[] {
  const subject = cleanWithin(brief.subject, 60) || 'الفكرة الرئيسية';
  const meaning = cleanWithin(brief.meaning, 46);

  return [
    {
      id: 'cinematic',
      label: 'سينمائي',
      eyebrow: 'مشهد وحركة',
      description: `${subject} داخل مشهد واسع بإضاءة درامية وحركة تقود العين${meaning ? ` نحو ${meaning}` : ' نحو لحظة مؤثرة'}.`,
      promptFragment: 'برؤية سينمائية عميقة، وإضاءة درامية، وحركة واضحة تقود العين',
    },
    {
      id: 'symbolic',
      label: 'رمزي',
      eyebrow: 'معنى واختزال',
      description: `${subject} كرمز مركزي مكثف، تختزل تفاصيله ${meaning || 'جوهر الفكرة'} بوضوح وأناقة.`,
      promptFragment: 'برؤية رمزية تختزل المعنى في علامة مركزية قوية وتفاصيل قليلة ذات دلالة',
    },
    {
      id: 'abstract',
      label: 'تجريدي',
      eyebrow: 'إيقاع وتكوين',
      description: `${subject} عبر إيقاع من الخطوط والكتل والمساحات، ليعبّر عن ${meaning || 'الفكرة'} بحرية بصرية.`,
      promptFragment: 'برؤية تجريدية تحول الفكرة إلى إيقاع من الخطوط والكتل والمساحات المتوازنة',
    },
  ];
}

export function buildGuidedIdeaPrompt(brief: GuidedIdeaBrief) {
  const subject = cleanWithin(brief.subject, 55);
  if (!subject) return '';

  const mood = cleanWithin(brief.mood, 35);
  const meaning = cleanWithin(brief.meaning, 55);
  const wording = cleanWithin(brief.wording, 38);
  const avoid = cleanWithin(brief.avoid, 24);
  const direction = buildCreativeDirections(brief).find((option) => option.id === brief.direction);
  const parts = [`تصميم يركز على ${subject}`];

  if (mood) parts.push(`بطابع ${mood}`);
  if (direction) parts.push(direction.promptFragment);
  if (meaning) parts.push(`ويعبّر عن ${meaning}`);
  if (wording) parts.push(`ويتضمن العبارة «${wording}» كعنصر بصري واضح ومقروء`);
  if (avoid) parts.push(`مع تجنب ${avoid}`);

  parts.push('بتكوين متوازن، عنصر رئيسي واضح، وتفاصيل مناسبة للظهور على القطعة');
  return `${parts.join('، ')}.`;
}

export function isGuidedIdeaStale(brief: GuidedIdeaBrief, promptSource?: string) {
  return buildGuidedIdeaPrompt(brief) !== (promptSource ?? '');
}

export function assessGuidedIdea(brief: GuidedIdeaBrief): GuidedIdeaQuality {
  const subject = clean(brief.subject);
  const mood = clean(brief.mood);
  const meaning = clean(brief.meaning);
  const wording = clean(brief.wording);
  const avoid = clean(brief.avoid);
  const direction = brief.direction || '';
  const suggestions: string[] = [];
  let score = 0;

  if (subject.length >= 3) score += 2;
  else suggestions.push('اكتب العنصر الرئيسي الذي تريد رؤيته');

  if (mood) score += 1;
  else suggestions.push('حدد الطابع أو الشعور المطلوب');

  if (meaning) score += 1;
  else suggestions.push('أضف المعنى أو الرسالة التي يحملها التصميم');

  if (direction) score += 1;
  else suggestions.push('اختر اتجاهًا إبداعيًا للفكرة');

  if (wording || avoid) score += 1;
  else suggestions.push('أضف نصًا اختياريًا أو شيئًا تريد تجنبه');

  if (!subject || score < 3) {
    return {
      tier: 'needs-details',
      score,
      label: 'تحتاج تفاصيل',
      message: 'أكمل الحقول الأساسية لنحوّل الفكرة إلى وصف واضح.',
      suggestions: suggestions.slice(0, 2),
    };
  }

  if (score < 5) {
    return {
      tier: 'ready',
      score,
      label: 'جيدة للتوليد',
      message: 'الفكرة واضحة، واختر اتجاهها الإبداعي أو أضف معنى للحصول على نتيجة أدق.',
      suggestions: suggestions.slice(0, 1),
    };
  }

  return {
    tier: 'strong',
    score,
    label: 'واضحة ومتكاملة',
    message: 'العنصر والطابع والاتجاه الإبداعي والرسالة محددة بوضوح.',
    suggestions: [],
  };
}
