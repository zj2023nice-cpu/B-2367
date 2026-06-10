import { useState, useRef, useCallback, useEffect } from 'react'

interface AsyncState<T> {
	loading: boolean
	data: T | null
	error: string
	refresh: () => void
}

export function useAsyncState<T>(
	fetcher: () => Promise<T>,
	deps: readonly unknown[] = [],
	autoRun = true,
): AsyncState<T> {
	const [loading, setLoading] = useState(autoRun)
	const [data, setData] = useState<T | null>(null)
	const [error, setError] = useState('')
	const requestIdRef = useRef(0)

	const run = useCallback(async () => {
		const rid = ++requestIdRef.current
		setLoading(true)
		setError('')
		try {
			const result = await fetcher()
			if (requestIdRef.current !== rid) return
			setData(result)
		} catch (err: any) {
			if (requestIdRef.current !== rid) return
			const msg = err?.message || ''
			setData(null)
			setError(msg)
		} finally {
			if (requestIdRef.current === rid) {
				setLoading(false)
			}
		}
	}, deps)

	useEffect(() => {
		if (autoRun) run()
	}, [run, autoRun])

	return { loading, data, error, refresh: run }
}
