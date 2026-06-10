import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@tarojs/taro', () => ({
	default: {
		getStorageSync: vi.fn(),
		setStorageSync: vi.fn(),
		removeStorageSync: vi.fn(),
	},
}))

import Taro from '@tarojs/taro'
import {
	getFromCache,
	setToCache,
	invalidateCache,
	invalidateCacheByAddresses,
	clearCache,
} from '../geocodeCache'

const mockGetStorageSync = Taro.getStorageSync as ReturnType<typeof vi.fn>
const mockSetStorageSync = Taro.setStorageSync as ReturnType<typeof vi.fn>
const mockRemoveStorageSync = Taro.removeStorageSync as ReturnType<typeof vi.fn>

beforeEach(() => {
	vi.clearAllMocks()
	mockGetStorageSync.mockReturnValue('')
})

describe('geocodeCache - normalize dedup', () => {
	it('treats addresses that differ only in leading/trailing whitespace as the same entry', () => {
		const cacheData = [
			{
				originalAddress: '北京',
				normalizedAddress: '北京',
				formattedAddress: '北京市',
				lat: 39.9,
				lng: 116.4,
				updatedAt: Date.now(),
			},
		]
		mockGetStorageSync.mockReturnValue(JSON.stringify(cacheData))

		const entry = getFromCache('  北京  ')
		expect(entry).not.toBeNull()
		expect(entry!.lat).toBe(39.9)
	})

	it('overwrites cache for same normalized address instead of creating duplicate', () => {
		let stored: any[] = []
		mockSetStorageSync.mockImplementation((_key: string, val: string) => {
			stored = JSON.parse(val)
		})
		mockGetStorageSync.mockImplementation(() => {
			return stored.length ? JSON.stringify(stored) : ''
		})

		setToCache('北京', { formattedAddress: '北京市', lat: 39.9, lng: 116.4 })
		expect(stored.length).toBe(1)

		setToCache('  北京  ', { formattedAddress: '北京市(更新)', lat: 39.91, lng: 116.41 })
		expect(stored.length).toBe(1)
		expect(stored[0].lat).toBe(39.91)
	})
})

describe('geocodeCache - mixed cache hit/miss with duplicate addresses', () => {
	it('returns the same entry for duplicate address lookups', () => {
		const cacheData = [
			{
				originalAddress: '上海',
				normalizedAddress: '上海',
				formattedAddress: '上海市',
				lat: 31.23,
				lng: 121.47,
				updatedAt: Date.now(),
			},
		]
		mockGetStorageSync.mockReturnValue(JSON.stringify(cacheData))

		const first = getFromCache('上海')
		const second = getFromCache('上海')
		expect(first).not.toBeNull()
		expect(second).not.toBeNull()
		expect(first!.lat).toBe(second!.lat)
		expect(first!.lng).toBe(second!.lng)
	})
})

describe('geocodeCache - invalidate by addresses', () => {
	it('removes only matching entries by normalized key', () => {
		let stored = [
			{
				originalAddress: '北京',
				normalizedAddress: '北京',
				formattedAddress: '北京市',
				lat: 39.9,
				lng: 116.4,
				updatedAt: Date.now(),
			},
			{
				originalAddress: '上海',
				normalizedAddress: '上海',
				formattedAddress: '上海市',
				lat: 31.23,
				lng: 121.47,
				updatedAt: Date.now(),
			},
		]
		mockGetStorageSync.mockImplementation(() => JSON.stringify(stored))
		mockSetStorageSync.mockImplementation((_key: string, val: string) => {
			stored = JSON.parse(val)
		})

		invalidateCacheByAddresses(['  北京  '])
		expect(stored.length).toBe(1)
		expect(stored[0].normalizedAddress).toBe('上海')
	})
})

