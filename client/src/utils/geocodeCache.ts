import Taro from '@tarojs/taro'

const STORAGE_KEY = 'GEOCODE_LRU_CACHE'
const MAX_SIZE = 20

export interface GeocodeCacheEntry {
	originalAddress: string
	normalizedAddress: string
	formattedAddress: string
	lat: number
	lng: number
	updatedAt: number
}

function normalizeAddress(address: string): string {
	return address.trim().replace(/\s+/g, ' ').toLowerCase()
}

function isValidEntry(entry: any): entry is GeocodeCacheEntry {
	return (
		entry &&
		typeof entry === 'object' &&
		typeof entry.normalizedAddress === 'string' &&
		typeof entry.originalAddress === 'string' &&
		typeof entry.formattedAddress === 'string' &&
		typeof entry.lat === 'number' &&
		Number.isFinite(entry.lat) &&
		typeof entry.lng === 'number' &&
		Number.isFinite(entry.lng) &&
		typeof entry.updatedAt === 'number' &&
		Number.isFinite(entry.updatedAt)
	)
}

function loadCache(): Map<string, GeocodeCacheEntry> {
	try {
		const raw = Taro.getStorageSync(STORAGE_KEY)
		if (!raw) return new Map()
		const parsed = JSON.parse(raw)
		if (!Array.isArray(parsed)) return new Map()
		const map = new Map<string, GeocodeCacheEntry>()
		for (const entry of parsed) {
			if (isValidEntry(entry)) {
				if (!map.has(entry.normalizedAddress)) {
					map.set(entry.normalizedAddress, entry)
				}
			}
		}
		return map
	} catch {
		return new Map()
	}
}

function saveCache(map: Map<string, GeocodeCacheEntry>): void {
	try {
		const arr = Array.from(map.values())
		Taro.setStorageSync(STORAGE_KEY, JSON.stringify(arr))
	} catch {
		// storage full or corrupted, silently discard
	}
}

export function getFromCache(address: string): GeocodeCacheEntry | null {
	if (!address || !address.trim()) return null
	const normalized = normalizeAddress(address)
	const map = loadCache()
	const entry = map.get(normalized)
	if (!entry) return null
	map.delete(normalized)
	map.set(normalized, { ...entry, updatedAt: Date.now() })
	saveCache(map)
	return entry
}

export function setToCache(
	address: string,
	result: { formattedAddress: string; lat: number; lng: number },
): void {
	if (!address || !address.trim()) return
	if (!Number.isFinite(result.lat) || !Number.isFinite(result.lng)) return
	const normalized = normalizeAddress(address)
	const map = loadCache()
	if (map.has(normalized)) {
		map.delete(normalized)
	}
	if (map.size >= MAX_SIZE) {
		const firstKey = map.keys().next().value
		if (firstKey !== undefined) map.delete(firstKey)
	}
	const entry: GeocodeCacheEntry = {
		originalAddress: address.trim(),
		normalizedAddress: normalized,
		formattedAddress: result.formattedAddress || '',
		lat: result.lat,
		lng: result.lng,
		updatedAt: Date.now(),
	}
	map.set(normalized, entry)
	saveCache(map)
}

export function invalidateCache(address: string): void {
	if (!address || !address.trim()) return
	const normalized = normalizeAddress(address)
	const map = loadCache()
	if (map.has(normalized)) {
		map.delete(normalized)
		saveCache(map)
	}
}

export function invalidateCacheByAddresses(addresses: string[]): void {
	if (!addresses || !addresses.length) return
	const map = loadCache()
	let changed = false
	for (const addr of addresses) {
		if (!addr || !addr.trim()) continue
		const normalized = normalizeAddress(addr)
		if (map.has(normalized)) {
			map.delete(normalized)
			changed = true
		}
	}
	if (changed) saveCache(map)
}

export function clearCache(): void {
	try {
		Taro.removeStorageSync(STORAGE_KEY)
	} catch {
		// ignore
	}
}
