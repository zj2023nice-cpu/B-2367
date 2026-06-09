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
