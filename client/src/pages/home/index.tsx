import { View, Image, Text } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import { useState, useCallback } from 'react'
import homeCover from '../../assets/images/landmark.jpg'
import { checkLoginGuard } from '../../utils/auth'
import { request } from '../../services/request'
import { parseDateText } from '../../utils/dateParser'
import './index.scss'

interface OverviewLatestSchedule {
	id?: number
	title?: string
	dateText?: string
}

interface OverviewData {
	specialtyCount?: number
	regionCount?: number
	scheduleCount?: number
	latestSchedule?: OverviewLatestSchedule | null
	defaultNickname?: string
	recentSpecialties?: unknown[]
}

type PageState = 'loading' | 'empty' | 'data'

function safeNum(val: unknown, fallback = 0): number {
	return typeof val === 'number' && Number.isFinite(val) ? val : fallback
}

function safeStr(val: unknown, fallback = ''): string {
	return typeof val === 'string' ? val : fallback
}

export default function Home() {
	const [state, setState] = useState<PageState>('loading')
	const [overview, setOverview] = useState<OverviewData | null>(null)

	const fetchOverview = useCallback(async () => {
		try {
			const data = await request<OverviewData>('/api/overview')
			setOverview(data)
			const sc = safeNum(data?.specialtyCount)
			const rc = safeNum(data?.regionCount)
			const snc = safeNum(data?.scheduleCount)
			setState(sc === 0 && rc === 0 && snc === 0 ? 'empty' : 'data')
		} catch {
			setState('empty')
		}
	}, [])

	useDidShow(() => {
		checkLoginGuard()
		fetchOverview()
	})

	const nickname = safeStr(overview?.defaultNickname, '游客')
	const specialtyCount = safeNum(overview?.specialtyCount)
	const regionCount = safeNum(overview?.regionCount)
	const scheduleCount = safeNum(overview?.scheduleCount)
	const latestSchedule = overview?.latestSchedule
	const latestParsed = latestSchedule?.dateText
		? parseDateText(latestSchedule.dateText)
		: null

	return (
		<View className='home-page'>
			<Image className='home-cover' src={homeCover} mode='aspectFill' />

			<View className='home-overlay'>
				<View className='home-welcome-title'>欢迎来到</View>
				<View className='home-welcome-main'>特产日程</View>
				<View className='home-welcome-desc'>探索各地特产 · 规划精彩旅程</View>

				{state === 'loading' && (
					<View className='home-stats-loading'>
						<View className='home-skeleton home-skeleton--stat' />
						<View className='home-skeleton home-skeleton--stat' />
						<View className='home-skeleton home-skeleton--stat' />
					</View>
				)}

				{state === 'empty' && (
					<View className='home-stats-empty'>
						<Text className='home-stats-empty-text'>暂无数据，快去添加吧</Text>
					</View>
				)}

				{state === 'data' && (
					<View className='home-stats'>
						<View className='home-stat-card'>
							<Text className='home-stat-value'>{specialtyCount}</Text>
							<Text className='home-stat-label'>特产</Text>
						</View>
						<View className='home-stat-card'>
							<Text className='home-stat-value'>{regionCount}</Text>
							<Text className='home-stat-label'>地区</Text>
						</View>
						<View className='home-stat-card'>
							<Text className='home-stat-value'>{scheduleCount}</Text>
							<Text className='home-stat-label'>日程</Text>
						</View>
					</View>
				)}

				{state === 'data' && latestSchedule && (
					<View className='home-latest-schedule'>
						<Text className='home-latest-label'>最近日程</Text>
						<Text className='home-latest-title'>
							{safeStr(latestSchedule.title, '未命名日程')}
						</Text>
						{latestParsed?.valid && (
							<Text className='home-latest-date'>
								{latestParsed.year}年{latestParsed.month}月{latestParsed.day}日
							</Text>
						)}
					</View>
				)}

				<View className='home-nickname'>
					<Text className='home-nickname-text'>{nickname}，你好</Text>
				</View>
			</View>
		</View>
	)
}
