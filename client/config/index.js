const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001'

const config = {
	projectName: 'client',
	date: '2026-02-10',
	designWidth: 750,
	deviceRatio: {
		640: 2.34 / 2,
		750: 1,
		828: 1.81 / 2,
	},
	sourceRoot: 'src',
	outputRoot: 'dist',
	plugins: ['@tarojs/plugin-framework-react'],
	defineConstants: {
		'process.env.API_BASE_URL': JSON.stringify(API_BASE_URL),
	},
	copy: {
		patterns: [],
		options: {},
	},
	framework: 'react',
	compiler: 'webpack5',
	mini: {
		postcss: {
			pxtransform: {
				enable: true,
				config: {},
			},
			url: {
				enable: true,
				config: {
					limit: 1024,
				},
			},
			cssModules: {
				enable: false,
				config: {
					namingPattern: 'module',
					generateScopedName: '[name]__[local]___[hash:base64:5]',
				},
			},
		},
	},
}

module.exports = function (merge) {
	if (process.env.NODE_ENV === 'development') {
		return merge({}, config, require('./dev'))
	}
	return merge({}, config, require('./prod'))
}
