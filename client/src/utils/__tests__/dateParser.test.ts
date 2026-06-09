import { describe, it, expect } from 'vitest'
import { parseDateText } from '../dateParser'

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

		it('handles spaces inside Chinese date format', () => {
			const result = parseDateText('2024 年 3 月 15 日')
			expect(result.valid).toBe(true)
			expect(result.year).toBe(2024)
			expect(result.month).toBe(3)
			expect(result.day).toBe(15)
		})
	})
})
