import { useRef, useCallback } from 'react'

export function useSafeAction() {
	const savingIdRef = useRef<number | null>(null)
	const requestIdRef = useRef(0)

	const startAction = useCallback((id: number): number => {
		if (savingIdRef.current !== null) return -1
		const rid = ++requestIdRef.current
		savingIdRef.current = id
		return rid
	}, [])

	const isStale = useCallback((id: number, rid: number): boolean => {
		return savingIdRef.current !== id || requestIdRef.current !== rid
	}, [])

	const finishAction = useCallback((id: number, rid: number): boolean => {
		const own = savingIdRef.current === id
		if (own) savingIdRef.current = null
		return own && requestIdRef.current === rid
	}, [])

	const isBusy = useCallback((): boolean => {
		return savingIdRef.current !== null
	}, [])

	return { startAction, isStale, finishAction, isBusy }
}
