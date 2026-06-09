import { describe, it, expect } from 'vitest'
import { parseDateText } from '../dateParser'
import { sortScheduleList } from '../scheduleSort'

describe('parseDateText', () => {
	describe('valid full dates', () => {
		it('parses "2024年3月15日"', () => {
			const result = parseDateText('2024年3月15日')
			expect(result.valid).toBe(true)
			expect(result.year).toBe(2024)
			expect(result.month).toBe(3)
			expect(result.day).toBe(15)
			expect(result.date).toEqual(new Date(2024, 2, 15))
		})

		it('parses "2024年12月1日"', () => {
			const result = parseDateText('2024年12月1日')
			expect(result.valid).toBe(true)
			expect(result.year).toBe(2024)
			expect(result.month).toBe(12)
			expect(result.day).toBe(1)
		})

		it('parses "2024/3/15"', () => {
			const result = parseDateText('2024/3/15')
			expect(result.valid).toBe(true)
			expect(result.year).toBe(2024)
			expect(result.month).toBe(3)
			expect(result.day).toBe(15)
		})

		it('parses "2024-03-15"', () => {
			const result = parseDateText('2024-03-15')
			expect(result.valid).toBe(true)
			expect(result.year).toBe(2024)
			expect(result.month).toBe(3)
			expect(result.day).toBe(15)
		})

		it('parses "2024.03.15"', () => {
			const result = parseDateText('2024.03.15')
			expect(result.valid).toBe(true)
			expect(result.year).toBe(2024)
			expect(result.month).toBe(3)
			expect(result.day).toBe(15)
		})

		it('rejects invalid date "2024年2月30日"', () => {
			const result = parseDateText('2024年2月30日')
			expect(result.valid).toBe(false)
			expect(result.date).toBeNull()
		})

		it('rejects invalid date "2024年13月1日"', () => {
			const result = parseDateText('2024年13月1日')
			expect(result.valid).toBe(false)
		})
	})

	describe('missing year dates', () => {
		it('parses "3月15日" with current year', () => {
			const currentYear = new Date().getFullYear()
			const result = parseDateText('3月15日')
			expect(result.valid).toBe(true)
			expect(result.year).toBe(currentYear)
			expect(result.month).toBe(3)
			expect(result.day).toBe(15)
		})

		it('parses "12月1日" with current year', () => {
			const currentYear = new Date().getFullYear()
			const result = parseDateText('12月1日')
			expect(result.valid).toBe(true)
			expect(result.year).toBe(currentYear)
			expect(result.month).toBe(12)
			expect(result.day).toBe(1)
		})

		it('parses "3/15" with current year', () => {
			const currentYear = new Date().getFullYear()
			const result = parseDateText('3/15')
			expect(result.valid).toBe(true)
			expect(result.year).toBe(currentYear)
			expect(result.month).toBe(3)
			expect(result.day).toBe(15)
		})

		it('parses "03-15" with current year', () => {
			const currentYear = new Date().getFullYear()
			const result = parseDateText('03-15')
			expect(result.valid).toBe(true)
			expect(result.year).toBe(currentYear)
			expect(result.month).toBe(3)
			expect(result.day).toBe(15)
		})
	})

	describe('weekday suffix stripping', () => {
		it('parses "2026年04月18日 · 周六"', () => {
			const result = parseDateText('2026年04月18日 · 周六')
			expect(result.valid).toBe(true)
			expect(result.year).toBe(2026)
			expect(result.month).toBe(4)
			expect(result.day).toBe(18)
		})

		it('parses "2026年04月19日 · 周日"', () => {
			const result = parseDateText('2026年04月19日 · 周日')
			expect(result.valid).toBe(true)
			expect(result.year).toBe(2026)
			expect(result.month).toBe(4)
			expect(result.day).toBe(19)
		})

		it('parses "2026年05月01日 · 周五"', () => {
			const result = parseDateText('2026年05月01日 · 周五')
			expect(result.valid).toBe(true)
			expect(result.year).toBe(2026)
			expect(result.month).toBe(5)
			expect(result.day).toBe(1)
		})

		it('parses "2026年05月04日 · 周一"', () => {
			const result = parseDateText('2026年05月04日 · 周一')
			expect(result.valid).toBe(true)
			expect(result.year).toBe(2026)
			expect(result.month).toBe(5)
			expect(result.day).toBe(4)
		})

		it('parses "3月15日 星期五"', () => {
			const currentYear = new Date().getFullYear()
			const result = parseDateText('3月15日 星期五')
			expect(result.valid).toBe(true)
			expect(result.year).toBe(currentYear)
			expect(result.month).toBe(3)
			expect(result.day).toBe(15)
		})

		it('parses "2024年3月15日 星期三"', () => {
			const result = parseDateText('2024年3月15日 星期三')
			expect(result.valid).toBe(true)
			expect(result.year).toBe(2024)
			expect(result.month).toBe(3)
			expect(result.day).toBe(15)
		})

		it('parses "2024年3月15日 周三"', () => {
			const result = parseDateText('2024年3月15日 周三')
			expect(result.valid).toBe(true)
			expect(result.year).toBe(2024)
			expect(result.month).toBe(3)
			expect(result.day).toBe(15)
		})
	})

	describe('dirty / invalid inputs', () => {
		it('returns invalid for empty string', () => {
			const result = parseDateText('')
			expect(result.valid).toBe(false)
			expect(result.date).toBeNull()
		})

		it('returns invalid for random text', () => {
			const result = parseDateText('下周二出发')
			expect(result.valid).toBe(false)
			expect(result.date).toBeNull()
		})

		it('returns invalid for partial date', () => {
			const result = parseDateText('3月')
			expect(result.valid).toBe(false)
		})

		it('returns invalid for "今天"', () => {
			const result = parseDateText('今天')
			expect(result.valid).toBe(false)
		})

		it('returns invalid for "2024年"', () => {
			const result = parseDateText('2024年')
			expect(result.valid).toBe(false)
		})

		it('returns invalid for "待定"', () => {
			const result = parseDateText('待定')
			expect(result.valid).toBe(false)
		})

		it('returns invalid for whitespace-only input', () => {
			const result = parseDateText('   ')
			expect(result.valid).toBe(false)
		})

		it('returns invalid for weekday-only input like "周六"', () => {
			const result = parseDateText('周六')
			expect(result.valid).toBe(false)
		})

		it('returns invalid for legacy format "第三天 12:30"', () => {
			const result = parseDateText('第三天 12:30')
			expect(result.valid).toBe(false)
		})

		it('handles spaces inside Chinese date format', () => {
			const result = parseDateText('2024 年 3 月 15 日')
			expect(result.valid).toBe(true)
			expect(result.year).toBe(2024)
			expect(result.month).toBe(3)
			expect(result.day).toBe(15)
		})
	})
})

