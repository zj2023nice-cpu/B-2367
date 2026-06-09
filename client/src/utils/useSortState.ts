import { useState, useCallback } from 'react'
import Taro from '@tarojs/taro'
import type { SortMode } from './scheduleSort'

const STORAGE_KEY = 'schedule_sort_mode'

const VALID_MODES: SortMode[] = ['asc', 'desc', 'original']

function readFromStorage(): SortMode {
	try {
		const stored = Taro.getStorageSync(STORAGE_KEY)
		if (stored && VALID_MODES.includes(stored as SortMode)) {
			return stored as SortMode
		}
	} catch {
		// storage unavailable, fall through
	}
	return 'original'
}

function writeToStorage(mode: SortMode): void {
	try {
		Taro.setStorageSync(STORAGE_KEY, mode)
	} catch {
		// storage unavailable, ignore
	}
}

export function useSortState() {
	const [sortMode, setSortModeState] = useState<SortMode>(readFromStorage)

	const setSortMode = useCallback((mode: SortMode) => {
		setSortModeState(mode)
		writeToStorage(mode)
	}, [])

	return { sortMode, setSortMode }
}
