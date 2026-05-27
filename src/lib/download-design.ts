// ═══════════════════════════════════════════════════════════
//  وشّى | WASHA — تحميل التصميم (PNG / PDF)
//  عميل فقط — رسم الصورة وتحميلها
// ═══════════════════════════════════════════════════════════

/**
 * تحميل صورة التصميم كـ PNG بجودة عالية (للطباعة).
 * يمكن استبداله لاحقاً بتوليد PDF من السيرفر.
 */
export async function downloadDesignAsPng(imageUrl: string, filename = "wusha-design") {
  const img = new Image();
  img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("فشل تحميل الصورة"));
    img.src = imageUrl;
  });

  const dpi = 300;
  const scale = dpi / 96;
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png", 1.0));
  if (!blob) throw new Error("فشل إنشاء الملف");

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}-${Date.now()}.png`;
  a.click();
  URL.revokeObjectURL(a.href);
}

type TransparentPngOptions = {
  targetLongEdge?: number;
  maxLongEdge?: number;
  removeEdgeBackground?: boolean;
};

function sanitizeDownloadName(filename: string) {
  return filename
    .trim()
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "wusha-dtf";
}

function loadImageForCanvas(imageUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("فشل تحميل ملف DTF للتصدير."));
    img.src = imageUrl;
  });
}

function isLikelyBackgroundPixel(data: Uint8ClampedArray, offset: number) {
  const alpha = data[offset + 3];
  if (alpha <= 8) return true;

  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const spread = Math.max(Math.abs(red - green), Math.abs(red - blue), Math.abs(green - blue));

  if (red >= 245 && green >= 245 && blue >= 245) return true;
  return spread <= 10 && red >= 165 && red <= 245 && green >= 165 && green <= 245 && blue >= 165 && blue <= 245;
}

function removeConnectedEdgeBackground(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;

  const { width, height } = canvas;
  if (!width || !height) return;

  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch {
    return;
  }

  const { data } = imageData;
  const totalPixels = width * height;
  const visited = new Uint8Array(totalPixels);
  const stack = new Int32Array(totalPixels);
  let stackSize = 0;

  const enqueue = (pixelIndex: number) => {
    if (pixelIndex < 0 || pixelIndex >= totalPixels || visited[pixelIndex]) return;

    const offset = pixelIndex * 4;
    if (!isLikelyBackgroundPixel(data, offset)) return;

    visited[pixelIndex] = 1;
    stack[stackSize] = pixelIndex;
    stackSize += 1;
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }

  for (let y = 1; y < height - 1; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (stackSize > 0) {
    stackSize -= 1;
    const pixelIndex = stack[stackSize];
    const offset = pixelIndex * 4;
    data[offset + 3] = 0;

    const x = pixelIndex % width;
    if (x > 0) enqueue(pixelIndex - 1);
    if (x < width - 1) enqueue(pixelIndex + 1);
    if (pixelIndex >= width) enqueue(pixelIndex - width);
    if (pixelIndex < totalPixels - width) enqueue(pixelIndex + width);
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * تصدير ملف DTF كـ PNG شفاف عالي الدقة.
 * لا نملأ الخلفية هنا حتى يبقى الملف جاهزاً للطباعة على DTF.
 */
export async function downloadTransparentDesignAsPng(
  imageUrl: string,
  filename = "wusha-dtf",
  options: TransparentPngOptions = {},
) {
  const img = await loadImageForCanvas(imageUrl);

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = img.naturalWidth;
  sourceCanvas.height = img.naturalHeight;
  const sourceCtx = sourceCanvas.getContext("2d");
  if (!sourceCtx) throw new Error("المتصفح لا يدعم تصدير Canvas.");

  sourceCtx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
  sourceCtx.drawImage(img, 0, 0);

  if (options.removeEdgeBackground !== false) {
    removeConnectedEdgeBackground(sourceCanvas);
  }

  const longEdge = Math.max(sourceCanvas.width, sourceCanvas.height);
  const targetLongEdge = options.targetLongEdge ?? 4096;
  const maxLongEdge = options.maxLongEdge ?? 8192;
  const scale = Math.min(maxLongEdge / longEdge, Math.max(1, targetLongEdge / longEdge));
  const outputWidth = Math.max(1, Math.round(sourceCanvas.width * scale));
  const outputHeight = Math.max(1, Math.round(sourceCanvas.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("المتصفح لا يدعم تصدير Canvas.");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, outputWidth, outputHeight);
  ctx.drawImage(sourceCanvas, 0, 0, outputWidth, outputHeight);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("فشل إنشاء ملف PNG الشفاف.");

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${sanitizeDownloadName(filename)}-${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * تحميل كـ PDF (صفحة واحدة، صورة فقط — جاهز للطباعة).
 * إن jsPDF غير متوفر نحمّل PNG عالي الجودة.
 */
export async function downloadDesignAsPdf(imageUrl: string, filename = "wusha-design") {
  const img = new Image();
  img.crossOrigin = "anonymous";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("فشل تحميل الصورة"));
    img.src = imageUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    await downloadDesignAsPng(imageUrl, filename);
    return;
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  const dataUrl = canvas.toDataURL("image/png");

  try {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const ratio = Math.min(pageW / (canvas.width * 0.26), pageH / (canvas.height * 0.26)) * 0.95;
    const w = canvas.width * 0.26 * ratio;
    const h = canvas.height * 0.26 * ratio;
    const x = (pageW - w) / 2;
    const y = (pageH - h) / 2;

    doc.addImage(dataUrl, "PNG", x, y, w, h);
    doc.save(`${filename}-${Date.now()}.pdf`);
  } catch {
    await downloadDesignAsPng(imageUrl, filename);
  }
}
