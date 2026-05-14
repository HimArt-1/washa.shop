export function studioAsset(path: string) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}

export function siteAsset(path: string) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}

