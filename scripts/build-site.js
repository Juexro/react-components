const webpack = require('webpack');
const chalk = require('chalk');
const path = require('path');
const rehypePrism = require('@mapbox/rehype-prism');
const remarkContainer = require('remark-containers');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

const { getEnvConfig, getJrcConfig } = require('./utils');

const envConfig = getEnvConfig();
const { input: { siteDir, componentDir }, output, rewriteWebpackConfig } = getJrcConfig();

const compiler = webpack(rewriteWebpackConfig({
  mode: 'production',
  entry: ['./site/src/main.tsx'],
  output: {
    publicPath: '/',
    path: output.siteDir,
    filename: 'static/js/[name].[hash].js',
    chunkFilename: 'static/js/[name].[chunkhash].js'
  },
  devtool: false,
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
          MiniCssExtractPlugin.loader,
          'css-loader', 'postcss-loader', 'less-loader'
        ],
        include: [siteDir, componentDir]
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
    new HtmlWebpackPlugin({
      template: 'site/index.html',
      filename: 'index.html',
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeAttributeQuotes: true
      }
    }),
    new MiniCssExtractPlugin({
      filename: 'static/css/[name].css'
    }),
    new webpack.EnvironmentPlugin(envConfig)
  ],
  optimization: {
    noEmitOnErrors: true,
    runtimeChunk: {
      name: 'mainifest'
    },
    sideEffects: false,
    splitChunks: {
      chunks: 'all',
      minSize: 30000,
      minChunks: 1,
      maxAsyncRequests: 5,
      maxInitialRequests: 3,
      automaticNameDelimiter: '~',
      name: true,
      cacheGroups: {
        vendor: {
          test: /node_modules\/(.*)\.js/,
          name: 'vendors',
          chunks: 'initial',
          priority: -10,
          reuseExistingChunk: false
        },
        common: {
          test: 'common',
          chunks: 'initial',
          name: 'common'
        }
      }
    }
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
