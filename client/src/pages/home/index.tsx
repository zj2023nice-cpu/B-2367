import { View, Image, Text, ScrollView } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import Taro from '@tarojs/taro'
import { useState, useCallback } from 'react'
import homeCover from '../../assets/images/landmark.jpg'
import { checkLoginGuard } from '../../utils/auth'
import { request } from '../../services/request'
import { resolveImageUrl } from '../../utils/common'
import { parseDateText } from '../../utils/dateParser'
import './index.scss'

interface OverviewLatestSchedule {
	id?: number
	title?: string
	dateText?: string
}

interface OverviewRecentSpecialty {
	id?: number
	title?: string
	imageUrl?: string
	address?: string
}

interface OverviewQuickEntry {
	key?: string
	label?: string
	icon?: string
	path?: string
}

interface OverviewStats {
	specialtyCount?: number
	regionCount?: number
	scheduleCount?: number
}

interface OverviewData {
	defaultNickname?: string
	stats?: OverviewStats
	latestSchedule?: OverviewLatestSchedule | null
	recentSpecialties?: OverviewRecentSpecialty[]
	quickEntries?: OverviewQuickEntry[]
}

function safeNum(val: unknown, fallback = 0): number {
	return typeof val === 'number' && Number.isFinite(val) ? val : fallback
}

function safeStr(val: unknown, fallback = ''): string {
	return typeof val === 'string' ? val : fallback
}

export default function Home() {
	const [loading, setLoading] = useState(true)
	const [overview, setOverview] = useState<OverviewData | null>(null)

	const fetchOverview = useCallback(async () => {
		setLoading(true)
		try {
			const data = await request<OverviewData>('/api/overview')
			setOverview(data)
		} catch {
			setOverview(null)
		} finally {
			setLoading(false)
		}
	}, [])

	useDidShow(() => {
		checkLoginGuard()
		fetchOverview()
	})

	const nickname = safeStr(overview?.defaultNickname, '游客')
	const stats = overview?.stats
	const specialtyCount = safeNum(stats?.specialtyCount)
	const regionCount = safeNum(stats?.regionCount)
	const scheduleCount = safeNum(stats?.scheduleCount)
	const latestSchedule = overview?.latestSchedule
	const latestParsed = latestSchedule?.dateText
		? parseDateText(latestSchedule.dateText)
		: null
	const recentSpecialties = overview?.recentSpecialties ?? []
	const quickEntries = overview?.quickEntries ?? []

	const goToSchedule = (id?: number) => {
		if (id == null) return
		Taro.switchTab({ url: '/pages/schedule/index' })
	}

	const goToSpecialty = (id?: number) => {
		if (id == null) return
		Taro.switchTab({ url: '/pages/specialties/index' })
	}

	const goToPath = (path?: string) => {
		if (!path) return
		const isTab = path.startsWith('/pages/home/') ||
			path.startsWith('/pages/specialties/') ||
			path.startsWith('/pages/schedule/') ||
			path.startsWith('/pages/user/')
		if (isTab) {
			Taro.switchTab({ url: path })
		} else {
			Taro.navigateTo({ url: path })
		}
	}

	return (
		<View className='home-page'>
			<View className='home-hero'>
				<Image className='home-cover' src={homeCover} mode='aspectFill' />
				<View className='home-hero-overlay'>
					<Text className='home-greeting'>{nickname}，你好 👋</Text>
					<Text className='home-welcome-main'>特产日程</Text>
					<Text className='home-welcome-desc'>探索各地特产 · 规划精彩旅程</Text>
				</View>
			</View>

			<ScrollView scrollY className='home-body'>
				<View className='home-section'>
					<Text className='home-section-title'>数据总览</Text>
					{loading ? (
						<View className='home-stats-loading'>
							<View className='home-skeleton home-skeleton--stat' />
							<View className='home-skeleton home-skeleton--stat' />
							<View className='home-skeleton home-skeleton--stat' />
						</View>
					) : (
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
				</View>

				<View className='home-section'>
					<Text className='home-section-title'>最近日程</Text>
					{loading ? (
						<View className='home-skeleton home-skeleton--card' />
					) : latestSchedule ? (
						<View className='home-latest-schedule' onClick={() => goToSchedule(latestSchedule.id)}>
							<Text className='home-latest-title'>
								{safeStr(latestSchedule.title, '未命名日程')}
							</Text>
							{latestParsed?.valid && (
								<Text className='home-latest-date'>
									{latestParsed.year}年{latestParsed.month}月{latestParsed.day}日
								</Text>
							)}
						</View>
					) : (
						<View className='home-empty-block'>
							<Text className='home-empty-text'>暂无日程，快去添加吧</Text>
						</View>
					)}
				</View>

				<View className='home-section'>
					<Text className='home-section-title'>最近访问特产</Text>
					{loading ? (
						<View className='home-skeleton home-skeleton--card' />
					) : recentSpecialties.length > 0 ? (
						<ScrollView scrollX className='home-recent-scroll'>
							<View className='home-recent-list'>
								{recentSpecialties.map((item) => (
									<View
										key={item.id}
										className='home-recent-card'
										onClick={() => goToSpecialty(item.id)}
									>
										<Image
											className='home-recent-img'
											src={resolveImageUrl(item.imageUrl)}
											mode='aspectFill'
										/>
										<Text className='home-recent-title'>
											{safeStr(item.title, '未命名')}
										</Text>
									</View>
								))}
							</View>
						</ScrollView>
					) : (
						<View className='home-empty-block'>
							<Text className='home-empty-text'>暂无访问记录</Text>
						</View>
					)}
				</View>

				<View className='home-section'>
					<Text className='home-section-title'>快捷入口</Text>
					<View className='home-quick-grid'>
						{(loading ? [] : quickEntries).map((entry) => (
							<View
								key={entry.key}
								className='home-quick-item'
								onClick={() => goToPath(entry.path)}
							>
								<Text className='home-quick-icon'>{entry.icon}</Text>
								<Text className='home-quick-label'>{entry.label}</Text>
							</View>
						))}
						{loading && Array.from({ length: 4 }).map((_, i) => (
							<View key={i} className='home-quick-item'>
								<View className='home-skeleton home-skeleton--icon' />
								<View className='home-skeleton home-skeleton--label' />
							</View>
						))}
					</View>
				</View>

				<View className='home-footer-space' />
			</ScrollView>
		</View>
	)
}
