import { useState, useRef, useEffect, useCallback } from 'react'
import { View, Input, Button, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import {
	setLogin,
	getLoginFailCount,
	setLoginFailCount,
	setLoginLockExpire,
	clearLoginLock,
	isLoginLocked,
	getLoginLockRemaining,
	LOGIN_MAX_FAIL,
	LOGIN_LOCK_SEC,
} from '../../utils/auth'
import './index.scss'

const FIXED_USERNAME = 'admin'
const FIXED_PASSWORD = '123456'

export default function Login() {
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [loading, setLoading] = useState(false)
	const [showPassword, setShowPassword] = useState(false)
	const [errorMsg, setErrorMsg] = useState('')
	const [countdown, setCountdown] = useState(0)
	const [locked, setLocked] = useState(false)

	const timerRef = useRef<ReturnType<typeof setTimeout>[]>([])
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const unmountedRef = useRef(false)

	const stopCountdown = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current)
			intervalRef.current = null
		}
	}, [])

	const startCountdown = useCallback((remaining: number) => {
		stopCountdown()
		if (remaining <= 0) {
			setLocked(false)
			setCountdown(0)
			return
		}
		setLocked(true)
		setCountdown(remaining)

		intervalRef.current = setInterval(() => {
			if (unmountedRef.current) {
				stopCountdown()
				return
			}
			const sec = getLoginLockRemaining()
			if (sec <= 0) {
				stopCountdown()
				clearLoginLock()
				setLocked(false)
				setCountdown(0)
				setErrorMsg('')
				return
			}
			setCountdown(sec)
		}, 1000)
	}, [stopCountdown])

	useEffect(() => {
		if (isLoginLocked()) {
			startCountdown(getLoginLockRemaining())
		}
		return () => {
			unmountedRef.current = true
			timerRef.current.forEach(clearTimeout)
			timerRef.current = []
			stopCountdown()
		}
	}, [startCountdown, stopCountdown])

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

		if (isLoginLocked()) {
			setCountdown(getLoginLockRemaining())
			return
		}

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
				clearLoginLock()
				stopCountdown()
				setLocked(false)
				setCountdown(0)
				setLogin()
				Taro.showToast({ title: '登录成功', icon: 'success', duration: 1000 })
				pushTimer(() => {
					Taro.switchTab({ url: '/pages/home/index' })
				}, 1000)
				return
			}

			const newCount = getLoginFailCount() + 1

			if (newCount >= LOGIN_MAX_FAIL) {
				const expireTs = Date.now() + LOGIN_LOCK_SEC * 1000
				setLoginFailCount(newCount)
				setLoginLockExpire(expireTs)
				startCountdown(LOGIN_LOCK_SEC)
				setErrorMsg(`连续错误${LOGIN_MAX_FAIL}次，请${LOGIN_LOCK_SEC}秒后重试`)
			} else {
				setLoginFailCount(newCount)
				const remain = LOGIN_MAX_FAIL - newCount
				setErrorMsg(`账号或密码错误，还剩${remain}次机会`)
			}

			setLoading(false)
		}, 500)
	}, [loading, username, password, pushTimer, startCountdown, stopCountdown])

	const handleUsernameChange = useCallback((e) => {
		setUsername(e.detail.value)
		setErrorMsg('')
	}, [])

	const handlePasswordChange = useCallback((e) => {
		setPassword(e.detail.value)
		setErrorMsg('')
	}, [])

	const btnDisabled = loading || locked
	let btnText = '登 录'
	if (loading) btnText = '登录中...'
	else if (locked) btnText = `${countdown}s 后重试`

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

				{locked && countdown > 0 ? (
					<View className='lock-msg'>
						<Text className='lock-msg-icon'>🔒</Text>
						<Text className='lock-msg-text'>
							连续错误{LOGIN_MAX_FAIL}次，请{countdown}秒后重试
						</Text>
					</View>
				) : errorMsg ? (
					<View className='error-msg'>{errorMsg}</View>
				) : null}

				<Button
					className={`login-btn${locked ? ' login-btn--locked' : ''}`}
					loading={loading}
					disabled={btnDisabled}
					hoverClass={locked ? '' : 'login-btn-hover'}
					onClick={handleLogin}
				>
					{btnText}
				</Button>
			</View>

			<View className='login-footer'>
				<View className='footer-text'>请输入账号和密码登录</View>
			</View>
		</View>
	)
}
