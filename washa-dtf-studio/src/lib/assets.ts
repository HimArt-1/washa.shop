export function studioAsset(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}

export function siteAsset(path: string) {
  return `/${path.replace(/^\/+/, '')}`;
}
