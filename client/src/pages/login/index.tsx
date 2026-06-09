import { useState, useRef, useEffect, useCallback } from 'react'
import { View, Input, Button, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { setLogin } from '../../utils/auth'
import './index.scss'

const FIXED_USERNAME = 'admin'
const FIXED_PASSWORD = '123456'

export default function Login() {
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [showPassword, setShowPassword] = useState(false)
	const [errorMsg, setErrorMsg] = useState('')

	const timerRef = useRef<ReturnType<typeof setTimeout>[]>([])
	const unmountedRef = useRef(false)

	useEffect(() => {
		return () => {
			unmountedRef.current = true
			timerRef.current.forEach(clearTimeout)
			timerRef.current = []
		}
	}, [])

	const pushTimer = useCallback((fn: () => void, delay: number) => {
		const id = setTimeout(() => {
			timerRef.current = timerRef.current.filter(t => t !== id)
			if (!unmountedRef.current) fn()
		}, delay)
		timerRef.current.push(id)
		return id
	}, [])

	const handleLogin = useCallback(() => {
		if (loading) return

		if (!username.trim()) {
			setErrorMsg('请输入账号')
			return
		}
		if (!password.trim()) {
			setErrorMsg('请输入密码')
			return
		}

		setLoading(true)
		setErrorMsg('')

		pushTimer(() => {
			if (username === FIXED_USERNAME && password === FIXED_PASSWORD) {
				setLogin()
				Taro.showToast({ title: '登录成功', icon: 'success', duration: 1000 })
				pushTimer(() => {
					Taro.switchTab({ url: '/pages/home/index' })
				}, 1000)
				return
			}

			setErrorMsg('账号或密码错误')
			setLoading(false)
		}, 500)
	}, [loading, username, password, pushTimer])

	const handleUsernameChange = useCallback((e) => {
		setUsername(e.detail.value)
		setErrorMsg('')
	}, [])

	const handlePasswordChange = useCallback((e) => {
		setPassword(e.detail.value)
		setErrorMsg('')
	}, [])

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
						onInput={handleUsernameChange}
						onConfirm={handleLogin}
					/>
				</View>

				<View className='input-group'>
					<View className='input-label'>密码</View>
					<View className='input-wrapper'>
						<Input
							className='input-field input-field--password'
							type={showPassword ? 'text' : 'safe-password'}
							password={!showPassword}
							placeholder='请输入密码'
							placeholderStyle='color: #bbb'
							value={password}
							onInput={handlePasswordChange}
							onConfirm={handleLogin}
						/>
						<View
							className='password-toggle'
							onClick={() => setShowPassword(v => !v)}
						>
							<Text className='password-toggle-icon'>
								{showPassword ? '🙈' : '👁️'}
							</Text>
						</View>
					</View>
				</View>

				{errorMsg ? <View className='error-msg'>{errorMsg}</View> : null}

				<Button
					className='login-btn'
					loading={loading}
					disabled={loading}
					hoverClass='login-btn-hover'
					onClick={handleLogin}
				>
					{loading ? '登录中...' : '登 录'}
				</Button>
			</View>

			<View className='login-footer'>
				<View className='footer-text'>请输入账号和密码登录</View>
			</View>
		</View>
	)
}
