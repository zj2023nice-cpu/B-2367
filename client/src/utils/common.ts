import changfenImage from '../assets/images/changfen.jpg'
import duckImage from '../assets/images/duck.jpg'
import flowerImage from '../assets/images/flower.jpg'
import hotpotImage from '../assets/images/hotpot.jpg'
import landmarkImage from '../assets/images/landmark.jpg'
import mahuaImage from '../assets/images/mahua.jpg'
import placeholder1 from '../assets/images/placeholder1.jpg'
import placeholder2 from '../assets/images/placeholder2.jpg'
import placeholder3 from '../assets/images/placeholder3.jpg'
import placeholder4 from '../assets/images/placeholder4.jpg'
import placeholder5 from '../assets/images/placeholder5.jpg'
import placeholder6 from '../assets/images/placeholder6.jpg'
import placeholder7 from '../assets/images/placeholder7.jpg'
import roujiamoImage from '../assets/images/roujiamo.jpg'
import teaImage from '../assets/images/tea.jpg'
import tofuImage from '../assets/images/tofu.jpg'
import { BASE_URL } from '../services/request'

const LOCAL_IMAGE_MAP: Record<string, string> = {
	'/images/changfen.jpg': changfenImage,
	'/images/duck.jpg': duckImage,
	'/images/flower.jpg': flowerImage,
	'/images/hotpot.jpg': hotpotImage,
	'/images/landmark.jpg': landmarkImage,
	'/images/mahua.jpg': mahuaImage,
	'/images/placeholder1.jpg': placeholder1,
	'/images/placeholder2.jpg': placeholder2,
	'/images/placeholder3.jpg': placeholder3,
	'/images/placeholder4.jpg': placeholder4,
	'/images/placeholder5.jpg': placeholder5,
	'/images/placeholder6.jpg': placeholder6,
	'/images/placeholder7.jpg': placeholder7,
	'/images/roujiamo.jpg': roujiamoImage,
	'/images/tea.jpg': teaImage,
	'/images/tofu.jpg': tofuImage,
}

/**
 * 处理静态资源 URL
 * @param url 图片路径
 * @returns 可渲染图片地址
 */
export const resolveImageUrl = (url: string | undefined): string => {
	if (!url) return ''
	if (url.startsWith('http') || url.startsWith('wxfile')) return url

	const localImage = LOCAL_IMAGE_MAP[url]
	if (localImage) return localImage

	// 未命中本地映射时，回退到后端静态资源地址
	if (url.startsWith('/')) {
		return `${BASE_URL}${url}`
	}

	return url
}
