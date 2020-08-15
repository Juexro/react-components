const path = require('path');

module.exports = {
  port: 9000,
  docsDir: './docs',
  siteDir: './site',
  componentDir: './components',
  esmDir: './es',
  cjsDir: './lib',
  rewriteWebpackConfig(config) {
    config.resolve.alias = {
      '@/components': path.join(process.cwd(), './components'),
      '@/docs': path.join(process.cwd(), './docs')
    }
    return config;
  }
}