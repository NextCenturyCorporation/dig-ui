/*
 * Copyright 2018 Next Century Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
var del = require('del');
var livereload = require('gulp-livereload');
var merge = require('merge-stream');
var nodemon = require('gulp-nodemon');
var path = require('path');
var runSequence = require('run-sequence');

var packageJson = require('./package.json');
var ensureFiles = require('./tasks/ensure-files.js');

var localConfig = {};
try {
  localConfig = require('./server/config/local.env');
} catch(e) {}

var version = '0.0.0';
try {
  var packageJson = require('./package.json');
  if(packageJson && packageJson.version) {
    version = packageJson.version;
  }
} catch(e) {}

var AUTOPREFIXER_BROWSERS = [
  'ie >= 10',
  'ie_mob >= 10',
  'ff >= 30',
  'chrome >= 34',
  'safari >= 7',
  'opera >= 23',
  'ios >= 7',
  'android >= 4.4',
  'bb >= 10'
];

var DIST = 'dist';

var dist = function(subpath) {
  return !subpath ? DIST : path.join(DIST, subpath);
};

var styleTask = function(stylesPath, srcs) {
  return gulp.src(srcs.map(function(src) {
      return path.join('app', stylesPath, src);
    }))
    .pipe($.changed(stylesPath, {extension: '.css'}))
    .pipe($.autoprefixer(AUTOPREFIXER_BROWSERS))
    .pipe(gulp.dest('.tmp/' + stylesPath))
    .pipe($.minifyCss())
    .pipe(gulp.dest(dist(stylesPath)))
    .pipe($.size({title: stylesPath}));
};

var imageOptimizeTask = function(src, dest) {
  return gulp.src(src)
    .pipe($.imagemin({
      progressive: true,
      interlaced: true
    }))
    .pipe(gulp.dest(dest))
    .pipe($.size({title: 'images'}));
};

var optimizeHtmlTask = function(src, dest) {
  var assets = $.useref.assets({
    searchPath: ['.tmp', 'app']
  });

  return gulp.src(src)
    .pipe(assets)
    // Concatenate and minify JavaScript
    .pipe($.if('*.js', $.uglify({
      preserveComments: 'some'
    })))
    // Concatenate and minify styles
    // In case you are still using useref build blocks
    .pipe($.if('*.css', $.minifyCss()))
    .pipe(assets.restore())
    .pipe($.useref())
    // Minify any HTML
    .pipe($.if('*.html', $.minifyHtml({
      quotes: true,
      empty: true,
      spare: true
    })))
    // Output files
    .pipe(gulp.dest(dest))
    .pipe($.size({
      title: 'html'
    }));
};

gulp.task('jslint', function() {
  return gulp.src([
      'app/*.html',
      'app/behaviors/*.js',
      'app/elements/**/*.html',
      'app/test/*.html',
      'app/transforms/*.js',
      'gulpfile.js'
    ])
    .pipe(livereload())

    // Extract the scripts from the HTML files for JSHint using its own extract function.
    .pipe($.jshint.extract())
    .pipe($.jshint())
    .pipe($.jshint.reporter())

    // Extract the scripts from the HTML files for JSCS using the gulp-html-extract task.
    .pipe($.if('*.html', $.htmlExtract({strip: true})))
    .pipe($.jscs())
    .pipe($.jscs.reporter('text'));
});

gulp.task('polylint', function() {
  return gulp.src([
      'app/elements/**/*.html'
    ])
    .pipe(livereload())
    .pipe($.polylint())
    .pipe($.polylint.reporter($.polylint.reporter.stylishlike))
    .pipe($.polylint.reporter.fail({buffer: true, ignoreWarnings: false}));
});

// Do not include polylint because it is slow and therefore should only be run on-demand.
gulp.task('lint', ['jslint']);

// Compile and automatically prefix stylesheets
gulp.task('minify-styles', function() {
  return styleTask('styles', ['**/*.css']);
});

// Ensure that we are not missing required files for the project
// "dot" files are specifically tricky due to them being hidden on
// some systems.
gulp.task('ensureFiles', function(cb) {
  var requiredFiles = ['.bowerrc'];

  ensureFiles(requiredFiles.map(function(p) {
    return path.join(__dirname, p);
  }), cb);
});

// Optimize images
gulp.task('optimize-images', function() {
  return imageOptimizeTask('app/images/**/*.*', dist('images'));
});

