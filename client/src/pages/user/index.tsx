import { useState, useRef } from 'react'
import { View, Image, Text, Input, Button } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { request } from '../../services/request'
import { checkLoginGuard, clearLogin } from '../../utils/auth'
import { resolveImageUrl } from '../../utils/common'
import './index.scss'

export default function User() {
	const [nickname, setNickname] = useState('')
	const [avatarUrl, setAvatarUrl] = useState('')
	const [editing, setEditing] = useState(false)
	const [tempNickname, setTempNickname] = useState('')
	const [saving, setSaving] = useState(false)
	const [updatingAvatar, setUpdatingAvatar] = useState(false)
	const pauseProfileSyncRef = useRef(false)

	// 登录态守卫
	useDidShow(() => {
		checkLoginGuard()
		fetchProfile()
	})

	/** 获取用户资料 */
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

	/** 选择头像 */
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
				const safeNickname = nickname.trim() || '游客'

				// 选择头像回到页面时会触发 useDidShow，先暂停资料同步，避免旧数据把预览覆盖掉。
				pauseProfileSyncRef.current = true
				setAvatarUrl(tempPath)
				previewApplied = true

				await request('/api/user/profile', {
					method: 'PUT',
					data: { nickname: safeNickname, avatarUrl: tempPath },
				})

				setNickname(safeNickname)
				Taro.showToast({ title: '头像已更新', icon: 'success' })
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

	/** 开始编辑昵称 */
	const startEdit = () => {
		setTempNickname(nickname)
		setEditing(true)
	}

	/** 保存昵称 */
	const saveNickname = async () => {
		if (!tempNickname.trim()) {
			Taro.showToast({ title: '昵称不能为空', icon: 'none' })
			return
		}
		setSaving(true)
		try {
			await request('/api/user/profile', {
				method: 'PUT',
				data: { nickname: tempNickname.trim(), avatarUrl },
			})
			setNickname(tempNickname.trim())
			setEditing(false)
			Taro.showToast({ title: '保存成功', icon: 'success' })
		} catch (err) {
			console.error('保存昵称失败', err)
		} finally {
			setSaving(false)
		}
	}

	/** 退出登录 */
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

	return (
		<View className='user-page'>
			{/* 头部信息区 */}
			<View className='user-header'>
				<View className='avatar-wrap' onClick={chooseAvatar}>
					{avatarUrl ? (
						<Image className='avatar-img' src={resolveImageUrl(avatarUrl)} mode='aspectFill' />
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
								placeholder='请输入昵称'
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

			{/* 功能区 */}
			<View className='user-actions'>
				<Button className='logout-btn' hoverClass='logout-btn-hover' onClick={handleLogout}>
					退出登录
				</Button>
			</View>
		</View>
	)
}
