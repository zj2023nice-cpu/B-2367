declare namespace NodeJS {
	interface ProcessEnv {
		API_BASE_URL?: string
	}
}

declare module '*.jpg' {
	const src: string
	export default src
}

declare module '*.png' {
	const src: string
	export default src
}
