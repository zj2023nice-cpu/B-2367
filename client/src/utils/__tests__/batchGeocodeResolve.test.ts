import { describe, it, expect } from 'vitest'
import {
	normalizeAddress,
	parseAddressesParam,
	deduplicateAddresses,
	splitCachedUncached,
	mergeBatchResults,
} from '../batchGeocodeResolve'
import type { BatchGeocodeItem, CacheEntry } from '../batchGeocodeResolve'

describe('normalizeAddress', () => {
	it('trims leading/trailing whitespace', () => {
		expect(normalizeAddress('  北京  ')).toBe('北京')
	})

	it('collapses internal whitespace', () => {
		expect(normalizeAddress('北  京')).toBe('北 京')
	})

	it('lowercases for case-insensitive dedup', () => {
		expect(normalizeAddress('Beijing')).toBe('beijing')
	})
})

describe('parseAddressesParam', () => {
	it('parses valid JSON address array', () => {
		const raw = encodeURIComponent(JSON.stringify(['北京', '上海']))
		const result = parseAddressesParam(raw)
		expect(result).toEqual(['北京', '上海'])
	})

	it('returns null for empty string', () => {
		expect(parseAddressesParam('')).toBeNull()
	})

	it('returns null for non-array JSON', () => {
		expect(parseAddressesParam(encodeURIComponent('"hello"'))).toBeNull()
	})

	it('filters out empty strings from array', () => {
		const raw = encodeURIComponent(JSON.stringify(['北京', '', '  ', '上海']))
		const result = parseAddressesParam(raw)
		expect(result).toEqual(['北京', '上海'])
	})
})

describe('deduplicateAddresses', () => {
	it('removes exact duplicates', () => {
		expect(deduplicateAddresses(['北京', '北京', '上海'])).toEqual(['北京', '上海'])
	})

	it('removes duplicates that differ only in leading/trailing whitespace', () => {
		expect(deduplicateAddresses(['北京', '  北京  '])).toEqual(['北京'])
	})

	it('preserves first occurrence order', () => {
		expect(deduplicateAddresses(['上海', '北京', '上海', '北京'])).toEqual(['上海', '北京'])
	})

	it('returns empty for empty input', () => {
		expect(deduplicateAddresses([])).toEqual([])
	})
})

describe('splitCachedUncached', () => {
	it('splits cached from uncached addresses', () => {
		const cache = new Map<string, CacheEntry>([
			['北京', { lat: 39.9, lng: 116.4, formattedAddress: '北京市' }],
		])
		const lookup = (addr: string) => cache.get(addr) ?? null

		const { cachedMarkers, uncachedAddresses } = splitCachedUncached(
			['北京', '上海'],
			lookup,
		)

		expect(cachedMarkers.length).toBe(1)
		expect(cachedMarkers[0].address).toBe('北京')
		expect(cachedMarkers[0].lat).toBe(39.9)
		expect(uncachedAddresses).toEqual(['上海'])
	})

	it('returns all cached when everything is in cache', () => {
		const cache = new Map<string, CacheEntry>([
			['北京', { lat: 39.9, lng: 116.4, formattedAddress: '北京市' }],
			['上海', { lat: 31.23, lng: 121.47, formattedAddress: '上海市' }],
		])
		const lookup = (addr: string) => cache.get(addr) ?? null

		const { cachedMarkers, uncachedAddresses } = splitCachedUncached(
			['北京', '上海'],
			lookup,
		)

		expect(cachedMarkers.length).toBe(2)
		expect(uncachedAddresses).toEqual([])
	})

	it('assigns sequential ids starting from 1', () => {
		const cache = new Map<string, CacheEntry>([
			['北京', { lat: 39.9, lng: 116.4, formattedAddress: '北京市' }],
		])
		const lookup = (addr: string) => cache.get(addr) ?? null

		const { cachedMarkers } = splitCachedUncached(['北京'], lookup)
		expect(cachedMarkers[0].id).toBe(1)
	})
})

