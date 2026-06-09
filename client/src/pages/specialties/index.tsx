import { useState, useEffect } from 'react'
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

export default function Specialties() {
	const [list, setList] = useState<SpecialtyItem[]>([])
	const [loading, setLoading] = useState(true)
	const [editingId, setEditingId] = useState<number | null>(null)
	const [editValue, setEditValue] = useState('')

	// 登录态守卫
	useDidShow(() => {
		checkLoginGuard()
	})

	useEffect(() => {
		fetchData()
	}, [])

	/** 获取特产列表 */
	const fetchData = async () => {
		setLoading(true)
		try {
			const data = await request<SpecialtyItem[]>('/api/specialties')
			setList(data || [])
		} catch (err) {
			console.error('获取特产列表失败', err)
		} finally {
			setLoading(false)
		}
	}

	/** 点击地址进入编辑 */
	const startEdit = (item: SpecialtyItem) => {
		setEditingId(item.id)
		setEditValue(item.address)
	}

	/** 失焦自动保存 */
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

	/** 点击"位置"跳转地图页 */
	const goToMap = (address: string) => {
		Taro.navigateTo({
			url: `/pages/map/index?address=${encodeURIComponent(address)}`,
		})
	}

	return (
		<View className='specialties-page'>
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
