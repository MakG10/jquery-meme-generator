var gulp = require('gulp');
var uglify = require('gulp-uglify');
var less = require('gulp-less');
var cleanCSS = require('gulp-clean-css');
var gutil = require('gulp-util');
var rename = require('gulp-rename');

gulp.task('default', ['build']);

gulp.task('build', ['styles', 'scripts']);

gulp.task('styles', function() {
	gulp.src('./src/less/jquery.memegenerator.less')
		.pipe(less())
		.pipe(gulp.dest('./src/css'));
		
	gulp.src('src/css/jquery.memegenerator.css')
		.pipe(cleanCSS().on('error', gutil.log))
		.pipe(rename({suffix: '.min'}))
		.pipe(gulp.dest('./dist/'));
});

gulp.task('scripts', function() {
	gulp.src('src/js/jquery.memegenerator.js')
		.pipe(uglify({preserveComments: 'license'}).on('error', gutil.log))
		.pipe(rename({suffix: '.min'}))
		.pipe(gulp.dest('./dist/'));
});
