import Taro from '@tarojs/taro'

const STORAGE_KEY = 'SPECIALTY_FAVORITES'
const STORE_VERSION = 1

export interface FavoriteRecord {
	id: number
	favoritedAt: number
	visitedAt: number
	visitCount: number
}

interface FavoriteStoreData {
	version: number
	records: Record<string, FavoriteRecord>
}

function loadStore(): FavoriteStoreData {
	try {
		const raw = Taro.getStorageSync(STORAGE_KEY)
		if (!raw) return createEmptyStore()
		const parsed = JSON.parse(raw)
		if (!isValidStore(parsed)) return createEmptyStore()
		return migrateStore(parsed)
	} catch {
		return createEmptyStore()
	}
}

function createEmptyStore(): FavoriteStoreData {
	return { version: STORE_VERSION, records: {} }
}

function isValidStore(data: any): data is FavoriteStoreData {
	return (
		data &&
		typeof data === 'object' &&
		typeof data.version === 'number' &&
		typeof data.records === 'object' &&
		data.records !== null
	)
}

function migrateStore(data: FavoriteStoreData): FavoriteStoreData {
	if (data.version === STORE_VERSION) return data
	return { version: STORE_VERSION, records: data.records || {} }
}

function saveStore(data: FavoriteStoreData): void {
	try {
		Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data))
	} catch {
		// storage full or unavailable
	}
}

function isValidRecord(entry: any): entry is FavoriteRecord {
	return (
		entry &&
		typeof entry === 'object' &&
		typeof entry.id === 'number' &&
		Number.isFinite(entry.id) &&
		typeof entry.favoritedAt === 'number' &&
		Number.isFinite(entry.favoritedAt) &&
		typeof entry.visitedAt === 'number' &&
		Number.isFinite(entry.visitedAt) &&
		typeof entry.visitCount === 'number' &&
		Number.isFinite(entry.visitCount)
	)
}

export function isFavorite(id: number): boolean {
	const store = loadStore()
	const record = store.records[String(id)]
	return isValidRecord(record)
}

export function addFavorite(id: number): void {
	const store = loadStore()
	const key = String(id)
	if (isValidRecord(store.records[key])) return
	store.records[key] = {
		id,
		favoritedAt: Date.now(),
		visitedAt: Date.now(),
		visitCount: 1,
	}
	saveStore(store)
}

export function removeFavorite(id: number): void {
	const store = loadStore()
	const key = String(id)
	delete store.records[key]
	saveStore(store)
}

export function toggleFavorite(id: number): boolean {
	if (isFavorite(id)) {
		removeFavorite(id)
		return false
	}
	addFavorite(id)
	return true
}

export function getFavoriteIds(): Set<number> {
	const store = loadStore()
	const ids = new Set<number>()
	for (const val of Object.values(store.records)) {
		if (isValidRecord(val)) {
			ids.add(val.id)
		}
	}
	return ids
}

export function getFavoriteCount(): number {
	const store = loadStore()
	let count = 0
	for (const val of Object.values(store.records)) {
		if (isValidRecord(val)) count++
	}
	return count
}

export function recordVisit(id: number): void {
	const store = loadStore()
	const key = String(id)
	const record = store.records[key]
	if (!isValidRecord(record)) return
	record.visitedAt = Date.now()
	record.visitCount += 1
	saveStore(store)
}

export function getRecentFavorites(limit: number): FavoriteRecord[] {
	const store = loadStore()
	return Object.values(store.records)
		.filter(isValidRecord)
		.sort((a, b) => b.favoritedAt - a.favoritedAt)
		.slice(0, limit)
}

export function getTopVisited(limit: number): FavoriteRecord[] {
	const store = loadStore()
	return Object.values(store.records)
		.filter(isValidRecord)
		.sort((a, b) => b.visitCount - a.visitCount)
		.slice(0, limit)
}

export function getRecentlyVisited(limit: number): FavoriteRecord[] {
	const store = loadStore()
	return Object.values(store.records)
		.filter(isValidRecord)
		.sort((a, b) => b.visitedAt - a.visitedAt)
		.slice(0, limit)
}
