import Taro from '@tarojs/taro'

const TOKEN_KEY = 'LOGIN_TOKEN'

/** 检查是否已登录 */
export function isLoggedIn(): boolean {
	const token = Taro.getStorageSync(TOKEN_KEY)
	return token === 'ok'
}

/** 设置登录态 */
export function setLogin(): void {
	Taro.setStorageSync(TOKEN_KEY, 'ok')
}

/** 清除登录态 */
export function clearLogin(): void {
	Taro.removeStorageSync(TOKEN_KEY)
}

/** 登录态守卫：未登录则跳转登录页 */
export function checkLoginGuard(): void {
	if (!isLoggedIn()) {
		Taro.redirectTo({ url: '/pages/login/index' })
	}
}
