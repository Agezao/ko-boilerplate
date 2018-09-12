// Node modules
var fs = require('fs');
var vm = require('vm');
var merge = require('deeply');
var chalk = require('chalk');
var es = require('event-stream');
var path = require('path');
var url = require('url');
var slash = require('slash');

// Gulp and plugins
var gulp = require('gulp');
var rjs = require('gulp-requirejs-bundler');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var cleanCSS = require('gulp-clean-css');
var clean = require('gulp-clean');
var filter = require('gulp-filter');
var replace = require('gulp-replace');
var uglify = require('gulp-uglify');
var htmlreplace = require('gulp-html-replace');
var connect = require('gulp-connect');
var babelCore = require('babel-core');
var babel = require('gulp-babel');
var objectAssign = require('object-assign');

//-------------------------------------------
// Config
const sassEntities = ['node_modules/bootstrap/scss/bootstrap.scss', 'src/scss/index.scss', 'src/components/**/*.scss'];
var jsOutFile = 'index.min.js';

var requireJsRuntimeConfig = null;
var requireJsOptimizerConfig = null;
var transpilationConfig = null;
var babelIgnoreRegexes = null;

function setupRuntimeConfig() {
    requireJsRuntimeConfig = vm.runInNewContext(fs.readFileSync('src/app/require.config.js') + '; require;');
    requireJsOptimizerConfig = merge(requireJsRuntimeConfig, {
            out: jsOutFile,
            baseUrl: './src',
            name: 'app/startup',
            paths: {
                requireLib: '../node_modules/requirejs/require'
            },
            include: [
                'requireLib',
                'components/nav-bar/nav-bar',
                'components/home-page/home',
                'components/gh-list/gh-list',
                'components/gh-item/gh-item',
                'components/timer-component/timer',
                'text!components/about-page/about.html'
            ],
            insertRequire: ['app/startup'],
            bundles: {
                // If you want parts of the site to load on demand, remove them from the 'include' list
                // above, and group them into bundles here.
                // 'bundle-name': [ 'some/module', 'another/module' ],
                // 'another-bundle-name': [ 'yet-another-module' ]
            }
        });
    
    transpilationConfig = {
            root: 'src',
            skip: ['bower_modules/**', 'app/require.config.js'],
            babelConfig: {
                modules: 'amd',
                sourceMaps: 'inline'
            }
        };
    
    babelIgnoreRegexes = transpilationConfig.skip.map(function(item) {
            return babelCore.util.regexify(item);
        });
}

// Removes all files from ./dist/
gulp.task('clean', function() {
    return gulp.src('./dist/**/*', { read: false })
        .pipe(clean());
});

// Starts a simple static file server that transpiles ES6 on the fly to ES5
gulp.task('serve:src', function() {
    return connect.server({
        root: transpilationConfig.root,
        middleware: function(connect, opt) {
            return [
                 function (req, res, next) {                     
                     var pathname = path.normalize(url.parse(req.url).pathname);
                     babelTranspile(pathname, function(err, result) {
                        if (err) {
                            next(err);
                        } else if (result) {
                            res.setHeader('Content-Type', 'application/javascript');
                            res.end(result.code);
                        } else {
                            next();
                        }
                     });
                 }
            ];
        }
    });
});

function babelTranspile(pathname, callback) {
    pathname = slash(pathname);
    if (babelIgnoreRegexes.some(function (re) { return re.test(pathname); })) return callback();
    if (!babelCore.canCompile(pathname)) return callback();
    var src  = path.join(transpilationConfig.root, pathname);
    var opts = objectAssign({ sourceFileName: '/source/' + pathname }, transpilationConfig.babelConfig);
    babelCore.transformFile(src, opts, callback);
}

//-------------------------------------------
// Prod

// Pushes all the source files through Babel for transpilation
gulp.task('js:babel', function() {
    setupRuntimeConfig();
    
    return gulp.src(requireJsOptimizerConfig.baseUrl + '/**')
        .pipe(es.map(function(data, cb) {
            if (!data.isNull()) {
                babelTranspile(data.relative, function(err, res) {
                    if (res) {
                        data.contents = new Buffer(res.code);
                    }
                    cb(err, data);
                });
            } else {
                cb(null, data);
            }
        }))
        .pipe(gulp.dest('./temp'));
});

// Discovers all AMD dependencies, concatenates together all required .js files, minifies them
gulp.task('js:optimize', ['js:babel'], function() {
    var config = objectAssign({}, requireJsOptimizerConfig, { baseUrl: 'temp' });
    return rjs(config)
        .pipe(uglify({ preserveComments: 'some' }))
        .pipe(gulp.dest('./dist/'));    
})

// Builds the distributable .js files by calling Babel then the r.js optimizer
gulp.task('js', ['js:optimize'], function () {
    // Now clean up
    return gulp.src('./temp', { read: false }).pipe(clean());
});

gulp.task('sass', function () {
    return gulp.src(sassEntities)
        .pipe(sass().on('error', sass.logError))
        .pipe(concat('index.min.css'))
        .pipe(cleanCSS())
        .pipe(gulp.dest('./dist'));
});

// Copies index.html, replacing <script> and <link> tags to reference production URLs
gulp.task('html', function() {
    return gulp.src('./src/index.html')
        .pipe(htmlreplace({
            'css': 'index.min.css',
            'js': 'index.min.js'
        }))
        .pipe(gulp.dest('./dist/'));
});

gulp.task('default', ['html', 'js', 'sass'], function(callback) {
    callback();
    console.log('\nPlaced optimized files in ' + chalk.magenta('dist/\n'));
});

// After building, starts a trivial static file server
gulp.task('serve:dist', ['default'], function() {
    return connect.server({ root: './dist' });
});

//-------------------------------------------
// Dev

gulp.task('js:dev:babel', function() {
    jsOutFile = 'index.js';
    setupRuntimeConfig();

    return gulp.src(requireJsOptimizerConfig.baseUrl + '/**')
        .pipe(es.map(function(data, cb) {
            if (!data.isNull()) {
                babelTranspile(data.relative, function(err, res) {
                    if (res) {
                        data.contents = new Buffer(res.code);
                    }
                    cb(err, data);
                });
            } else {
                cb(null, data);
            }
        }))
        .pipe(gulp.dest('./temp'));
});

gulp.task('js:dev:optimize', ['js:dev:babel'], function() {
    var config = objectAssign({}, requireJsOptimizerConfig, { baseUrl: 'temp' });
    return rjs(config)
        .pipe(gulp.dest('./dist/'));
});

gulp.task('js:dev', ['js:dev:optimize'], function () {
    // Now clean up
    return gulp.src('./temp', { read: false }).pipe(clean());
});

gulp.task('sass:dev', function () {
    return gulp.src(sassEntities)
      .pipe(sass().on('error', sass.logError))
      .pipe(concat('index.css'))
      .pipe(gulp.dest('./dist'));
});

// Copies index.html, replacing <script> and <link> tags to reference production URLs
gulp.task('html:dev', function() {
    return gulp.src('./src/index.html')
        .pipe(htmlreplace({
            'css': 'index.css',
            'js': 'index.js'
        }))
        .pipe(gulp.dest('./dist/'));
});

gulp.task('dev', ['html:dev', 'js:dev', 'sass:dev'], function(callback) {
    callback();
    console.log('\nPlaced dev files in ' + chalk.magenta('dist/\n'));
});

gulp.task('serve:dev', ['dev'], function() {
    return connect.server({ root: './dist' });
});