describe('mergeBatchResults', () => {
	it('merges cached markers with successful batch results', () => {
		const cachedMarkers = [
			{ id: 1, address: '北京', lat: 39.9, lng: 116.4, formattedAddress: '北京市' },
		]
		const batchResults: BatchGeocodeItem[] = [
			{ address: '上海', lat: 31.23, lng: 121.47, formattedAddress: '上海市' },
		]

		const { markers, failedList } = mergeBatchResults(cachedMarkers, batchResults)

		expect(markers.length).toBe(2)
		expect(markers[0].id).toBe(1)
		expect(markers[1].id).toBe(2)
		expect(failedList).toEqual([])
	})

	it('collects failed items separately', () => {
		const cachedMarkers = [
			{ id: 1, address: '北京', lat: 39.9, lng: 116.4, formattedAddress: '北京市' },
		]
		const batchResults: BatchGeocodeItem[] = [
			{ address: '不存在的地方', error: '未找到该地址' },
		]

		const { markers, failedList } = mergeBatchResults(cachedMarkers, batchResults)

		expect(markers.length).toBe(1)
		expect(failedList.length).toBe(1)
		expect(failedList[0].address).toBe('不存在的地方')
	})

	it('handles empty cached markers', () => {
		const batchResults: BatchGeocodeItem[] = [
			{ address: '上海', lat: 31.23, lng: 121.47, formattedAddress: '上海市' },
		]

		const { markers } = mergeBatchResults([], batchResults)
		expect(markers.length).toBe(1)
		expect(markers[0].id).toBe(1)
	})
})

