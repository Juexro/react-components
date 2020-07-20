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

const app = express();

const { SITE_DIR, COMPONENT_DIR, DOCS_DIR, DOCS_ALIAS, COMPONENT_ALIAS } = require('./doc.config');

const port = 9000;

const openUrl = `http://localhost:${port}`;

console.log(chalk.yellow('The development server is starting......wait me.'));

const compiler = webpack({
  mode: 'development',
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.mdx'],
    mainFiles: ['index'],
    alias: {
      [DOCS_ALIAS]: DOCS_DIR,
      [COMPONENT_ALIAS]: COMPONENT_DIR
    }
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        loader: ['babel-loader'],
        include: [SITE_DIR, COMPONENT_DIR]
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
        include: [SITE_DIR, COMPONENT_DIR]
      },
      {
        test: /\.less$/,
        use: [
          'style-loader',
          'css-loader', 'postcss-loader', 'less-loader',
          {
            loader: 'style-resources-loader',
            options: {
              patterns: [
                path.resolve(`${COMPONENT_DIR}/global.less`)
              ]
            }
          }
        ],
        include: [SITE_DIR, COMPONENT_DIR]
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
  },
  entry: ['webpack-hot-middleware/client?reload=true&noInfo=true', './site/src/main.tsx'],
  output: {
    publicPath: '/',
    path: path.resolve(__dirname, '../dist'),
    filename: 'static/js/[name].[hash].js',
    chunkFilename: 'static/js/[name].[chunkhash].js'
  },
  devtool: '#cheap-module-eval-source-map',
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
    })
  ]
});

const devMiddleware = webpackDevMiddleware(compiler, {
  publicPath: '/',
  // logLevel: 'silent'
});

const hotMiddleware = webpackHotMiddleware(compiler, {
  // log: false
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