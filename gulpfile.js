'use strict';

var fs = require('fs');
var path = require('path');

// 判断系统环境
var os = require('os');

var gulp = require('gulp');
var gutil = require('gulp-util');
var data = require('gulp-data');
var browserSync = require('browser-sync');
var ejs = require('gulp-ejs');
var replace = require('gulp-replace');

// 启动本地服务
var connect = require('gulp-connect');

// 打开浏览器
var gulpOpen = require('gulp-open');
// 同步执行任务
var runSequence = require('run-sequence');
// 只编译或打包改变过文件 -- 主要应用于图片
var changed = require('gulp-changed');

// 图片压缩
var imagemin = require('gulp-imagemin');
//清除
var clean = require('gulp-clean');
// sftp
var sftp = require('gulp-sftp');
// gulp-debug
// debug输出
var debug = require('gulp-debug');


// 起始路径、端口及首页
var host = {
    origin: 'http://localhost:',
    path: 'res/',
    port: 2017,
    html: '/html/index.html'
};

// 资源路径
var _localUrl = host.origin + host.port;
var _devUrl = '//ndevres.ingdan.com/edm/res';
var _testUrl = '//ntestres.ingdan.com/edm/res';
var _resUrl = '//nres.ingdan.com/edm/res';

// sftp 上传参数
var _sftpOpts = {
    host: 'ndevres.ingdan.com',
    user: 'cogoadmin',
    pass: 'ingdan.com',
    port: 22,
    remotePath: '/var/www/ingdanToutiao/wx/res/'
};

// 发布的资源路径
var _releasedUrl = '';


// 判断运行平台
var _pf = os.platform(),
    _browser = (_pf === 'linux' || _pf === 'darwin') ? 'Google chrome' : (
        _pf === 'win32' ? 'chrome' : 'firefox');
/*
 *
 *   清理生成目录
 *
 */
gulp.task('clean', function() {
    return gulp.src(['res']).pipe(clean());
});


//替换json文件中的路径
gulp.task('json', function(done) {
    gulp.src("dev/**/*.json")
        .pipe(replace(/@resUrl/g, _releasedUrl))
        .pipe(gulp.dest("res"))
        .on('end', done);
});
// 模版合并
gulp.task('ejs', ['json'], function(done) {
    gulp.src('dev/html/**/*.html')
        .pipe(data(function(file) {

            var filePath = file.path;

            // global.json 全局数据，页面中直接通过属性名调用
            /*return Object.assign(JSON.parse(fs.readFileSync('dev/json/global.json')), {
                // local: 每个页面对应的数据，页面中通过 local.属性 调用
                local: JSON.parse(fs.readFileSync('dev/json/index.json'))
            })*/
            return JSON.parse(fs.readFileSync('res/json/global.json'));
        }))
        .pipe(ejs().on('error', function(err) {
            gutil.log(err);
            this.emit('end');
        }))
        .pipe(gulp.dest("res/html"))
        .on('end', done);
});
// 图片处理
gulp.task('imagemin', function(done) {
    gulp.src(['dev/images/**/*'])
        .pipe(changed('res/images'))
        // 图片压缩
        .pipe(imagemin())
        .pipe(gulp.dest('res/images'))
        .on('end', done);
});



/*
 *
 *   服务 相关处理
 *
 */

// 启动本地服务器
gulp.task('connect', function() {
    console.log(connect)
    connect.server({
        root: host.path,
        port: host.port,
        livereload: false
    });
});

// 打开浏览器
gulp.task('open', function(done) {
    gulp.src('')
        .pipe(gulpOpen({
            app: _browser,
            uri: host.origin + host.port + host.html
        }))
        .on('end', done);
});

// 监听文件变动
gulp.task('watch', function(done) {
    // 无论是数据文件更改还是模版更改都会触发
    gulp.watch('dev/**/*', ['ejs']);

    done();
});
/*
 *
 *
 *   sftp上传
 *
 */
gulp.task('sftp', function(done) {
    // 判断，本地环境无需上传
    if (!_sftpOpts) {
        done();
        return false;
    }
    console.log(_sftpOpts)
        // 上传完成后的回调方法
    _sftpOpts.callback = function() {
        done();
    };

    gulp.src('res/**')
        .pipe(debug({
            title: '文件上传:'
        }))
        .pipe(sftp(_sftpOpts))
        .on('end', done);
});

/*
 *
 *   gulp 处理命令
 *
 */

// 未正式发布构建 - 用于本地，开发环境
gulp.task('unreleased', function(callback) {
    callback();

    console.log('_releasedUrl；' + _releasedUrl);

    runSequence(
        'ejs',
        'imagemin',
        'connect',
        'watch',
        'open',
        'sftp'
    );
});

// 正式发布构建 - 用于测试，生成环境
gulp.task('released', function(callback) {
    callback();

    console.log('_releasedUrl；' + _releasedUrl);

    runSequence(
        'ejs',
        'imagemin',
        'sftp'
    );
});

//  生产环境发布
gulp.task('res', ['released'], function(callback) {
    _releasedUrl = _resUrl;

    _releasedUrl = _resUrl;

    _sftpOpts.host = '10.1.0.36';
    _sftpOpts.pass = 'ingdanPass0624#';

    // 发布到预发布目录
    _sftpOpts.remotePath = '/var/www/edm/preview/';

});

//  测试环境发布
gulp.task('test', ['released'], function(callback) {
    _releasedUrl = _testUrl;

    _sftpOpts.host = 'ntestres.ingdan.com';
    _sftpOpts.pass = 'ingdantest';

});

// 开发环境
gulp.task('dev', ['unreleased'], function(callback) {
    _releasedUrl = _devUrl;
});


// 本地环境
gulp.task('default', ['unreleased'], function(callback) {
    _releasedUrl = _localUrl;
});
// 模块测试
gulp.task('demo', function(callback) {
    runSequence(
        // 'imagemin',
        'connect',
        // 'watch',
        // 'open',
        callback
    );
});