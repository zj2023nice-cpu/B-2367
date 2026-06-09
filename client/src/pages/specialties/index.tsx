import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { View, ScrollView, Image, Text, Button, Input } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { request } from '../../services/request'
import { checkLoginGuard } from '../../utils/auth'
import { resolveImageUrl } from '../../utils/common'
import { invalidateCacheByAddresses } from '../../utils/geocodeCache'
import {
	toggleFavorite as toggleFavoriteStore,
	getFavoriteIds as loadFavoriteIds,
	getFavoriteCount,
	recordVisit,
} from '../../utils/favoriteStore'
import './index.scss'

interface SpecialtyItem {
	id: number
	title: string
	description: string
	imageUrl: string
	address: string
}

interface QueryState {
	keyword: string
	regions: string[]
}

interface EditingState {
	value: string
}

interface SavingState {
	originalAddress: string
	submittedValue: string
	requestId: number
}

type ViewMode = 'all' | 'favorites'

const REGIONS = ['北京', '天津', '云南', '浙江', '四川', '陕西', '湖南', '广东']
const MAX_ADDRESS_LEN = 50
const DEBOUNCE_MS = 400
const PAGE_SIZE = 10

export default function Specialties() {
	const [filters, setFilters] = useState<QueryState>({ keyword: '', regions: [] })
	const [viewMode, setViewMode] = useState<ViewMode>('all')
	const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set())
	const [favCount, setFavCount] = useState(0)
	const [list, setList] = useState<SpecialtyItem[]>([])
	const [total, setTotal] = useState(0)
	const [loading, setLoading] = useState(true)
	const [editingMap, setEditingMap] = useState<Map<number, EditingState>>(new Map())
	const [savingMap, setSavingMap] = useState<Map<number, SavingState>>(new Map())
	const [searchText, setSearchText] = useState('')
	const requestIdRef = useRef(0)
	const saveRequestIdRef = useRef(0)
	const savingIdRef = useRef<number | null>(null)
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const refreshFavoriteState = useCallback(() => {
		setFavoriteIds(loadFavoriteIds())
		setFavCount(getFavoriteCount())
	}, [])

	useDidShow(() => {
		checkLoginGuard()
		refreshFavoriteState()
	})

	const fetchPage = useCallback(
		async (offset: number, append: boolean) => {
			const rid = ++requestIdRef.current
			setLoading(true)
			try {
				const params = new URLSearchParams()
				const kw = filters.keyword.trim().replace(/\s+/g, ' ')
				if (kw) params.set('keyword', kw)
				if (filters.regions.length) params.set('region', filters.regions.join(','))
				if (viewMode === 'all') {
					params.set('limit', String(PAGE_SIZE))
					if (offset > 0) params.set('offset', String(offset))
				}
				const qs = params.toString()
				const url = `/api/specialties${qs ? `?${qs}` : ''}`
				const result = await request<{ list: SpecialtyItem[]; total: number }>(url)
				if (requestIdRef.current !== rid) return
				if (append) {
					setList((prev) => [...prev, ...result.list])
				} else {
					setList(result.list)
				}
				setTotal(result.total)
			} catch (err) {
				console.error('获取特产列表失败', err)
			} finally {
				if (requestIdRef.current === rid) setLoading(false)
			}
		},
		[filters, viewMode],
	)

	useEffect(() => {
		fetchPage(0, false)
	}, [fetchPage])

	const displayList = useMemo(() => {
		if (viewMode === 'favorites') {
			return list.filter((item) => favoriteIds.has(item.id))
		}
		return list
	}, [list, viewMode, favoriteIds])

	const handleSearchInput = (e: { detail: { value: string } }) => {
		const val = e.detail.value
		setSearchText(val)
		if (timerRef.current) clearTimeout(timerRef.current)
		if (!val.trim()) {
			setFilters((prev) => ({ ...prev, keyword: '' }))
			return
		}
		timerRef.current = setTimeout(() => {
			setFilters((prev) => ({ ...prev, keyword: val }))
		}, DEBOUNCE_MS)
	}

	const toggleRegion = (region: string) => {
		setFilters((prev) => ({
			...prev,
			regions: prev.regions.includes(region) ? prev.regions.filter((r) => r !== region) : [...prev.regions, region],
		}))
	}

	const switchViewMode = (mode: ViewMode) => {
		if (mode === viewMode) return
		setViewMode(mode)
	}

	const handleToggleFavorite = (id: number) => {
		toggleFavoriteStore(id)
		refreshFavoriteState()
	}

	const handleLoadMore = () => {
		if (viewMode === 'all' && !loading && list.length < total) {
			fetchPage(list.length, true)
		}
	}

	const startEdit = (item: SpecialtyItem) => {
		if (savingIdRef.current !== null) return
		if (savingMap.has(item.id)) return
		setEditingMap((prev) => {
			const next = new Map(prev)
			next.set(item.id, { value: item.address })
			return next
		})
	}

	const commitEdit = async (itemId: number) => {
		const editing = editingMap.get(itemId)
		if (!editing) return
		const trimmed = editing.value.trim()

		if (!trimmed) {
			Taro.showToast({ title: '地址不能为空', icon: 'none' })
			const original = list.find((i) => i.id === itemId)
			if (original) {
				setEditingMap((prev) => {
					const next = new Map(prev)
					next.set(itemId, { value: original.address })
					return next
				})
			}
			return
		}
		if (trimmed.length > MAX_ADDRESS_LEN) {
			Taro.showToast({ title: `地址不超过${MAX_ADDRESS_LEN}字`, icon: 'none' })
			return
		}
		const original = list.find((i) => i.id === itemId)
		if (original && trimmed === original.address) {
			setEditingMap((prev) => {
				const next = new Map(prev)
				next.delete(itemId)
				return next
			})
			return
		}

		if (savingIdRef.current !== null) return

		const currentRequestId = ++saveRequestIdRef.current
		savingIdRef.current = itemId

		const originalAddress = original ? original.address : ''
		setSavingMap((prev) => {
			const next = new Map(prev)
			next.set(itemId, { originalAddress, submittedValue: trimmed, requestId: currentRequestId })
			return next
		})
		setEditingMap((prev) => {
			const next = new Map(prev)
			next.delete(itemId)
			return next
		})

		try {
			const result = await request<SpecialtyItem>(`/api/specialties/${itemId}/address`, {
				method: 'PUT',
				data: { address: trimmed },
			})

			if (savingIdRef.current !== itemId || saveRequestIdRef.current !== currentRequestId) {
				return
			}

			invalidateCacheByAddresses([originalAddress, trimmed])

			const newAddress = result.address ?? trimmed
			setList((prev) =>
				prev.map((i) => (i.id === itemId ? { ...i, address: newAddress } : i)),
			)
		} catch {
			if (savingIdRef.current !== itemId || saveRequestIdRef.current !== currentRequestId) {
				return
			}

			Taro.showToast({ title: '保存失败', icon: 'none' })

			setList((prev) =>
				prev.map((i) => (i.id === itemId ? { ...i, address: originalAddress } : i)),
			)
			setEditingMap((prev) => {
				const next = new Map(prev)
				next.set(itemId, { value: trimmed })
				return next
			})
		} finally {
			if (savingIdRef.current === itemId) {
				savingIdRef.current = null
			}
			setSavingMap((prev) => {
				const next = new Map(prev)
				const entry = next.get(itemId)
				if (entry && entry.requestId === currentRequestId) {
					next.delete(itemId)
				}
				return next
			})
		}
	}

	const goToMap = (id: number, address: string) => {
		recordVisit(id)
		Taro.navigateTo({
			url: `/pages/map/index?address=${encodeURIComponent(address)}`,
		})
	}

	const hasMore = viewMode === 'all' && list.length < total

	return (
		<View className='specialties-page'>
			<View className='search-bar'>
				<Input className='search-input' placeholder='搜索特产名称、描述或地址' onInput={handleSearchInput} value={searchText} />
			</View>
			<View className='region-filter'>
				<ScrollView scrollX className='region-scroll'>
					<View className='region-chips'>
						{REGIONS.map((region) => (
							<View
								key={region}
								className={`region-chip ${filters.regions.includes(region) ? 'region-chip-active' : ''}`}
								onClick={() => toggleRegion(region)}
							>
								<Text>{region}</Text>
							</View>
						))}
					</View>
				</ScrollView>
			</View>
			<View className='view-mode-bar'>
				<View
					className={`view-mode-tab ${viewMode === 'all' ? 'view-mode-tab-active' : ''}`}
					onClick={() => switchViewMode('all')}
				>
					<Text>全部</Text>
				</View>
				<View
					className={`view-mode-tab ${viewMode === 'favorites' ? 'view-mode-tab-active' : ''}`}
					onClick={() => switchViewMode('favorites')}
				>
					<Text>已收藏</Text>
					{favCount > 0 && (
						<View className='fav-badge'>
							<Text className='fav-badge-text'>{favCount > 99 ? '99+' : favCount}</Text>
						</View>
					)}
				</View>
			</View>
			{loading && displayList.length === 0 ? (
				<View className='loading-wrap'>
					<Text>加载中...</Text>
				</View>
			) : displayList.length === 0 ? (
				<View className='empty-wrap'>
					<Text>{viewMode === 'favorites' ? '暂无收藏的特产' : '暂无匹配的特产'}</Text>
				</View>
			) : (
				<ScrollView scrollY className='specialty-list'>
					<View className='specialty-list-inner'>
						{displayList.map((item) => {
							const editing = editingMap.get(item.id)
							const saving = savingMap.get(item.id)
							const isEditing = !!editing
							const isSaving = !!saving
							const isFav = favoriteIds.has(item.id)

							return (
								<View key={item.id} className='specialty-card'>
									<View className='specialty-img-wrap'>
										<Image className='specialty-img' src={resolveImageUrl(item.imageUrl)} mode='aspectFill' />
										<View
											className={`fav-btn ${isFav ? 'fav-btn-active' : ''}`}
											onClick={() => handleToggleFavorite(item.id)}
										>
											<Text className='fav-btn-icon'>{isFav ? '❤' : '♡'}</Text>
										</View>
									</View>
									<View className='specialty-info'>
										<View className='specialty-title-row'>
											<Text className='specialty-title'>{item.title}</Text>
										</View>
										<Text className='specialty-desc'>{item.description}</Text>
										<View className='specialty-footer'>
											{isEditing ? (
												<Input
													className='specialty-address-input'
													value={editing.value}
													maxlength={MAX_ADDRESS_LEN}
													focus
													onInput={(e) =>
														setEditingMap((prev) => {
															const next = new Map(prev)
															next.set(item.id, { value: e.detail.value })
															return next
														})
													}
													onBlur={() => commitEdit(item.id)}
												/>
											) : isSaving ? (
												<View className='specialty-address-saving'>
													<Text className='saving-indicator'>保存中...</Text>
													<Text className='specialty-address-muted'>{saving.submittedValue}</Text>
												</View>
											) : (
												<Text className='specialty-address' onClick={() => startEdit(item)}>
													📍 {item.address}
												</Text>
											)}
											<Button
												className='location-btn'
												hoverClass='location-btn-hover'
												onClick={() => goToMap(item.id, item.address)}
												disabled={isSaving}>
												位置
											</Button>
										</View>
									</View>
								</View>
							)
						})}
						{hasMore && (
							<View className='load-more-wrap'>
								<Button className='load-more-btn' onClick={handleLoadMore} disabled={loading}>
									{loading ? '加载中...' : '加载更多'}
								</Button>
							</View>
						)}
					</View>
				</ScrollView>
			)}
		</View>
	)
}
