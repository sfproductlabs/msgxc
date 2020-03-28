/* eslint import/no-extraneous-dependencies: ["off"] */

const path = require('path');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const dotenv = require('dotenv');
const basePath = path.resolve(__dirname, '../');
const fs = require("fs");

new Promise((resolve,reject) => {
  fs.readFile(basePath + '/.env', function (err, data) {
    if (err) throw err;
    resolve(data)
  });
}).then((env) => {
  new WebpackDevServer(webpack({
    devtool: 'eval',
    entry: [
      'webpack-dev-server/client?http://localhost:3000',
      'webpack/hot/only-dev-server',
      'react-hot-loader/patch',
      './index'
    ],
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'bundle.js'
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env': JSON.stringify(dotenv.parse(env))
      }),
      new webpack.HotModuleReplacementPlugin(),
    ],
    resolve: {
      extensions: ['.js', '.jsx']
    },
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          loader: 'babel-loader',
          include: [
            path.join(__dirname, '../site'),
            path.join(__dirname, '../src'),
            path.join(__dirname, '../libs')
          ]
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.scss$/,
          use: ['style-loader', 'css-loader', 'sass-loader']
        },
        {
          test: /\.(eot|svg|ttf|woff|woff2)(\?.+)?$/,
          loader : 'file-loader'
        },
        {
          test: /\.(jpe?g|png|gif)(\?.+)?$/,
          loader : 'url-loader'
        },
        {
          test: /\.md$/,
          loader : 'raw-loader'
        }
      ]
    },
    mode: 'development'
  }), {
    publicPath: '/',
    hot: true,
    historyApiFallback: true,
    stats: { colors: true }
  }).listen(3000, 'localhost', error => {
    if (error) {
      throw error;
    }
  });
});


