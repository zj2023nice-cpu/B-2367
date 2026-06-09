import { useState, useEffect, useMemo } from 'react'
import { View, ScrollView, Image, Text } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import { request } from '../../services/request'
import { checkLoginGuard } from '../../utils/auth'
import { resolveImageUrl } from '../../utils/common'
import { sortScheduleList, type SortMode } from '../../utils/scheduleSort'
import { useSortState } from '../../utils/useSortState'
import './index.scss'

interface ScheduleItem {
	id: number
	title: string
	description: string
	imageUrl: string
	dateText: string
}

const SORT_OPTIONS: { mode: SortMode; label: string }[] = [
	{ mode: 'original', label: '录入顺序' },
	{ mode: 'asc', label: '日期升序' },
	{ mode: 'desc', label: '日期降序' },
]

export default function Schedule() {
	const [list, setList] = useState<ScheduleItem[]>([])
	const [loading, setLoading] = useState(true)
	const { sortMode, setSortMode } = useSortState()

	useDidShow(() => {
		checkLoginGuard()
	})

	useEffect(() => {
		fetchData()
	}, [])

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

	const sortedList = useMemo(() => {
		return sortScheduleList(list, sortMode)
	}, [list, sortMode])

	return (
		<View className='schedule-page'>
			<View className='schedule-toolbar'>
				{SORT_OPTIONS.map((opt) => (
					<View
						key={opt.mode}
						className={`sort-btn ${sortMode === opt.mode ? 'sort-btn--active' : ''}`}
						onClick={() => setSortMode(opt.mode)}
					>
						<Text>{opt.label}</Text>
					</View>
				))}
			</View>
			{loading ? (
				<View className='loading-wrap'>
					<Text>加载中...</Text>
				</View>
			) : (
				<ScrollView scrollY className='schedule-list'>
					<View className='schedule-list-inner'>
						{sortedList.map((item, index) => (
							<View key={item.id} className='schedule-card'>
								<View className='schedule-timeline'>
									<View className='timeline-dot' />
									{index < sortedList.length - 1 && <View className='timeline-line' />}
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
