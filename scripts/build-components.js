const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const rehypePrism = require('@mapbox/rehype-prism');
const remarkContainer = require('remark-containers');
const chalk = require('chalk');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const { COMPONENT_DIR, SITE_DIR, DOCS_DIR, DOCS_ALIAS, COMPONENT_ALIAS, COMPONENT_PREFIX } = require('./doc.config');
const { getParentDirectory } = require('./utils');

const IS_COMPONENT_ALIAS = new RegExp(`^${COMPONENT_ALIAS}/`);

const compiler = webpack({
  mode: 'production',
  entry: fs.readdirSync(COMPONENT_DIR).reduce((map, name) => {
    if (!['global.less'].includes(name)) {
      map[name] = `./${COMPONENT_ALIAS}/${name}`;
    }
    return map;
  }, {}),
  output: {
    path: path.resolve('./lib'),
    filename: '[name]/index.js',
    library: ['@juexro/react-components', '[name]'],
    libraryTarget: 'umd',
    publicPath: '/'
  },
  devtool: false,
  externals: [
    'react',
    'react-dom',
    function ignorePeerComponent(context, request, callback) {
      if (IS_COMPONENT_ALIAS.test(request)) {
        if (getParentDirectory(context) === getParentDirectory(request)) {
          return callback(null, `commonjs ../${path.parse(request).name}`)
        }
      }
      callback();
    }
  ],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.mdx'],
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
          MiniCssExtractPlugin.loader,
          'css-loader', 'postcss-loader', 'less-loader',
          {
            loader: 'style-resources-loader',
            options: {
              patterns: [
                path.resolve(`${COMPONENT_DIR}/global.less`)
              ],
              injector: (source, resouces) => {
                return `@prefix: ${COMPONENT_PREFIX};`
                  + resouces.map(({ content }) => content).join('')
                  + source;
              }
            }
          }
        ],
        include: [SITE_DIR, COMPONENT_DIR]
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader']
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
    new webpack.EnvironmentPlugin({
      prefix: COMPONENT_PREFIX
    }),
    new CleanWebpackPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name]/style.css'
    })
  ],
  node: {
    setImmediate: false,
    dgram: 'empty',
    fs: 'empty',
    net: 'empty',
    tls: 'empty',
    child_process: 'empty'
  }
});

compiler.run((err, stats) => {
  if (err) {
    throw err;
  }

  process.stdout.write(stats.toString({
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false
  }) + '\n\n');

  console.log(chalk.cyan('Build complete.\n'));
});
