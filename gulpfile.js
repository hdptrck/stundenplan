const gulp = require('gulp'),
    sass = require('gulp-sass'),
    concat = require('gulp-concat'),
    babel = require('gulp-babel'),
    minify = require('gulp-babel-minify'),
    cssmin = require('gulp-cssmin'),
    htmlmin = require('gulp-htmlmin');

gulp.task('minHtml', () => {
    return gulp.src('./index.html')
        .pipe(htmlmin({ collapseWhitespace: true }))
        .pipe(gulp.dest('dist'));
})

gulp.task('minCss', () => {
    return gulp.src('./css/*.css')
        .pipe(cssmin())
        .pipe(gulp.dest('./css/'))
        .pipe(gulp.dest('./dist/css/'));
})

gulp.task('minJs', () => {
    return gulp.src('./js/*.js')
        .pipe(babel({
            presets: ['babel-preset-env'],
            plugins: ['babel-plugin-transform-remove-console']
        }))
        .pipe(minify())
        .pipe(gulp.dest('./dist/js/'));
})

gulp.task('sass', function () {
    return gulp.src('./scss/*.scss')
        .pipe(sass())
        .pipe(gulp.dest('./css'));
})

gulp.task('minifyAll', gulp.series('minJs', 'minCss', 'minHtml'))