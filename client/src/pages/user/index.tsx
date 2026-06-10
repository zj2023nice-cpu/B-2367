import { useState, useRef } from 'react'
import { View, Image, Text, Input, Button, Textarea } from '@tarojs/components'
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

function sanitizeBio(raw: string): string {
	const trimmed = raw.trim()
	return trimmed.replace(/\s+/g, ' ')
}

function validateBio(raw: string): string | null {
	const sanitized = sanitizeBio(raw)
	if (sanitized.length > 60) return '简介最多60个字符'
	if (sanitized === '' && raw.length > 0) return '简介不能仅由空白组成'
	return null
}

function isWxfilePreview(url: string): boolean {
	return /^wxfile:\/\//i.test(url)
}

export default function User() {
	const [nickname, setNickname] = useState('')
	const [avatarUrl, setAvatarUrl] = useState('')
	const [bio, setBio] = useState('')
	const [editingNickname, setEditingNickname] = useState(false)
	const [editingBio, setEditingBio] = useState(false)
	const [tempNickname, setTempNickname] = useState('')
	const [tempBio, setTempBio] = useState('')
	const [saving, setSaving] = useState(false)
	const [updatingAvatar, setUpdatingAvatar] = useState(false)
	const [restoring, setRestoring] = useState(false)
	const pauseProfileSyncRef = useRef(false)

	useDidShow(() => {
		checkLoginGuard()
		fetchProfile()
	})

	const fetchProfile = async (force = false) => {
		try {
			const data = await request<{ nickname: string; avatarUrl: string; bio: string }>('/api/user/profile')
			if (data && (force || !pauseProfileSyncRef.current)) {
				setNickname(data.nickname)
				setAvatarUrl(data.avatarUrl || '')
				setBio(data.bio || '')
			}
		} catch (err) {
			console.error('获取用户资料失败', err)
		}
	}

	const buildPayload = (overrides: Partial<{ nickname: string; avatarUrl: string; bio: string }> = {}) => {
		const safeNickname = sanitizeNickname(overrides.nickname ?? nickname)
		const payloadAvatarUrl = isWxfilePreview(overrides.avatarUrl ?? avatarUrl) ? '' : (overrides.avatarUrl ?? avatarUrl)
		const safeBio = sanitizeBio(overrides.bio ?? bio)
		return { nickname: safeNickname, avatarUrl: payloadAvatarUrl, bio: safeBio }
	}

	const chooseAvatar = async () => {
		if (updatingAvatar || restoring) return

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

				const payload = buildPayload({ avatarUrl: tempPath })

				await request('/api/user/profile', {
					method: 'PUT',
					data: payload,
				})

				await fetchProfile(true)

				if (isWxfilePreview(tempPath)) {
					Taro.showToast({ title: '头像预览已保存，正式头像需上传至服务器', icon: 'none' })
				} else {
					Taro.showToast({ title: '头像已更新', icon: 'success' })
				}
			}
		} catch (err: any) {
			if (err.errMsg && err.errMsg.indexOf('cancel') !== -1) return
			console.error('选择头像失败', err)
			await fetchProfile(true)
		} finally {
			pauseProfileSyncRef.current = false
			setUpdatingAvatar(false)
		}
	}

	const startEditNickname = () => {
		if (restoring) return
		setTempNickname(nickname)
		setEditingNickname(true)
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
			const payload = buildPayload({ nickname: sanitized })
			await request('/api/user/profile', {
				method: 'PUT',
				data: payload,
			})
			await fetchProfile(true)
			setEditingNickname(false)
			Taro.showToast({ title: '保存成功', icon: 'success' })
		} catch (err) {
			console.error('保存昵称失败', err)
			await fetchProfile(true)
		} finally {
			setSaving(false)
		}
	}

	const startEditBio = () => {
		if (restoring) return
		setTempBio(bio)
		setEditingBio(true)
	}

	const saveBio = async () => {
		const error = validateBio(tempBio)
		if (error) {
			Taro.showToast({ title: error, icon: 'none' })
			return
		}

		const sanitized = sanitizeBio(tempBio)
		setSaving(true)
		try {
			const payload = buildPayload({ bio: sanitized })
			await request('/api/user/profile', {
				method: 'PUT',
				data: payload,
			})
			await fetchProfile(true)
			setEditingBio(false)
			Taro.showToast({ title: '保存成功', icon: 'success' })
		} catch (err) {
			console.error('保存简介失败', err)
			await fetchProfile(true)
		} finally {
			setSaving(false)
		}
	}

	const cancelEditNickname = () => {
		setEditingNickname(false)
	}

	const cancelEditBio = () => {
		setEditingBio(false)
	}

	const handleRestoreDefault = () => {
		if (restoring || saving || updatingAvatar) return

		Taro.showModal({
			title: '恢复默认资料',
			content: '确定要恢复默认资料吗？昵称、头像、个人简介都将恢复为初始默认值。',
			success: async (res) => {
				if (!res.confirm) return

				setRestoring(true)
				setEditingNickname(false)
				setEditingBio(false)
				pauseProfileSyncRef.current = true

				try {
					const data = await request<{ nickname: string; avatarUrl: string; bio: string }>('/api/user/profile/reset', {
						method: 'POST',
					})
					if (data) {
						setNickname(data.nickname)
						setAvatarUrl(data.avatarUrl || '')
						setBio(data.bio || '')
					} else {
						await fetchProfile(true)
					}
					Taro.showToast({ title: '已恢复默认资料', icon: 'success' })
				} catch (err) {
					console.error('恢复默认资料失败', err)
					Taro.showToast({ title: '恢复失败，请重试', icon: 'none' })
					await fetchProfile(true)
				} finally {
					pauseProfileSyncRef.current = false
					setRestoring(false)
				}
			},
		})
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
					{editingNickname ? (
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
							<Button className='cancel-btn' onClick={cancelEditNickname}>
								取消
							</Button>
						</View>
					) : (
						<View className='name-row' onClick={startEditNickname}>
							<Text className='nickname-text'>{nickname}</Text>
							<Text className='edit-icon'>✏️</Text>
						</View>
					)}
				</View>
				<View className='user-bio-wrap'>
					{editingBio ? (
						<View className='bio-edit-row'>
							<Textarea
								className='bio-textarea'
								value={tempBio}
								placeholder='请输入个人简介(最多60字)'
								maxlength={60}
								onInput={(e) => setTempBio(e.detail.value)}
								focus
							/>
							<View className='bio-edit-actions'>
								<Button className='save-btn bio-save-btn' loading={saving} onClick={saveBio} hoverClass='save-btn-hover'>
									保存
								</Button>
								<Button className='cancel-btn' onClick={cancelEditBio}>
									取消
								</Button>
							</View>
						</View>
					) : (
						<View className='bio-display' onClick={startEditBio}>
							<Text className='bio-text'>{bio || '点击添加个人简介'}</Text>
							{!bio && <Text className='bio-placeholder-icon'>✏️</Text>}
						</View>
					)}
				</View>
			</View>

			<View className='user-actions'>
				<Button
					className='restore-btn'
					hoverClass='restore-btn-hover'
					loading={restoring}
					disabled={restoring || saving || updatingAvatar}
					onClick={handleRestoreDefault}
				>
					恢复默认资料
				</Button>
				<Button className='logout-btn' hoverClass='logout-btn-hover' onClick={handleLogout}>
					退出登录
				</Button>
			</View>
		</View>
	)
}