describe('geocodeCache - setToCache rejects failed results', () => {
	it('does not cache when lat is NaN', () => {
		let stored: any[] = []
		mockSetStorageSync.mockImplementation((_key: string, val: string) => {
			stored = JSON.parse(val)
		})
		mockGetStorageSync.mockImplementation(() => {
			return stored.length ? JSON.stringify(stored) : ''
		})

		setToCache('失败地址', { formattedAddress: '失败', lat: NaN, lng: 116.4 })

		expect(stored.length).toBe(0)
	})

	it('does not cache when lng is Infinity', () => {
		let stored: any[] = []
		mockSetStorageSync.mockImplementation((_key: string, val: string) => {
			stored = JSON.parse(val)
		})
		mockGetStorageSync.mockImplementation(() => {
			return stored.length ? JSON.stringify(stored) : ''
		})

		setToCache('失败地址', { formattedAddress: '失败', lat: 39.9, lng: Infinity })

		expect(stored.length).toBe(0)
	})

	it('does not cache when lat is -Infinity', () => {
		let stored: any[] = []
		mockSetStorageSync.mockImplementation((_key: string, val: string) => {
			stored = JSON.parse(val)
		})
		mockGetStorageSync.mockImplementation(() => {
			return stored.length ? JSON.stringify(stored) : ''
		})

		setToCache('失败地址', { formattedAddress: '失败', lat: -Infinity, lng: 116.4 })

		expect(stored.length).toBe(0)
	})

	it('does not cache when address is empty', () => {
		let stored: any[] = []
		mockSetStorageSync.mockImplementation((_key: string, val: string) => {
			stored = JSON.parse(val)
		})
		mockGetStorageSync.mockImplementation(() => {
			return stored.length ? JSON.stringify(stored) : ''
		})

		setToCache('', { formattedAddress: '空', lat: 39.9, lng: 116.4 })

		expect(stored.length).toBe(0)
	})

	it('does not cache when address is whitespace-only', () => {
		let stored: any[] = []
		mockSetStorageSync.mockImplementation((_key: string, val: string) => {
			stored = JSON.parse(val)
		})
		mockGetStorageSync.mockImplementation(() => {
			return stored.length ? JSON.stringify(stored) : ''
		})

		setToCache('   ', { formattedAddress: '空白', lat: 39.9, lng: 116.4 })

		expect(stored.length).toBe(0)
	})

	it('does not corrupt existing cache when a failed result is rejected', () => {
		let stored: any[] = [
			{
				originalAddress: '北京',
				normalizedAddress: '北京',
				formattedAddress: '北京市',
				lat: 39.9,
				lng: 116.4,
				updatedAt: Date.now(),
			},
		]
		mockSetStorageSync.mockImplementation((_key: string, val: string) => {
			stored = JSON.parse(val)
		})
		mockGetStorageSync.mockImplementation(() => JSON.stringify(stored))

		setToCache('失败地址', { formattedAddress: '失败', lat: NaN, lng: NaN })

		expect(stored.length).toBe(1)
		expect(stored[0].normalizedAddress).toBe('北京')
		expect(stored[0].lat).toBe(39.9)
	})
})

describe('geocodeCache - isValidEntry rejects corrupted entries', () => {
	it('does not return entries with non-finite lat from storage', () => {
		const cacheData = [
			{
				originalAddress: '损坏条目',
				normalizedAddress: '损坏条目',
				formattedAddress: '损坏',
				lat: NaN,
				lng: 116.4,
				updatedAt: Date.now(),
			},
		]
		mockGetStorageSync.mockReturnValue(JSON.stringify(cacheData))

		const entry = getFromCache('损坏条目')
		expect(entry).toBeNull()
	})

	it('does not return entries with non-finite lng from storage', () => {
		const cacheData = [
			{
				originalAddress: '损坏条目',
				normalizedAddress: '损坏条目',
				formattedAddress: '损坏',
				lat: 39.9,
				lng: Infinity,
				updatedAt: Date.now(),
			},
		]
		mockGetStorageSync.mockReturnValue(JSON.stringify(cacheData))

		const entry = getFromCache('损坏条目')
		expect(entry).toBeNull()
	})

	it('returns valid entries alongside corrupted ones in storage', () => {
		const cacheData = [
			{
				originalAddress: '北京',
				normalizedAddress: '北京',
				formattedAddress: '北京市',
				lat: 39.9,
				lng: 116.4,
				updatedAt: Date.now(),
			},
			{
				originalAddress: '损坏条目',
				normalizedAddress: '损坏条目',
				formattedAddress: '损坏',
				lat: NaN,
				lng: 116.4,
				updatedAt: Date.now(),
			},
		]
		mockGetStorageSync.mockReturnValue(JSON.stringify(cacheData))

		const validEntry = getFromCache('北京')
		expect(validEntry).not.toBeNull()
		expect(validEntry!.lat).toBe(39.9)

		const corruptedEntry = getFromCache('损坏条目')
		expect(corruptedEntry).toBeNull()
	})
})

describe('geocodeCache - LRU eviction under rapid writes', () => {
	it('evicts oldest entry when exceeding MAX_SIZE', () => {
		let stored: any[] = []
		mockSetStorageSync.mockImplementation((_key: string, val: string) => {
			stored = JSON.parse(val)
		})
		mockGetStorageSync.mockImplementation(() => {
			return stored.length ? JSON.stringify(stored) : ''
		})

		for (let i = 0; i < 22; i++) {
			setToCache(`地址${i}`, { formattedAddress: `格式${i}`, lat: i * 0.1, lng: i * 0.2 })
		}

		expect(stored.length).toBeLessThanOrEqual(20)

		const firstEvicted = getFromCache('地址0')
		expect(firstEvicted).toBeNull()

		const recent = getFromCache('地址21')
		expect(recent).not.toBeNull()
		expect(recent!.lat).toBeCloseTo(2.1, 1)
	})
})
