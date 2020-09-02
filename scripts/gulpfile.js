const gulp = require('gulp');
const babel = require('gulp-babel');
const less = require('gulp-less');
const autoprefixer = require('gulp-autoprefixer');
const cssnano = require('gulp-cssnano');
const through2 = require('through2');
const typescript = require('gulp-typescript');
const path = require('path');

const { getJrcConfig, getEnvConfig } = require('./utils');

const envConfig = getEnvConfig();
const { input: { componentDir }, output: { esmDir, cjsDir } } = getJrcConfig();

function setEnv() {
  Object.entries(envConfig).forEach(([k, v]) => {
    process.env[k] = v;
  });
}

const source = [path.join(componentDir, '**/*.{ts,tsx}')];
const ignore = [path.join(componentDir, '**/*.d.ts')];
const style = [path.join(componentDir, '**/*.less')];

gulp.task('copy:less', function() {
  return gulp
    .src(style)
    .pipe(gulp.dest(esmDir))
    .pipe(gulp.dest(cjsDir))
});

gulp.task('build:css', function() {
  return gulp
    .src(style)
    .pipe(less())
    .pipe(autoprefixer())
    // .pipe(cssnano())
    .pipe(gulp.dest(esmDir))
    .pipe(gulp.dest(cjsDir))
});

gulp.task('build:types', function() {
  const project = typescript.createProject({
    declaration: true,
    jsx: 'react',
    esModuleInterop: true,
    skipLibCheck: true
  });

  return gulp
    .src(source)
    .pipe(project())
    .dts
    .pipe(gulp.dest(esmDir))
    .pipe(gulp.dest(cjsDir))
});

function createCssJs() {
  return through2.obj(function(file, encoding, next) {
    this.push(file.clone());

    if (file.path.match(/(\/|\\)style(\/|\\)index\.js/)) {
      file.contents = Buffer.from(
        file.contents.toString(encoding)
          .replace(/\/style\//g, '/style/css')
          .replace(/\.less/g, '.css')
      );
      file.path = file.path.replace('index.js', 'css.js');
      this.push(file);
    }
    next();
  });
}

gulp.task('build:cjs', function() {
  setEnv();

  return gulp
    .src(source, { ignore })
    .pipe(babel({
      presets: [
        '@babel/env',
        '@babel/typescript',
        '@babel/react'
      ],
      plugins: [
        'transform-inline-environment-variables',
        '@babel/plugin-transform-runtime',
        '@babel/proposal-class-properties'
      ]
    }))
    .pipe(createCssJs())
    .pipe(gulp.dest(cjsDir))
});

gulp.task('build:esm', function() {
  setEnv();

  return gulp
    .src(source, { ignore })
    .pipe(babel({
      presets: [
        ['@babel/env', { modules: false }],
        '@babel/typescript',
        '@babel/react'
      ],
      plugins: [
        ['@babel/plugin-transform-runtime', { useESModules: true }],
        '@babel/proposal-class-properties'
      ]
    }))
    .pipe(createCssJs() )
    .pipe(gulp.dest(esmDir))
});

exports.default = gulp.series('copy:less', 'build:css', 'build:types', 'build:esm', 'build:cjs');