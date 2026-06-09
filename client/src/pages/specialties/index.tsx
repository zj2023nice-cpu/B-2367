import { useState, useEffect, useRef, useCallback } from 'react'
import { View, ScrollView, Image, Text, Button, Input } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { request } from '../../services/request'
import { checkLoginGuard } from '../../utils/auth'
import { resolveImageUrl } from '../../utils/common'
import { invalidateCacheByAddresses } from '../../utils/geocodeCache'
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

const REGIONS = ['北京', '天津', '云南', '浙江', '四川', '陕西', '湖南', '广东']
const MAX_ADDRESS_LEN = 50
const DEBOUNCE_MS = 400
const PAGE_SIZE = 10

export default function Specialties() {
	const [filters, setFilters] = useState<QueryState>({ keyword: '', regions: [] })
	const [list, setList] = useState<SpecialtyItem[]>([])
	const [total, setTotal] = useState(0)
	const [loading, setLoading] = useState(true)
	const [editingId, setEditingId] = useState<number | null>(null)
	const [editValue, setEditValue] = useState('')
	const [searchText, setSearchText] = useState('')
	const requestIdRef = useRef(0)
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useDidShow(() => {
		checkLoginGuard()
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
				params.set('limit', String(PAGE_SIZE))
				if (offset > 0) params.set('offset', String(offset))
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
		[filters],
	)

	useEffect(() => {
		fetchPage(0, false)
	}, [fetchPage])

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

	const handleLoadMore = () => {
		if (!loading && list.length < total) {
			fetchPage(list.length, true)
		}
	}

	const startEdit = (item: SpecialtyItem) => {
		setEditingId(item.id)
		setEditValue(item.address)
	}

	const handleBlur = async () => {
		if (editingId === null) return
		const trimmed = editValue.trim()
		if (!trimmed) {
			Taro.showToast({ title: '地址不能为空', icon: 'none' })
			const original = list.find((i) => i.id === editingId)
			if (original) setEditValue(original.address)
			return
		}
		if (trimmed.length > MAX_ADDRESS_LEN) {
			Taro.showToast({ title: `地址不超过${MAX_ADDRESS_LEN}字`, icon: 'none' })
			return
		}
		const original = list.find((i) => i.id === editingId)
		if (original && trimmed === original.address) {
			setEditingId(null)
			return
		}
		try {
			await request(`/api/specialties/${editingId}/address`, {
				method: 'PUT',
				data: { address: trimmed },
			})
			const oldAddress = original ? original.address : ''
			invalidateCacheByAddresses([oldAddress, trimmed])
			setList((prev) => prev.map((i) => (i.id === editingId ? { ...i, address: trimmed } : i)))
		} catch {
			Taro.showToast({ title: '保存失败', icon: 'none' })
		}
		setEditingId(null)
	}

	const goToMap = (address: string) => {
		Taro.navigateTo({
			url: `/pages/map/index?address=${encodeURIComponent(address)}`,
		})
	}

	const hasMore = list.length < total

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
			{loading && list.length === 0 ? (
				<View className='loading-wrap'>
					<Text>加载中...</Text>
				</View>
			) : list.length === 0 ? (
				<View className='empty-wrap'>
					<Text>暂无匹配的特产</Text>
				</View>
			) : (
				<ScrollView scrollY className='specialty-list'>
					<View className='specialty-list-inner'>
						{list.map((item) => (
							<View key={item.id} className='specialty-card'>
								<Image className='specialty-img' src={resolveImageUrl(item.imageUrl)} mode='aspectFill' />
								<View className='specialty-info'>
									<Text className='specialty-title'>{item.title}</Text>
									<Text className='specialty-desc'>{item.description}</Text>
									<View className='specialty-footer'>
										{editingId === item.id ? (
											<Input
												className='specialty-address-input'
												value={editValue}
												maxlength={MAX_ADDRESS_LEN}
												focus
												onInput={(e) => setEditValue(e.detail.value)}
												onBlur={handleBlur}
											/>
										) : (
											<Text className='specialty-address' onClick={() => startEdit(item)}>
												📍 {item.address}
											</Text>
										)}
										<Button
											className='location-btn'
											hoverClass='location-btn-hover'
											onClick={() => goToMap(item.address)}>
											位置
										</Button>
									</View>
								</View>
							</View>
						))}
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
