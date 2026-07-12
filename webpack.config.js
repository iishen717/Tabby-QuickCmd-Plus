const path = require('path')
const fs = require('fs')

// Tabby 用户插件目录
const tabbyPluginDir = 'C:/Users/iishen717/AppData/Roaming/tabby/plugins/node_modules/tabby-quick-command-plus/dist'

module.exports = {
  target: 'node',
  entry: './src/index.ts',
  devtool: 'source-map',
  context: __dirname,
  mode: 'development',
  output: {
    path: fs.existsSync(tabbyPluginDir) ? tabbyPluginDir : path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: 'webpack-tabby-quick-command-plus:///[resource-path]',
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
      },
      {
        test: /\.scss$/,
        use: ['style-loader', 'css-loader', 'sass-loader'],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.html$/,
        use: 'raw-loader',
      },
    ],
  },
  externals: [
    'fs', 'path', 'os', 'crypto', 'net', 'stream', 'readline', 'electron',
    /^rxjs/,
    /^@angular/,
    /^tabby-/,
  ],
}
