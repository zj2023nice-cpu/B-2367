module.exports = {
	env: {
		NODE_ENV: '"production"',
	},
	defineConstants: {
		'process.env.API_BASE_URL': JSON.stringify('http://localhost:3001'),
	},
	mini: {},
}
