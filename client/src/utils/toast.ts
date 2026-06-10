import Taro from '@tarojs/taro'

export function showToastSuccess(title: string, duration = 1500): void {
	Taro.showToast({ title, icon: 'success', duration })
}

export function showToastError(title: string, duration = 2000): void {
	Taro.showToast({ title, icon: 'none', duration })
}
