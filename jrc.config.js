const path = require('path');

module.exports = {
  port: 9000,
  input: {
    docsDir: './docs',
    siteDir: './site',
    componentDir: './components',
  },
  output: {
    esmDir: './es',
    cjsDir: './lib',
    siteDir: './document'
  },
  rewriteWebpackConfig(config) {
    config.resolve.alias = {
      '@/components': path.join(process.cwd(), './components'),
      '@/docs': path.join(process.cwd(), './docs')
    }
    return config;
  }
}