// Copy all files at the root level (app)
gulp.task('copy', function() {
  var app = gulp.src([
    'app/*',
    '!app/test',
    '!app/elements',
    '!app/bower_components',
    '!**/.DS_Store'
  ], {
    dot: true
  }).pipe(gulp.dest(dist()));

  // Copy over only the bower_components we need
  // These are things which cannot be vulcanized
  var bower = gulp.src([
    'app/bower_components/{webcomponentsjs,platinum-sw,sw-toolbox,promise-polyfill,leaflet,leaflet-map,lodash}/**/*'
  ]).pipe(gulp.dest(dist('bower_components')));

  var behaviors = gulp.src([
    'app/behaviors/*'
  ]).pipe(gulp.dest(dist('behaviors')));

  var sourceMaps = gulp.src([
    'app/bower_components/web-animations-js/web-animations-next-lite.min.js.map',
    'app/bower_components/shadycss/*.min.js.map',
    'app/bower_components/pdfmake/build/pdfmake.min.js.map'
  ]).pipe(gulp.dest(dist('elements')));

  return merge(app, behaviors, bower, sourceMaps)
    .pipe($.size({
      title: 'copy'
    }));
});

// Copy web fonts to dist
gulp.task('fonts', function() {
  return gulp.src(['app/fonts/**'])
    .pipe(gulp.dest(dist('fonts')))
    .pipe($.size({
      title: 'fonts'
    }));
});

// Scan your HTML for assets & optimize them
gulp.task('html', function() {
  return optimizeHtmlTask(
    ['app/**/*.html', '!app/{elements,test,bower_components}/**/*.html'],
    dist());
});

// Vulcanize granular configuration
gulp.task('vulcanize', function() {
  return gulp.src('app/elements/elements.html')
    .pipe($.vulcanize({
      stripComments: true,
      inlineCss: true,
      inlineScripts: true
    }))
    .pipe(gulp.dest(dist('elements-tmp')))
    .pipe($.size({title: 'vulcanize'}));
});

// Clean output directory
gulp.task('clean', function() {
  return del(['.tmp', dist()]);
});

gulp.task('elements', function() {
  return gulp.src('app/elements/**/*')
    .pipe(livereload());
});

gulp.task('images', function() {
  return gulp.src('app/images/**/*')
    .pipe(livereload());
});

gulp.task('pages', function() {
  return gulp.src('app/*.html')
    .pipe(livereload());
});

gulp.task('styles', function() {
  return gulp.src('app/styles/**/*')
    .pipe(livereload());
});

gulp.task('transforms', function() {
  return gulp.src('app/transforms/**/*')
    .pipe(livereload());
});

// Watch files for changes & reload
gulp.task('serve', ['lint', 'styles', 'elements', 'nodemon'], function() {
  livereload.listen();
  gulp.watch(['app/*.html'], ['pages']);
  gulp.watch(['app/elements/**/*'], ['elements']);
  gulp.watch(['app/images/**/*'], ['images']);
  gulp.watch(['app/styles/**/*'], ['styles', 'minify-styles']);
  gulp.watch(['app/transforms/**/*'], ['transforms']);
});

// Build and serve the output from the dist build
gulp.task('serve:dist', ['default', 'nodemon']);

// start express app and watch files
gulp.task('nodemon', function(cb) {

  var started = false;

  return nodemon({
    script: 'server/app.js',
    env: localConfig
  }).on('start', function() {
    if(!started) {
      cb();
      started = true;
    }
  });
});

// Build production files, the default task
gulp.task('default', ['clean'], function(cb) {
  runSequence(
    ['ensureFiles', 'copy', 'minify-styles'],
    ['lint', 'optimize-images', 'fonts', 'html'],
    'vulcanize',
    'version',
    cb);
});

// Build then deploy to GitHub pages gh-pages branch
gulp.task('build-deploy-gh-pages', function(cb) {
  runSequence(
    'default',
    'deploy-gh-pages',
    cb);
});

// Deploy to GitHub pages gh-pages branch
gulp.task('deploy-gh-pages', function() {
  return gulp.src(dist('**/*'))
    // Check if running task from Travis CI, if so run using GH_TOKEN
    // otherwise run using ghPages defaults.
    .pipe($.if(process.env.TRAVIS === 'true', $.ghPages({
      remoteUrl: 'https://$GH_TOKEN@github.com/polymerelements/polymer-starter-kit.git',
      silent: true,
      branch: 'gh-pages'
    }), $.ghPages()));
});

gulp.task('version', function() {
  gulp.src(dist('elements-tmp/elements.html'))
    .pipe($.replace('DIG_VERSION', version))
    .pipe(gulp.dest(dist('elements')));

  del(dist('elements-tmp'));
});

gulp.task('docker', ['default'], $.shell.task([
  'echo "Building docker container for digmemex/digui version ' + version + '"',
  'docker build -t digmemex/digui:' + version + ' .',
  'echo "Pushing docker container for digmemex/digui version ' + version + '"',
  'docker push digmemex/digui:' + version
]));
// Load tasks for web-component-tester
// Adds tasks for `gulp test:local` and `gulp test:remote`
require('web-component-tester').gulp.init(gulp, ['lint']);

// Overwrite the test task to call the lint task and the web-component-tester.
gulp.task('test', ['lint', 'test:local']);

// Load custom tasks from the `tasks` directory
try {
  require('require-dir')('tasks');
} catch(err) {}