describe('batch geocode end-to-end: duplicate addresses with mixed cache', () => {
	const makeCacheLookup = (cache: Map<string, CacheEntry>) =>
		(addr: string) => {
			const norm = normalizeAddress(addr)
			for (const [key, val] of cache) {
				if (normalizeAddress(key) === norm) return val
			}
			return null
		}

	it('duplicate address: one cached + one uncached → only one marker', () => {
		const input = ['北京', '  北京  ', '上海']
		const cache = new Map<string, CacheEntry>([
			['北京', { lat: 39.9, lng: 116.4, formattedAddress: '北京市' }],
		])

		const unique = deduplicateAddresses(input)
		expect(unique).toEqual(['北京', '上海'])

		const { cachedMarkers, uncachedAddresses } = splitCachedUncached(
			unique,
			makeCacheLookup(cache),
		)

		expect(cachedMarkers.length).toBe(1)
		expect(cachedMarkers[0].address).toBe('北京')
		expect(uncachedAddresses).toEqual(['上海'])

		const batchResults: BatchGeocodeItem[] = [
			{ address: '上海', lat: 31.23, lng: 121.47, formattedAddress: '上海市' },
		]
		const { markers, failedList } = mergeBatchResults(cachedMarkers, batchResults)

		expect(markers.length).toBe(2)
		expect(failedList.length).toBe(0)
	})

	it('duplicate address where first is uncached and second is cached → only one marker', () => {
		const input = ['上海', '北京', '  上海  ']
		const cache = new Map<string, CacheEntry>([
			['北京', { lat: 39.9, lng: 116.4, formattedAddress: '北京市' }],
		])

		const unique = deduplicateAddresses(input)
		expect(unique).toEqual(['上海', '北京'])

		const { cachedMarkers, uncachedAddresses } = splitCachedUncached(
			unique,
			makeCacheLookup(cache),
		)

		expect(cachedMarkers.length).toBe(1)
		expect(uncachedAddresses).toEqual(['上海'])

		const batchResults: BatchGeocodeItem[] = [
			{ address: '上海', lat: 31.23, lng: 121.47, formattedAddress: '上海市' },
		]
		const { markers, failedList } = mergeBatchResults(cachedMarkers, batchResults)

		expect(markers.length).toBe(2)
		expect(failedList.length).toBe(0)
	})

	it('duplicate addresses with partial failure → failed list not inflated by duplicates', () => {
		const input = ['北京', '不存在的地方', '  北京  ', '  不存在的地方  ']
		const cache = new Map<string, CacheEntry>([
			['北京', { lat: 39.9, lng: 116.4, formattedAddress: '北京市' }],
		])

		const unique = deduplicateAddresses(input)
		expect(unique).toEqual(['北京', '不存在的地方'])

		const { cachedMarkers, uncachedAddresses } = splitCachedUncached(
			unique,
			makeCacheLookup(cache),
		)

		expect(cachedMarkers.length).toBe(1)
		expect(uncachedAddresses).toEqual(['不存在的地方'])

		const batchResults: BatchGeocodeItem[] = [
			{ address: '不存在的地方', error: '未找到该地址' },
		]
		const { markers, failedList } = mergeBatchResults(cachedMarkers, batchResults)

		expect(markers.length).toBe(1)
		expect(markers[0].address).toBe('北京')
		expect(failedList.length).toBe(1)
		expect(failedList[0].address).toBe('不存在的地方')
	})

	it('all duplicates cached → no batch request needed', () => {
		const input = ['北京', '  北京  ', '北京']
		const cache = new Map<string, CacheEntry>([
			['北京', { lat: 39.9, lng: 116.4, formattedAddress: '北京市' }],
		])

		const unique = deduplicateAddresses(input)
		expect(unique).toEqual(['北京'])

		const { cachedMarkers, uncachedAddresses } = splitCachedUncached(
			unique,
			makeCacheLookup(cache),
		)

		expect(cachedMarkers.length).toBe(1)
		expect(uncachedAddresses).toEqual([])
	})

	it('no cache hits → all go to batch, still deduplicated', () => {
		const input = ['北京', '  北京  ', '上海']
		const cache = new Map<string, CacheEntry>()

		const unique = deduplicateAddresses(input)
		expect(unique).toEqual(['北京', '上海'])

		const { cachedMarkers, uncachedAddresses } = splitCachedUncached(
			unique,
			makeCacheLookup(cache),
		)

		expect(cachedMarkers.length).toBe(0)
		expect(uncachedAddresses).toEqual(['北京', '上海'])

		const batchResults: BatchGeocodeItem[] = [
			{ address: '北京', lat: 39.9, lng: 116.4, formattedAddress: '北京市' },
			{ address: '上海', lat: 31.23, lng: 121.47, formattedAddress: '上海市' },
		]
		const { markers, failedList } = mergeBatchResults(cachedMarkers, batchResults)

		expect(markers.length).toBe(2)
		expect(failedList.length).toBe(0)
	})

	it('mixed: some cached, some succeed from API, some fail from API', () => {
		const input = ['北京', '上海', '广州', '不存在的地方', '  北京  ']
		const cache = new Map<string, CacheEntry>([
			['北京', { lat: 39.9, lng: 116.4, formattedAddress: '北京市' }],
		])

		const unique = deduplicateAddresses(input)
		expect(unique).toEqual(['北京', '上海', '广州', '不存在的地方'])

		const { cachedMarkers, uncachedAddresses } = splitCachedUncached(
			unique,
			makeCacheLookup(cache),
		)

		expect(cachedMarkers.length).toBe(1)
		expect(uncachedAddresses).toEqual(['上海', '广州', '不存在的地方'])

		const batchResults: BatchGeocodeItem[] = [
			{ address: '上海', lat: 31.23, lng: 121.47, formattedAddress: '上海市' },
			{ address: '广州', lat: 23.13, lng: 113.26, formattedAddress: '广州市' },
			{ address: '不存在的地方', error: '未找到该地址' },
		]
		const { markers, failedList } = mergeBatchResults(cachedMarkers, batchResults)

		expect(markers.length).toBe(3)
		expect(failedList.length).toBe(1)
		expect(failedList[0].address).toBe('不存在的地方')
	})
})

describe('single address entry (non-batch)', () => {
	it('parseAddressesParam returns null for empty string → triggers single mode', () => {
		expect(parseAddressesParam('')).toBeNull()
	})

	it('parseAddressesParam returns null for non-JSON → triggers single mode', () => {
		expect(parseAddressesParam('just-a-string')).toBeNull()
	})
})
