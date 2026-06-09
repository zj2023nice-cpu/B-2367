import { useState, useRef } from 'react'
import { View, Image, Text, Input, Button } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { request } from '../../services/request'
import { checkLoginGuard, clearLogin } from '../../utils/auth'
import { resolveImageUrl } from '../../utils/common'
import './index.scss'

const EMOJI_ONLY_RE = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]*$/u

function sanitizeNickname(raw: string): string {
	const trimmed = raw.trim()
	return trimmed.replace(/\s+/g, ' ')
}

function validateNickname(raw: string): string | null {
	const sanitized = sanitizeNickname(raw)
	if (sanitized.length < 2) return '昵称至少2个字符'
	if (sanitized.length > 12) return '昵称最多12个字符'
	if (EMOJI_ONLY_RE.test(sanitized)) return '昵称不能只由表情或空白组成'
	return null
}

function isWxfilePreview(url: string): boolean {
	return /^wxfile:\/\//i.test(url)
}

export default function User() {
	const [nickname, setNickname] = useState('')
	const [avatarUrl, setAvatarUrl] = useState('')
	const [editing, setEditing] = useState(false)
	const [tempNickname, setTempNickname] = useState('')
	const [saving, setSaving] = useState(false)
	const [updatingAvatar, setUpdatingAvatar] = useState(false)
	const pauseProfileSyncRef = useRef(false)

	useDidShow(() => {
		checkLoginGuard()
		fetchProfile()
	})

	const fetchProfile = async () => {
		try {
			const data = await request<{ nickname: string; avatarUrl: string }>('/api/user/profile')
			if (data && !pauseProfileSyncRef.current) {
				setNickname(data.nickname)
				setAvatarUrl(data.avatarUrl || '')
			}
		} catch (err) {
			console.error('获取用户资料失败', err)
		}
	}

	const chooseAvatar = async () => {
		if (updatingAvatar) return

		let previewApplied = false
		setUpdatingAvatar(true)

		try {
			const res = await Taro.chooseImage({
				count: 1,
				sizeType: ['compressed'],
				sourceType: ['album', 'camera'],
			})
			if (res.tempFilePaths?.[0]) {
				const tempPath = res.tempFilePaths[0]
				const safeNickname = sanitizeNickname(nickname) || '游客'

				if (safeNickname.length < 2 || safeNickname.length > 12 || EMOJI_ONLY_RE.test(safeNickname)) {
					Taro.showToast({ title: '请先设置合法昵称', icon: 'none' })
					return
				}

				pauseProfileSyncRef.current = true
				setAvatarUrl(tempPath)
				previewApplied = true

				const payloadAvatarUrl = isWxfilePreview(tempPath) ? '' : tempPath

				await request('/api/user/profile', {
					method: 'PUT',
					data: { nickname: safeNickname, avatarUrl: payloadAvatarUrl },
				})

				setNickname(safeNickname)

				if (isWxfilePreview(tempPath)) {
					Taro.showToast({ title: '头像预览已保存，正式头像需上传至服务器', icon: 'none' })
				} else {
					Taro.showToast({ title: '头像已更新', icon: 'success' })
				}
			}
		} catch (err: any) {
			if (err.errMsg && err.errMsg.indexOf('cancel') !== -1) return
			console.error('选择头像失败', err)
			if (previewApplied) {
				pauseProfileSyncRef.current = false
				await fetchProfile()
			}
		} finally {
			pauseProfileSyncRef.current = false
			setUpdatingAvatar(false)
		}
	}

	const startEdit = () => {
		setTempNickname(nickname)
		setEditing(true)
	}

	const saveNickname = async () => {
		const error = validateNickname(tempNickname)
		if (error) {
			Taro.showToast({ title: error, icon: 'none' })
			return
		}

		const sanitized = sanitizeNickname(tempNickname)
		setSaving(true)
		try {
			const payloadAvatarUrl = isWxfilePreview(avatarUrl) ? '' : avatarUrl
			await request('/api/user/profile', {
				method: 'PUT',
				data: { nickname: sanitized, avatarUrl: payloadAvatarUrl },
			})
			setNickname(sanitized)
			setEditing(false)
			Taro.showToast({ title: '保存成功', icon: 'success' })
		} catch (err) {
			console.error('保存昵称失败', err)
		} finally {
			setSaving(false)
		}
	}

	const handleLogout = () => {
		Taro.showModal({
			title: '提示',
			content: '确定要退出登录吗？',
			success: (res) => {
				if (res.confirm) {
					clearLogin()
					Taro.redirectTo({ url: '/pages/login/index' })
				}
			},
		})
	}

	const displayAvatarUrl = isWxfilePreview(avatarUrl) ? avatarUrl : avatarUrl

	return (
		<View className='user-page'>
			<View className='user-header'>
				<View className='avatar-wrap' onClick={chooseAvatar}>
					{displayAvatarUrl ? (
						<Image className='avatar-img' src={resolveImageUrl(displayAvatarUrl)} mode='aspectFill' />
					) : (
						<View className='avatar-placeholder'>👤</View>
					)}
					<View className='avatar-edit-tip'>{updatingAvatar ? '更新中...' : '点击更换'}</View>
				</View>
				<View className='user-name-wrap'>
					{editing ? (
						<View className='edit-row'>
							<Input
								className='nickname-input'
								value={tempNickname}
								placeholder='请输入昵称(2-12字符)'
								onInput={(e) => setTempNickname(e.detail.value)}
								focus
							/>
							<Button className='save-btn' loading={saving} onClick={saveNickname} hoverClass='save-btn-hover'>
								保存
							</Button>
							<Button className='cancel-btn' onClick={() => setEditing(false)}>
								取消
							</Button>
						</View>
					) : (
						<View className='name-row' onClick={startEdit}>
							<Text className='nickname-text'>{nickname}</Text>
							<Text className='edit-icon'>✏️</Text>
						</View>
					)}
				</View>
			</View>

			<View className='user-actions'>
				<Button className='logout-btn' hoverClass='logout-btn-hover' onClick={handleLogout}>
					退出登录
				</Button>
			</View>
		</View>
	)
}
