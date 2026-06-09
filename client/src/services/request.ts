import Taro from '@tarojs/taro'

const DEFAULT_BASE_URL = 'http://localhost:3001'

/** 后端 API 基础地址（通过构建配置注入） */
export const BASE_URL = process.env.API_BASE_URL || DEFAULT_BASE_URL

/** 统一响应类型 */
interface ApiResponse<T = any> {
	code: number
	message: string
	data: T
}

/** 封装 Taro.request */
export async function request<T = any>(
	url: string,
	options: {
		method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
		data?: any
	} = {},
): Promise<T> {
	const { method = 'GET', data } = options

	// 读取登录态 token
	const token = Taro.getStorageSync('LOGIN_TOKEN') || ''

	try {
		// 防止缓存：GET 请求添加时间戳
		let requestUrl = `${BASE_URL}${url}`
		if (method === 'GET') {
			requestUrl += (requestUrl.indexOf('?') > -1 ? '&' : '?') + `_t=${Date.now()}`
		}

		const res = await Taro.request<ApiResponse<T>>({
			url: requestUrl,
			method,
			data,
			header: {
				'Content-Type': 'application/json',
				'X-Token': token,
			},
		})

		const body = res.data

		// 统一处理业务错误
		if (body.code !== 0) {
			Taro.showToast({
				title: body.message || '请求失败',
				icon: 'none',
				duration: 2000,
			})
			throw new Error(body.message)
		}

		return body.data
	} catch (error: any) {
		// 网络错误
		if (!error.message || error.message === 'request:fail') {
			Taro.showToast({
				title: '网络连接失败',
				icon: 'none',
				duration: 2000,
			})
		}
		throw error
	}
}
