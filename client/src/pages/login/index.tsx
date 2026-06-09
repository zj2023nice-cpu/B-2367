import { useState } from 'react'
import { View, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { setLogin } from '../../utils/auth'
import './index.scss'

/** 演示环境固定账号 */
const FIXED_USERNAME = 'admin'
const FIXED_PASSWORD = '123456'

export default function Login() {
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)

	/** 处理登录 */
	const handleLogin = () => {
		// 非空校验
		if (!username.trim()) {
			Taro.showToast({ title: '请输入账号', icon: 'none' })
			return
		}
		if (!password.trim()) {
			Taro.showToast({ title: '请输入密码', icon: 'none' })
			return
		}

		setLoading(true)

		// 模拟登录延迟
		setTimeout(() => {
			if (username === FIXED_USERNAME && password === FIXED_PASSWORD) {
				setLogin()
				Taro.showToast({ title: '登录成功', icon: 'success', duration: 1000 })
				setTimeout(() => {
					Taro.switchTab({ url: '/pages/home/index' })
				}, 1000)
				return
			}

			Taro.showToast({ title: '账号或密码错误', icon: 'none', duration: 2000 })
			setLoading(false)
		}, 500)
	}

	return (
		<View className='login-page'>
			<View className='login-header'>
				<View className='login-logo'>🗺️</View>
				<View className='login-title'>特产日程</View>
				<View className='login-subtitle'>特产 · 日程 · 地图</View>
			</View>

			<View className='login-form'>
				<View className='input-group'>
					<View className='input-label'>账号</View>
					<Input
						className='input-field'
						type='text'
						placeholder='请输入账号'
						placeholderStyle='color: #bbb'
						value={username}
						onInput={(e) => setUsername(e.detail.value)}
					/>
				</View>

				<View className='input-group'>
					<View className='input-label'>密码</View>
					<Input
						className='input-field'
						type='text'
						password
						placeholder='请输入密码'
						placeholderStyle='color: #bbb'
						value={password}
						onInput={(e) => setPassword(e.detail.value)}
					/>
				</View>

				<Button
					className='login-btn'
					loading={loading}
					disabled={loading}
					hoverClass='login-btn-hover'
					onClick={handleLogin}>
					{loading ? '登录中...' : '登 录'}
				</Button>
			</View>

			<View className='login-footer'>
				<View className='footer-text'>请输入账号和密码登录</View>
			</View>
		</View>
	)
}
