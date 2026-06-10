import { useDidShow } from '@tarojs/taro'
import { checkLoginGuard } from './auth'

export function usePageGuard(onShow?: () => void) {
	useDidShow(() => {
		checkLoginGuard()
		onShow?.()
	})
}
