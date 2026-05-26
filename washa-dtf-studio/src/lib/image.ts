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

function getDataUrlMimeType(dataUrl: string, fallback: string) {
  const match = dataUrl.match(/^data:([^;,]+)/);
  return match ? match[1].trim() : fallback;
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
    mimeType: getDataUrlMimeType(resizedDataUrl, outputMimeType),
  };
}

export async function makeLightEdgeBackgroundTransparent(dataUrl: string) {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('تعذر تجهيز أداة معالجة الصورة');
  }

  context.drawImage(image, 0, 0);

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const { data, width, height } = imageData;
  const visited = new Uint8Array(width * height);
  const stack: number[] = [];

  const isLightBackground = (index: number) => {
    const offset = index * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const a = data[offset + 3];
    return a > 0 && r >= 238 && g >= 238 && b >= 238 && Math.max(r, g, b) - Math.min(r, g, b) <= 16;
  };

  const pushIfBackground = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (visited[index] || !isLightBackground(index)) return;
    visited[index] = 1;
    stack.push(index);
  };

  for (let x = 0; x < width; x += 1) {
    pushIfBackground(x, 0);
    pushIfBackground(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    pushIfBackground(0, y);
    pushIfBackground(width - 1, y);
  }

  while (stack.length > 0) {
    const index = stack.pop()!;
    const offset = index * 4;
    data[offset + 3] = 0;

    const x = index % width;
    const y = Math.floor(index / width);
    pushIfBackground(x + 1, y);
    pushIfBackground(x - 1, y);
    pushIfBackground(x, y + 1);
    pushIfBackground(x, y - 1);
  }

  context.putImageData(imageData, 0, 0);

  const outputMimeType = getDataUrlMimeType(dataUrl, 'image/png') === 'image/webp' ? 'image/webp' : 'image/png';
  const transparentDataUrl = canvas.toDataURL(outputMimeType, 0.92);

  return {
    dataUrl: transparentDataUrl,
    mimeType: getDataUrlMimeType(transparentDataUrl, outputMimeType),
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
