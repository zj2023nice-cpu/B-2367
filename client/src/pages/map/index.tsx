import { useState, useEffect } from 'react'
import { View, Map, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import markerIcon from '../../assets/tab-home-active.png'
import { request } from '../../services/request'
import './index.scss'

interface GeocodeResult {
	address: string
	lat: number
	lng: number
	formattedAddress?: string
}

export default function MapPage() {
	const router = useRouter()
	const address = decodeURIComponent(router.params.address || '')

	const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		if (!address) {
			setError('未提供地址参数')
			setLoading(false)
			return
		}
		geocode()
	}, [])

	/** 调用后端 geocode 接口 */
	const geocode = async () => {
		setLoading(true)
		try {
			const data = await request<GeocodeResult>(`/api/map/geocode?address=${encodeURIComponent(address)}`)
			if (data && Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
				setLocation({ lat: data.lat, lng: data.lng })
			} else {
				setError('未找到该地址')
			}
		} catch (err) {
			console.error('地理编码失败', err)
			setError('地址解析失败')
			Taro.showToast({ title: '地址解析失败', icon: 'none', duration: 2000 })
		} finally {
			setLoading(false)
		}
	}

	/** 地图 Markers */
	const markers = location
		? [
				{
					id: 1,
					iconPath: markerIcon,
					latitude: location.lat,
					longitude: location.lng,
					title: address,
					width: 32,
					height: 32,
				},
			]
		: []

	if (loading) {
		return (
			<View className='map-page'>
				<View className='map-loading'>
					<Text>定位中...</Text>
				</View>
			</View>
		)
	}

	if (error || !location) {
		return (
			<View className='map-page'>
				<View className='map-error'>
					<Text className='map-error-icon'>📍</Text>
					<Text className='map-error-text'>{error || '未找到该地址'}</Text>
					<Text className='map-error-address'>{address}</Text>
				</View>
			</View>
		)
	}

	return (
		<View className='map-page'>
			<Map
				className='map-container'
				latitude={location.lat}
				longitude={location.lng}
				markers={markers}
				scale={15}
				showLocation
			/>
			<View className='map-info'>
				<Text className='map-info-label'>📍 {address}</Text>
			</View>
		</View>
	)
}
