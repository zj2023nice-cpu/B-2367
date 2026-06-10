import { View, Image, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import homeCover from '../../assets/images/landmark.jpg'
import { request } from '../../services/request'
import { resolveImageUrl, safeNum, safeStr } from '../../utils/common'
import { parseDateText } from '../../utils/dateParser'
import { getRecentVisitIds, pruneRecentVisitIds } from '../../utils/recentVisitStore'
import { usePageGuard } from '../../utils/usePageGuard'
import { useAsyncState } from '../../utils/useAsyncState'
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

async function fetchOverview(): Promise<OverviewData> {
	const visitedIds = getRecentVisitIds(3)
	const idsParam = visitedIds.length > 0 ? `?visitedIds=${visitedIds.join(',')}` : ''
	const data = await request<OverviewData>(`/api/overview${idsParam}`)
	if (data?.recentSpecialties) {
		const validIds = data.recentSpecialties
			.map((s) => s.id)
			.filter((id): id is number => typeof id === 'number' && Number.isFinite(id))
		pruneRecentVisitIds(validIds)
	}
	return data
}

export default function Home() {
	const { loading, data: overview, refresh } = useAsyncState<OverviewData>(fetchOverview, [], false)

	usePageGuard(() => {
		refresh()
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

	const goToSpecialtyMap = (address?: string) => {
		if (!address) {
			Taro.showToast({ title: '该特产暂无地址信息', icon: 'none' })
			return
		}
		Taro.navigateTo({
			url: `/pages/map/index?address=${encodeURIComponent(address)}`,
		})
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
						<View className='home-visit-list'>
							{recentSpecialties.map((item) => {
								const addr = safeStr(item.address)
								const canNavigate = !!addr
								return (
									<View
										key={item.id}
										className={`home-visit-card ${canNavigate ? '' : 'home-visit-card--disabled'}`}
										onClick={() => goToSpecialtyMap(addr)}
									>
										<Image
											className='home-visit-img'
											src={resolveImageUrl(item.imageUrl)}
											mode='aspectFill'
										/>
										<View className='home-visit-info'>
											<Text className='home-visit-title'>
												{safeStr(item.title, '未命名')}
											</Text>
											{addr ? (
												<Text className='home-visit-address'>📍 {addr}</Text>
											) : (
												<Text className='home-visit-address home-visit-address--muted'>
													暂无地址信息
												</Text>
											)}
										</View>
									</View>
								)
							})}
						</View>
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
