const path = require('path')
module.exports = {
  entry: './src/index.js',
  mode: 'development',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: 'temp/',   // 热更新
  },
  devServer: {
    contentBase: './',
    host: '127.0.0.1',
    compress: true,
    port: 8080
  },
  module: {
    rules: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: "babel-loader",
      options: {
        presets: ['es2015', 'react']
      }
    }]
  }
}