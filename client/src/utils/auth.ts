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

const FAIL_COUNT_KEY = 'LOGIN_FAIL_COUNT'
const LOCK_EXPIRE_KEY = 'LOGIN_LOCK_EXPIRE'

export const LOGIN_MAX_FAIL = 5
export const LOGIN_LOCK_SEC = 60

export function getLoginFailCount(): number {
	return Taro.getStorageSync(FAIL_COUNT_KEY) || 0
}

export function setLoginFailCount(count: number): void {
	Taro.setStorageSync(FAIL_COUNT_KEY, count)
}

export function getLoginLockExpire(): number {
	return Taro.getStorageSync(LOCK_EXPIRE_KEY) || 0
}

export function setLoginLockExpire(ts: number): void {
	Taro.setStorageSync(LOCK_EXPIRE_KEY, ts)
}

export function clearLoginLock(): void {
	Taro.removeStorageSync(FAIL_COUNT_KEY)
	Taro.removeStorageSync(LOCK_EXPIRE_KEY)
}

export function isLoginLocked(): boolean {
	const expire = getLoginLockExpire()
	if (!expire) return false
	if (Date.now() >= expire) {
		clearLoginLock()
		return false
	}
	return true
}

export function getLoginLockRemaining(): number {
	const expire = getLoginLockExpire()
	if (!expire) return 0
	const sec = Math.ceil((expire - Date.now()) / 1000)
	return sec > 0 ? sec : 0
}

/** 登录态守卫：未登录则跳转登录页 */
export function checkLoginGuard(): void {
	if (!isLoggedIn()) {
		Taro.redirectTo({ url: '/pages/login/index' })
	}
}
