import { View, Image } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import homeCover from '../../assets/images/landmark.jpg'
import { checkLoginGuard } from '../../utils/auth'
import './index.scss'

/** 主页：竖屏全屏图片 */
export default function Home() {
	// 登录态守卫
	useDidShow(() => {
		checkLoginGuard()
	})

	return (
		<View className='home-page'>
			<Image className='home-cover' src={homeCover} mode='aspectFill' />
			<View className='home-overlay'>
				<View className='home-welcome-title'>欢迎来到</View>
				<View className='home-welcome-main'>特产日程</View>
				<View className='home-welcome-desc'>探索各地特产 · 规划精彩旅程</View>
			</View>
		</View>
	)
}
