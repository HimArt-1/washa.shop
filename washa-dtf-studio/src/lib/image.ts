type ResizeOptions = {
  maxDimension: number;
  quality?: number;
  outputMimeType?: string;
};

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('تعذر قراءة الصورة'));
    image.src = dataUrl;
  });
}

function calculateSize(width: number, height: number, maxDimension: number) {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  const ratio = width / height;
  if (ratio >= 1) {
    return {
      width: maxDimension,
      height: Math.round(maxDimension / ratio),
    };
  }

  return {
    width: Math.round(maxDimension * ratio),
    height: maxDimension,
  };
}

export async function resizeDataUrl(dataUrl: string, options: ResizeOptions) {
  const image = await loadImage(dataUrl);
  const { width, height } = calculateSize(image.width, image.height, options.maxDimension);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('تعذر تجهيز أداة معالجة الصورة');
  }

  context.drawImage(image, 0, 0, width, height);

  const outputMimeType = options.outputMimeType || 'image/jpeg';
  const quality = typeof options.quality === 'number' ? options.quality : 0.82;
  const resizedDataUrl = canvas.toDataURL(outputMimeType, quality);

  return {
    dataUrl: resizedDataUrl,
    mimeType: outputMimeType,
  };
}

export function stripDataUrlPrefix(dataUrl: string) {
  return dataUrl.split(',')[1] || '';
}

/** First comma separates metadata from payload; do not use split(',') on the full string (payload edge cases). */
export function parseDataUrlParts(dataUrl: string): { mimeType: string; base64: string } | null {
  if (!dataUrl.startsWith('data:')) return null;
  const comma = dataUrl.indexOf(',');
  if (comma === -1) return null;
  const header = dataUrl.slice(0, comma);
  const base64 = dataUrl.slice(comma + 1);
  if (!base64) return null;
  const mimeMatch = header.match(/^data:([^;,]+)/);
  const mimeType = mimeMatch ? mimeMatch[1].trim() : 'image/png';
  return { mimeType, base64 };
}
