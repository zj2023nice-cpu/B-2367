import { useState, useEffect } from 'react'
import { View, ScrollView, Image, Text } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import { request } from '../../services/request'
import { checkLoginGuard } from '../../utils/auth'
import { resolveImageUrl } from '../../utils/common'
import './index.scss'

interface ScheduleItem {
	id: number
	title: string
	description: string
	imageUrl: string
	dateText: string
}

export default function Schedule() {
	const [list, setList] = useState<ScheduleItem[]>([])
	const [loading, setLoading] = useState(true)

	// 登录态守卫
	useDidShow(() => {
		checkLoginGuard()
	})

	useEffect(() => {
		fetchData()
	}, [])

	/** 获取日程列表 */
	const fetchData = async () => {
		setLoading(true)
		try {
			const data = await request<ScheduleItem[]>('/api/schedules')
			setList(data || [])
		} catch (err) {
			console.error('获取日程列表失败', err)
		} finally {
			setLoading(false)
		}
	}

	return (
		<View className='schedule-page'>
			{loading ? (
				<View className='loading-wrap'>
					<Text>加载中...</Text>
				</View>
			) : (
				<ScrollView scrollY className='schedule-list'>
					<View className='schedule-list-inner'>
						{list.map((item, index) => (
							<View key={item.id} className='schedule-card'>
								<View className='schedule-timeline'>
									<View className='timeline-dot' />
									{index < list.length - 1 && <View className='timeline-line' />}
								</View>
								<View className='schedule-content'>
									<View className='schedule-date-tag'>{item.dateText}</View>
									<Image className='schedule-img' src={resolveImageUrl(item.imageUrl)} mode='aspectFill' />
									<View className='schedule-text'>
										<Text className='schedule-title'>{item.title}</Text>
										<Text className='schedule-desc'>{item.description}</Text>
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
