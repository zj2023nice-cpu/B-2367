import { useState, useEffect, useRef, useCallback } from 'react'
import { View, ScrollView, Image, Text, Button, Input } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { request } from '../../services/request'
import { checkLoginGuard } from '../../utils/auth'
import { resolveImageUrl } from '../../utils/common'
import './index.scss'

interface SpecialtyItem {
	id: number
	title: string
	description: string
	imageUrl: string
	address: string
}

const MAX_ADDRESS_LEN = 50
const DEBOUNCE_MS = 400

export default function Specialties() {
	const [list, setList] = useState<SpecialtyItem[]>([])
	const [loading, setLoading] = useState(true)
	const [editingId, setEditingId] = useState<number | null>(null)
	const [editValue, setEditValue] = useState('')
	const [keyword, setKeyword] = useState('')
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	useDidShow(() => {
		checkLoginGuard()
	})

	const fetchData = useCallback(async (kw: string) => {
		setLoading(true)
		try {
			const params = new URLSearchParams()
			if (kw) params.set('keyword', kw)
			const qs = params.toString()
			const url = `/api/specialties${qs ? `?${qs}` : ''}`
			const data = await request<SpecialtyItem[]>(url)
			setList(data || [])
		} catch (err) {
			console.error('获取特产列表失败', err)
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		fetchData(keyword)
	}, [keyword, fetchData])

	const handleSearchInput = (e: { detail: { value: string } }) => {
		const val = e.detail.value
		if (timerRef.current) clearTimeout(timerRef.current)
		timerRef.current = setTimeout(() => {
			setKeyword(val)
		}, DEBOUNCE_MS)
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

	return (
		<View className='specialties-page'>
			<View className='search-bar'>
				<Input
					className='search-input'
					placeholder='搜索特产名称或地址'
					onInput={handleSearchInput}
				/>
			</View>
			{loading ? (
				<View className='loading-wrap'>
					<Text>加载中...</Text>
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
					</View>
				</ScrollView>
			)}
		</View>
	)
}
