'use strict';

import gulp from 'gulp';
import browserSyncLib from 'browser-sync';
import pjson from './package.json';
import minimist from 'minimist';
import path from 'path';
import sourcemaps from 'gulp-sourcemaps';
import sass from 'gulp-sass';
import cssnano from 'gulp-cssnano';
import autoprefixer from 'gulp-autoprefixer';
import clean from 'gulp-clean';
import del from 'del';
import browserify from 'browserify';
import fs from 'fs';
import babelify from 'babelify';
import watchify from 'watchify';
import gutil from 'gulp-util';
import assign from 'lodash.assign';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import pug from 'gulp-pug';

const reload = browserSyncLib.reload;

const defaultNotification = function(err) {
  return {
    subtitle: err.plugin,
    message: err.message,
    sound: 'Funk',
    onLast: true,
  };
};

let config = Object.assign({}, pjson.config, defaultNotification);

let args = minimist(process.argv.slice(2));
let dirs = config.directories;
let taskTarget = args.production ? dirs.directories : dirs.temporary;

//create a new browserSync instance
let browserSync = browserSyncLib.create();

let entries = config.entries;
let dest = path.join(taskTarget, dirs.styles.replace(/^_/, ''));

const jsFile = path.join(dirs.source, dirs.scripts, entries.js);

const customOpts = {
	entries: jsFile,
	debug: true,
	transform: [
		babelify
	]
}

let opts = assign({}, watchify.args, customOpts);
let b = watchify(browserify(opts));

// task to build the js files
gulp.task('js', bundle);
b.on('update', bundle);
b.on('log', gutil.log);

gulp.task('sass', () => {
	gulp.src(path.join(dirs.source, dirs.styles, entries.css))
		.pipe(sourcemaps.init())
		.pipe(sass().on('error', sass.logError))
		.pipe(autoprefixer({
			browsers: ['last 2 versions'],
			cascade: false
		}))
		.pipe(cssnano())
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest(path.join(taskTarget, dirs.styles.replace(/^_/, ''))))
		.pipe(reload({stream: true}));
});

// Clean
gulp.task('clean', del.bind(null, [
	path.join(dirs.temporary),
	path.join(dirs.destination)
]));

gulp.task('pug', () => {
	gulp.src(path.join(dirs.source, entries.pug))
		.pipe(pug({
			pretty: true
		}))
		.pipe(gulp.dest(path.join(taskTarget)))
		.on('end', browserSyncLib.reload);
});

gulp.task('browsersync', () => {
	browserSyncLib({
		server: {
			baseDir: 'tmp'
		}
	})
});

gulp.task('watch', () => {
	gulp.watch(path.join(dirs.source, dirs.styles, entries.css), ['sass']);
	gulp.watch(path.join(dirs.source, entries.pug), ['pug']);
});

function bundle() {
	return b.bundle()
		.on('error', gutil.log.bind(gutil, 'Browserify Error'))
		.pipe(source(entries.js))
		.pipe(buffer())
		.pipe(sourcemaps.init({loadMaps: true}))
		.pipe(sourcemaps.write('./'))
		.pipe(gulp.dest(path.join(taskTarget, dirs.scripts.replace(/^_/, ''))));
}

gulp.task('default', [
	'js',
	'pug',
	'sass',
	'browsersync',
	'watch'
]);



