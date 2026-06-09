import { parseDateText } from './dateParser'

export type SortMode = 'asc' | 'desc' | 'original'

export interface SortableItem {
	id: number | string
	dateText: string
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
	if (mode === 'original' || list.length <= 1) {
		return [...list]
	}

	const indexed: IndexedItem<T>[] = list.map((item, i) => ({
		original: item,
		originalIndex: i,
		parsed: parseDateText(item.dateText),
	}))

	const parsed = indexed.filter((x) => x.parsed.valid)
	const unparsed = indexed.filter((x) => !x.parsed.valid)

	parsed.sort((a, b) => {
		const ta = a.parsed.date!.getTime()
		const tb = b.parsed.date!.getTime()
		return mode === 'asc' ? ta - tb : tb - ta
	})

	return [...parsed, ...unparsed].map((x) => x.original)
}

export function groupByMonth<T extends SortableItem>(list: T[]): Map<string, T[]> {
	const groups = new Map<string, T[]>()

	for (const item of list) {
		const parsed = parseDateText(item.dateText)
		let key: string
		if (parsed.valid && parsed.year !== null && parsed.month !== null) {
			key = `${parsed.year}年${String(parsed.month).padStart(2, '0')}月`
		} else {
			key = '未知日期'
		}
		if (!groups.has(key)) {
			groups.set(key, [])
		}
		groups.get(key)!.push(item)
	}

	return groups
}
