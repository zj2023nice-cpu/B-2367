const PROVINCE_RE = /^([\u4e00-\u9fa5]{2,4}(?:省|市|自治区|特别行政区))/;

export function extractRegion(address: string): string {
  if (!address || typeof address !== 'string') return '';
  const match = address.match(PROVINCE_RE);
  if (match) return match[1];
  return address.substring(0, 2);
}

export function countDistinctRegions(addresses: string[]): number {
  const regions = new Set<string>();
  for (const addr of addresses) {
    const region = extractRegion(addr);
    if (region) regions.add(region);
  }
  return regions.size;
}
