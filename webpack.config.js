const path = require('path');

module.exports = {
	entry: './bin/www.ts',
	target: "node",
	mode: "development",
	node: {
		fs: "empty",
		tls: "empty",
		net: "empty"
	},
	resolve: {
		mainFields: ['module', 'main'],
		extensions: [ '.ts', '.js' ]
	},
	module: {
		rules: [
			{
				test: /\.ts?$/,
				use: 'ts-loader'
			}
		]
	},
	output: {
		filename: 'main.js',
		path: path.resolve(__dirname, 'dist')
	}
};