import Taro from '@tarojs/taro'

const STORAGE_KEY = 'RECENT_SPECIALTY_VISITS'
const STORE_VERSION = 1
const MAX_RECORDS = 10

export interface RecentVisitRecord {
	id: number
	visitedAt: number
}

interface RecentVisitStoreData {
	version: number
	records: RecentVisitRecord[]
}

function loadStore(): RecentVisitStoreData {
	try {
		const raw = Taro.getStorageSync(STORAGE_KEY)
		if (!raw) return createEmptyStore()
		const parsed = JSON.parse(raw)
		if (!isValidStore(parsed)) return createEmptyStore()
		return parsed.version === STORE_VERSION ? parsed : createEmptyStore()
	} catch {
		return createEmptyStore()
	}
}

function createEmptyStore(): RecentVisitStoreData {
	return { version: STORE_VERSION, records: [] }
}

function isValidStore(data: any): data is RecentVisitStoreData {
	return (
		data &&
		typeof data === 'object' &&
		typeof data.version === 'number' &&
		Array.isArray(data.records)
	)
}

function isValidRecord(entry: any): entry is RecentVisitRecord {
	return (
		entry &&
		typeof entry === 'object' &&
		typeof entry.id === 'number' &&
		Number.isFinite(entry.id) &&
		typeof entry.visitedAt === 'number' &&
		Number.isFinite(entry.visitedAt)
	)
}

function saveStore(data: RecentVisitStoreData): void {
	try {
		Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data))
	} catch {
		// storage full or unavailable
	}
}

export function recordRecentVisit(id: number): void {
	const store = loadStore()
	const idx = store.records.findIndex((r) => r.id === id)
	if (idx >= 0) {
		store.records.splice(idx, 1)
	}
	store.records.unshift({ id, visitedAt: Date.now() })
	if (store.records.length > MAX_RECORDS) {
		store.records = store.records.slice(0, MAX_RECORDS)
	}
	saveStore(store)
}

export function getRecentVisitIds(limit: number): number[] {
	const store = loadStore()
	return store.records
		.filter(isValidRecord)
		.sort((a, b) => b.visitedAt - a.visitedAt)
		.slice(0, limit)
		.map((r) => r.id)
}

export function pruneRecentVisitIds(validIds: number[]): void {
	const store = loadStore()
	const validSet = new Set(validIds)
	store.records = store.records.filter((r) => validSet.has(r.id))
	saveStore(store)
}
