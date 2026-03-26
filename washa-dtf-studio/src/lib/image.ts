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
