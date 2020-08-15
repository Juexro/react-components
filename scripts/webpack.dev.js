const webpack = require('webpack');
const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const rehypePrism = require('@mapbox/rehype-prism');
const remarkContainer = require('remark-containers');

const express = require('express');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const { getEnvConfig, getJrcConfig, resolve } = require('./utils');

const envConfig = getEnvConfig();
const { port, siteDir, componentDir, rewriteWebpackConfig } = getJrcConfig();

const app = express();

const openUrl = `http://localhost:${port}`;

console.log(chalk.yellow('The development server is starting......wait me.'));

const compiler = webpack(rewriteWebpackConfig({
  mode: 'development',
  entry: ['webpack-hot-middleware/client?reload=true&noInfo=true', './site/src/main.tsx'],
  output: {
    publicPath: '/',
    path: path.resolve(__dirname, '../dist'),
    filename: 'static/js/[name].[hash].js',
    chunkFilename: 'static/js/[name].[chunkhash].js'
  },
  devtool: '#cheap-module-eval-source-map',
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.mdx'],
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        loader: ['babel-loader'],
        include: [siteDir, componentDir]
      },
      {
        test: /\.(md|mdx)$/,
        use: [
          'babel-loader', 
          {
            loader: '@mdx-js/loader',
            options: {
              remarkPlugins: [remarkContainer],
              rehypePlugins: [rehypePrism]
            }
          },
          path.resolve(__dirname, './utils/replace-loader')
        ]
      },
      {
        test: /\.(ts|tsx)$/,
        loader: ['ts-loader'],
        include: [siteDir, componentDir]
      },
      {
        test: /\.less$/,
        use: [
          'style-loader',
          'css-loader', 'postcss-loader', 'less-loader'
        ],
        include: [siteDir, componentDir]
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', 'postcss-loader']
      },
      {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'static/img/[name].[hash:7].[ext]'
        }
      },
      {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'static/media/[name].[hash:7].[ext]'
        }
      },
      {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
          name: 'static/fonts/[name].[hash:7].[ext]'
        }
      }
    ]
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new HtmlWebpackPlugin({
      template: 'site/index.html',
      filename: 'index.html',
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeAttributeQuotes: true
      }
    }),
    new webpack.EnvironmentPlugin(envConfig)
  ],
  optimization: {
    noEmitOnErrors: true
  },
  node: {
    setImmediate: false,
    dgram: 'empty',
    fs: 'empty',
    net: 'empty',
    tls: 'empty',
    child_process: 'empty'
  }
}));

const devMiddleware = webpackDevMiddleware(compiler, {
  publicPath: '/',
  logLevel: 'error'
});

const hotMiddleware = webpackHotMiddleware(compiler, {
  log: (str) => {
    console.clear();
    console.log(chalk.green(str));
  }
});

compiler.hooks.compilation.tap('html-webpack-plugin-after-emit', () => {
  hotMiddleware.publish({
    action: 'reload'
  });
});

app.use(devMiddleware);
app.use(hotMiddleware);

app.get('*', (req, res, next) =>{
  const filename = path.join(__dirname, '..', 'dist', 'index.html');
  compiler.outputFileSystem.readFile(filename, (err, result) =>{
    if(err){
        return(next(err));
    }
    res.set('content-type', 'text/html');
    res.send(result);
    res.end();
  });
})

devMiddleware.waitUntilValid(() => {
  console.log(chalk.yellow(`I am ready. open ${openUrl} to see me.`))
});

app.listen(port);