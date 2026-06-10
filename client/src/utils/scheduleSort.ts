import { parseDateText } from './dateParser'

export type SortMode = 'asc' | 'desc' | 'original'

export interface SortableItem {
	id: number | string
	dateText: string
	completed?: boolean
	[key: string]: unknown
}

interface IndexedItem<T extends SortableItem> {
	original: T
	originalIndex: number
	parsed: ReturnType<typeof parseDateText>
}

export function sortScheduleList<T extends SortableItem>(
	list: T[],
	mode: SortMode
): T[] {
	if (list.length <= 1) {
		return [...list]
	}

	const pending = list.filter((item) => !item.completed)
	const completed = list.filter((item) => item.completed)

	function sortByDate<T extends SortableItem>(items: T[], sortMode: SortMode): T[] {
		if (sortMode === 'original' || items.length <= 1) {
			return [...items]
		}

		const indexed: IndexedItem<T>[] = items.map((item, i) => ({
			original: item,
			originalIndex: i,
			parsed: parseDateText(item.dateText),
		}))

		const parsed = indexed.filter((x) => x.parsed.valid)
		const unparsed = indexed.filter((x) => !x.parsed.valid)

		parsed.sort((a, b) => {
			const ta = a.parsed.date!.getTime()
			const tb = b.parsed.date!.getTime()
			return sortMode === 'asc' ? ta - tb : tb - ta
		})

		return [...parsed, ...unparsed].map((x) => x.original)
	}

	return [...sortByDate(pending, mode), ...sortByDate(completed, mode)]
}

export function groupByMonth<T extends SortableItem>(list: T[]): Map<string, T[]> {
	const groups = new Map<string, T[]>()

	for (const item of list) {
		const parsed = parseDateText(item.dateText)
		let key: string
		if (parsed.valid && parsed.year !== null && parsed.month !== null) {
			key = `${parsed.year}年${String(parsed.month).padStart(2, '0')}月`
		} else {
			key = '未识别日期'
		}
		if (!groups.has(key)) {
			groups.set(key, [])
		}
		groups.get(key)!.push(item)
	}

	return groups
}

export function groupSortedScheduleList<T extends SortableItem>(
	list: T[],
	mode: SortMode
): Map<string, T[]> {
	const sorted = sortScheduleList(list, mode)
	return groupByMonth(sorted)
}
