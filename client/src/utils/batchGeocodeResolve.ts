export interface MarkerItem {
	id: number
	address: string
	lat: number
	lng: number
	formattedAddress: string
}

export interface FailedItem {
	address: string
	error: string
}

export interface BatchGeocodeItem {
	address: string
	lat?: number
	lng?: number
	formattedAddress?: string
	error?: string
}

export interface CacheEntry {
	lat: number
	lng: number
	formattedAddress: string
}

export function normalizeAddress(address: string): string {
	return address.trim().replace(/\s+/g, ' ').toLowerCase()
}

export function parseAddressesParam(raw: string): string[] | null {
	if (!raw) return null
	try {
		const parsed = JSON.parse(decodeURIComponent(raw))
		if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
			return parsed.filter((s: string) => s && s.trim())
		}
	} catch {}
	return null
}

export function deduplicateAddresses(addresses: string[]): string[] {
	const seen = new Set<string>()
	const unique: string[] = []
	for (const addr of addresses) {
		const norm = normalizeAddress(addr)
		if (seen.has(norm)) continue
		seen.add(norm)
		unique.push(addr)
	}
	return unique
}

export function splitCachedUncached(
	addresses: string[],
	cacheLookup: (addr: string) => CacheEntry | null,
): { cachedMarkers: MarkerItem[]; uncachedAddresses: string[] } {
	const cachedMarkers: MarkerItem[] = []
	const uncachedAddresses: string[] = []

	for (const addr of addresses) {
		const cached = cacheLookup(addr)
		if (cached && Number.isFinite(cached.lat) && Number.isFinite(cached.lng)) {
			cachedMarkers.push({
				id: cachedMarkers.length + 1,
				address: addr,
				lat: cached.lat,
				lng: cached.lng,
				formattedAddress: cached.formattedAddress,
			})
		} else {
			uncachedAddresses.push(addr)
		}
	}

	return { cachedMarkers, uncachedAddresses }
}

export function mergeBatchResults(
	cachedMarkers: MarkerItem[],
	batchResults: BatchGeocodeItem[],
): { markers: MarkerItem[]; failedList: FailedItem[] } {
	const newMarkers: MarkerItem[] = []
	const newFailed: FailedItem[] = []

	for (const item of batchResults) {
		if (
			item.lat != null &&
			item.lng != null &&
			Number.isFinite(item.lat) &&
			Number.isFinite(item.lng)
		) {
			newMarkers.push({
				id: cachedMarkers.length + newMarkers.length + 1,
				address: item.address,
				lat: item.lat,
				lng: item.lng,
				formattedAddress: item.formattedAddress || item.address,
			})
		} else {
			newFailed.push({
				address: item.address,
				error: item.error || '未找到该地址',
			})
		}
	}

	return {
		markers: [...cachedMarkers, ...newMarkers],
		failedList: newFailed,
	}
}