describe('sortScheduleList tail stability', () => {
	const items = [
		{ id: 1, dateText: '2026年05月02日 · 周六' },
		{ id: 2, dateText: '待定' },
		{ id: 3, dateText: '2026年04月18日 · 周六' },
		{ id: 4, dateText: '第三天 12:30' },
		{ id: 5, dateText: '2026年05月01日 · 周五' },
		{ id: 6, dateText: '下周二出发' },
	]

	it('asc: valid items sorted by date, invalid items keep original order at tail', () => {
		const result = sortScheduleList(items, 'asc')
		const ids = result.map((i) => i.id)
		expect(ids).toEqual([3, 5, 1, 2, 4, 6])
	})

	it('desc: valid items sorted by date descending, invalid items keep original order at tail', () => {
		const result = sortScheduleList(items, 'desc')
		const ids = result.map((i) => i.id)
		expect(ids).toEqual([1, 5, 3, 2, 4, 6])
	})

	it('original: returns items in original order unchanged', () => {
		const result = sortScheduleList(items, 'original')
		const ids = result.map((i) => i.id)
		expect(ids).toEqual([1, 2, 3, 4, 5, 6])
	})

	it('multiple invalid items never swap relative positions across asc/desc', () => {
		const ascResult = sortScheduleList(items, 'asc')
		const descResult = sortScheduleList(items, 'desc')
		const ascInvalidIds = ascResult.filter((i) => !parseDateText(i.dateText).valid).map((i) => i.id)
		const descInvalidIds = descResult.filter((i) => !parseDateText(i.dateText).valid).map((i) => i.id)
		expect(ascInvalidIds).toEqual([2, 4, 6])
		expect(descInvalidIds).toEqual([2, 4, 6])
	})
})
