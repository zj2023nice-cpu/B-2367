import { useState, useEffect, useMemo, useCallback } from 'react'
import { View, ScrollView, Image, Text } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { request } from '../../services/request'
import { checkLoginGuard } from '../../utils/auth'
import { resolveImageUrl } from '../../utils/common'
import { groupSortedScheduleList, type SortMode } from '../../utils/scheduleSort'
import { useSortState } from '../../utils/useSortState'
import './index.scss'

interface ScheduleItem {
	id: number
	title: string
	description: string
	imageUrl: string
	dateText: string
	completed: boolean
	completedAt: string | null
}

interface ScheduleStats {
	total: number
	completed: number
	pending: number
}

type FilterMode = 'all' | 'pending' | 'completed'

const SORT_OPTIONS: { mode: SortMode; label: string }[] = [
	{ mode: 'original', label: '录入顺序' },
	{ mode: 'asc', label: '日期升序' },
	{ mode: 'desc', label: '日期降序' },
]

const FILTER_OPTIONS: { mode: FilterMode; label: string }[] = [
	{ mode: 'all', label: '全部' },
	{ mode: 'pending', label: '未完成' },
	{ mode: 'completed', label: '已完成' },
]

export default function Schedule() {
	const [list, setList] = useState<ScheduleItem[]>([])
	const [loading, setLoading] = useState(true)
	const [filter, setFilter] = useState<FilterMode>('all')
	const [stats, setStats] = useState<ScheduleStats>({ total: 0, completed: 0, pending: 0 })
	const { sortMode, setSortMode } = useSortState()

	useDidShow(() => {
		checkLoginGuard()
	})

	const fetchData = useCallback(async () => {
		setLoading(true)
		try {
			const [data, statsData] = await Promise.all([
				request<ScheduleItem[]>('/api/schedules', {
					method: 'GET',
					data: filter === 'all' ? {} : { filter },
				}),
				request<ScheduleStats>('/api/schedules/stats'),
			])
			setList(
				(data || []).map((item) => ({
					...item,
					completed: item.completed ?? false,
				}))
			)
			setStats(statsData || { total: 0, completed: 0, pending: 0 })
		} catch (err) {
			console.error('获取日程列表失败', err)
		} finally {
			setLoading(false)
		}
	}, [filter])

	useEffect(() => {
		fetchData()
	}, [fetchData])

	const handleToggle = useCallback(
		async (item: ScheduleItem) => {
			try {
				const url = item.completed
					? `/api/schedules/${item.id}/undo`
					: `/api/schedules/${item.id}/complete`
				await request<ScheduleItem>(url, { method: 'PUT' })
				const toastTitle = item.completed ? '已撤销完成' : '已标记完成'
				Taro.showToast({ title: toastTitle, icon: 'success', duration: 1500 })
				fetchData()
			} catch (err) {
				console.error('操作失败', err)
			}
		},
		[fetchData]
	)

	const grouped = useMemo(() => {
		return groupSortedScheduleList(list, sortMode)
	}, [list, sortMode])

	const completedPercent =
		stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

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

			<View className='schedule-stats-bar'>
				<View className='stats-info'>
					<Text className='stats-text'>
						已完成 {stats.completed}/{stats.total}
					</Text>
					<Text className='stats-percent'>{completedPercent}%</Text>
				</View>
				<View className='stats-progress'>
					<View
						className='stats-progress-fill'
						style={{ width: `${completedPercent}%` }}
					/>
				</View>
			</View>

			<View className='schedule-filter'>
				{FILTER_OPTIONS.map((opt) => (
					<View
						key={opt.mode}
						className={`filter-btn ${filter === opt.mode ? 'filter-btn--active' : ''}`}
						onClick={() => setFilter(opt.mode)}
					>
						<Text>
							{opt.label}
							{opt.mode === 'pending' && stats.pending > 0 ? ` (${stats.pending})` : ''}
							{opt.mode === 'completed' && stats.completed > 0
								? ` (${stats.completed})`
								: ''}
						</Text>
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
						{Array.from(grouped.entries()).map(([monthKey, items]) => (
							<View key={monthKey} className='schedule-month-group'>
								<View className='schedule-month-header'>
									<Text>{monthKey}</Text>
								</View>
								{items.map((item, index) => (
									<View
										key={item.id}
										className={`schedule-card ${item.completed ? 'schedule-card--completed' : ''}`}
									>
										<View className='schedule-timeline'>
											<View
												className={`timeline-dot ${item.completed ? 'timeline-dot--completed' : ''}`}
											/>
											{index < items.length - 1 && <View className='timeline-line' />}
										</View>
										<View className='schedule-content'>
											<View className='schedule-date-tag'>{item.dateText}</View>
											<Image
												className={`schedule-img ${item.completed ? 'schedule-img--completed' : ''}`}
												src={resolveImageUrl(item.imageUrl)}
												mode='aspectFill'
											/>
											<View className='schedule-text'>
												<Text
													className={`schedule-title ${item.completed ? 'schedule-title--completed' : ''}`}
												>
													{item.title}
												</Text>
												<Text
													className={`schedule-desc ${item.completed ? 'schedule-desc--completed' : ''}`}
												>
													{item.description}
												</Text>
											</View>
											<View className='schedule-action'>
												<View
													className={`toggle-btn ${item.completed ? 'toggle-btn--undo' : 'toggle-btn--complete'}`}
													onClick={() => handleToggle(item)}
												>
													<Text>{item.completed ? '撤销完成' : '标记完成'}</Text>
												</View>
												{item.completed && item.completedAt && (
													<Text className='completed-time'>
														{new Date(item.completedAt).toLocaleDateString('zh-CN')}
													</Text>
												)}
											</View>
										</View>
									</View>
								))}
							</View>
						))}
					</View>
				</ScrollView>
			)}
		</View>
	)
}
