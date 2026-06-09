import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { View, Map, Text, ScrollView } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import markerIcon from '../../assets/tab-home-active.png'
import { request } from '../../services/request'
import { getFromCache, setToCache } from '../../utils/geocodeCache'
import {
	parseAddressesParam,
	deduplicateAddresses,
	splitCachedUncached,
	mergeBatchResults,
} from '../../utils/batchGeocodeResolve'
import type { MarkerItem, FailedItem, BatchGeocodeItem } from '../../utils/batchGeocodeResolve'
import './index.scss'

interface GeocodeResult {
	address: string
	lat: number
	lng: number
	formattedAddress?: string
}

export default function MapPage() {
	const router = useRouter()
	const singleAddress = decodeURIComponent(router.params.address || '')
	const addressesParam = router.params.addresses || ''
	const batchAddresses = useMemo(() => parseAddressesParam(addressesParam), [addressesParam])

	const isBatchMode = batchAddresses !== null && batchAddresses.length > 0

	const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
	const [formattedAddress, setFormattedAddress] = useState('')
	const [error, setError] = useState('')

	const [markers, setMarkers] = useState<MarkerItem[]>([])
	const [failedList, setFailedList] = useState<FailedItem[]>([])
	const [loading, setLoading] = useState(true)
	const [highlightId, setHighlightId] = useState<number | null>(null)
	const mapRef = useRef<any>(null)

	useEffect(() => {
		if (isBatchMode) {
			geocodeBatch()
		} else if (singleAddress) {
			geocodeSingle()
		} else {
			setError('未提供地址参数')
			setLoading(false)
		}
	}, [])

	const geocodeSingle = async () => {
		setLoading(true)
		try {
			const cached = getFromCache(singleAddress)
			if (cached) {
				if (Number.isFinite(cached.lat) && Number.isFinite(cached.lng)) {
					setLocation({ lat: cached.lat, lng: cached.lng })
					setFormattedAddress(cached.formattedAddress)
					setMarkers([
						{
							id: 1,
							address: singleAddress,
							lat: cached.lat,
							lng: cached.lng,
							formattedAddress: cached.formattedAddress,
						},
					])
					setLoading(false)
					return
				}
			}
			const data = await request<GeocodeResult>(`/api/map/geocode?address=${encodeURIComponent(singleAddress)}`)
			if (data && Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
				setLocation({ lat: data.lat, lng: data.lng })
				setFormattedAddress(data.formattedAddress || '')
				setMarkers([
					{
						id: 1,
						address: singleAddress,
						lat: data.lat,
						lng: data.lng,
						formattedAddress: data.formattedAddress || '',
					},
				])
				setToCache(singleAddress, {
					formattedAddress: data.formattedAddress || '',
					lat: data.lat,
					lng: data.lng,
				})
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

	const geocodeBatch = async () => {
		setLoading(true)
		try {
			const uniqueAddresses = deduplicateAddresses(batchAddresses!)

			const { cachedMarkers, uncachedAddresses } = splitCachedUncached(
				uniqueAddresses,
				(addr) => {
					const cached = getFromCache(addr)
					if (cached && Number.isFinite(cached.lat) && Number.isFinite(cached.lng)) {
						return { lat: cached.lat, lng: cached.lng, formattedAddress: cached.formattedAddress }
					}
					return null
				},
			)

			if (uncachedAddresses.length > 0) {
				const results = await request<BatchGeocodeItem[]>('/api/map/geocode/batch', {
					method: 'POST',
					data: { addresses: uncachedAddresses },
				})

				const { markers, failedList } = mergeBatchResults(cachedMarkers, results)

				for (const item of results) {
					if (item.lat != null && item.lng != null && Number.isFinite(item.lat) && Number.isFinite(item.lng)) {
						setToCache(item.address, {
							formattedAddress: item.formattedAddress || '',
							lat: item.lat,
							lng: item.lng,
						})
					}
				}

				setMarkers(markers)
				setFailedList(failedList)
			} else {
				setMarkers(cachedMarkers)
				setFailedList([])
			}

		} catch (err) {
			console.error('批量地理编码失败', err)
			setError('批量地址解析失败')
			Taro.showToast({ title: '批量地址解析失败', icon: 'none', duration: 2000 })
		} finally {
			setLoading(false)
		}
	}

	const allMarkers = useMemo(() => {
		return markers.map((m) => ({
			id: m.id,
			iconPath: markerIcon,
			latitude: m.lat,
			longitude: m.lng,
			title: m.formattedAddress || m.address,
			width: 32,
			height: 32,
			callout: {
				content: m.formattedAddress || m.address,
				display: (highlightId === m.id ? 'ALWAYS' : 'BYCLICK') as 'ALWAYS' | 'BYCLICK',
				fontSize: 12,
				borderRadius: 6,
				padding: 6,
				bgColor: '#ffffff',
				color: '#333333',
				anchorX: 0,
				anchorY: 0,
				borderWidth: 0,
				borderColor: '#ffffff',
				textAlign: 'left' as const,
			},
		}))
	}, [markers, highlightId])

	const mapCenter = useMemo(() => {
		if (!isBatchMode) return location
		if (markers.length === 0) return null
		const avgLat = markers.reduce((s, m) => s + m.lat, 0) / markers.length
		const avgLng = markers.reduce((s, m) => s + m.lng, 0) / markers.length
		return { lat: avgLat, lng: avgLng }
	}, [isBatchMode, location, markers])

	const handleMarkerClick = useCallback((e: any) => {
		const markerId = e.markerId ?? e.detail?.markerId
		if (markerId != null) {
			setHighlightId(markerId)
		}
	}, [])

	const handleListClick = useCallback((marker: MarkerItem) => {
		setHighlightId(marker.id)
		if (mapRef.current) {
			mapRef.current.moveToLocation({
				latitude: marker.lat,
				longitude: marker.lng,
			})
		}
	}, [])

	const handleFailedClick = useCallback((item: FailedItem) => {
		Taro.showModal({
			title: '地址解析失败',
			content: `${item.address}\n原因：${item.error}`,
			showCancel: false,
		})
	}, [])

	const displayAddress = formattedAddress || singleAddress

	if (loading) {
		return (
			<View className='map-page'>
				<View className='map-loading'>
					<Text>{isBatchMode ? `定位中 (${markers.length}/${batchAddresses!.length})...` : '定位中...'}</Text>
				</View>
			</View>
		)
	}

	if (!isBatchMode) {
		if (error || !location) {
			return (
				<View className='map-page'>
					<View className='map-error'>
						<Text className='map-error-icon'>📍</Text>
						<Text className='map-error-text'>{error || '未找到该地址'}</Text>
						<Text className='map-error-address'>{singleAddress}</Text>
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
					markers={allMarkers}
					scale={15}
					showLocation
					onMarkerTap={handleMarkerClick}
					onError={() => {}}
				/>
				<View className='map-info'>
					<Text className='map-info-label'>📍 {displayAddress}</Text>
				</View>
			</View>
		)
	}

	if (markers.length === 0 && failedList.length === 0) {
		return (
			<View className='map-page'>
				<View className='map-error'>
					<Text className='map-error-icon'>📍</Text>
					<Text className='map-error-text'>{error || '所有地址解析失败'}</Text>
				</View>
			</View>
		)
	}

	return (
		<View className='map-page'>
			{mapCenter && (
				<Map
					ref={mapRef}
					className={`map-container ${failedList.length > 0 || markers.length > 1 ? 'map-container--batch' : ''}`}
					latitude={mapCenter.lat}
					longitude={mapCenter.lng}
					markers={allMarkers}
					scale={markers.length > 1 ? 11 : 15}
					showLocation
					onMarkerTap={handleMarkerClick}
					onError={() => {}}
				/>
			)}
			<View className='map-panel'>
				{markers.length > 0 && (
					<View className='map-panel-section'>
						<Text className='map-panel-title'>
							📍 已定位 ({markers.length})
						</Text>
						<ScrollView scrollY className='map-panel-list'>
							{markers.map((m) => (
								<View
									key={m.id}
									className={`map-panel-item ${highlightId === m.id ? 'map-panel-item--active' : ''}`}
									onClick={() => handleListClick(m)}
								>
									<Text className='map-panel-item-text'>
										{m.formattedAddress || m.address}
									</Text>
								</View>
							))}
						</ScrollView>
					</View>
				)}
				{failedList.length > 0 && (
					<View className='map-panel-section map-panel-section--failed'>
						<Text className='map-panel-title map-panel-title--failed'>
							⚠️ 解析失败 ({failedList.length})
						</Text>
						<ScrollView scrollY className='map-panel-list'>
							{failedList.map((item, idx) => (
								<View
									key={idx}
									className='map-panel-item map-panel-item--failed'
									onClick={() => handleFailedClick(item)}
								>
									<Text className='map-panel-item-text map-panel-item-text--failed'>
										{item.address}
									</Text>
									<Text className='map-panel-item-error'>{item.error}</Text>
								</View>
							))}
						</ScrollView>
					</View>
				)}
			</View>
		</View>
	)
}
