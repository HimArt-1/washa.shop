export function studioAsset(path: string) {
  if (!path) return '';
  // Check if it's already an absolute URL or data URI
  if (/^(http|https|data):/.test(path)) {
    return path;
  }
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}

export function siteAsset(path: string) {
  if (!path) return '';
  // Check if it's already an absolute URL or data URI
  if (/^(http|https|data):/.test(path)) {
    return path;
  }
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}

