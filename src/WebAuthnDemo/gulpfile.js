// <binding BeforeBuild='default' Clean='clean' />

const { watch } = require("gulp");
const { src, dest } = require("gulp");
const terser = require("gulp-terser");//.default;
const rename = require("gulp-rename");
const fs = require("fs");
const path = require('path');
const through = require('through2');
const rimraf = require("rimraf");
const { series } = require('gulp');
const ts = require("gulp-typescript");
const tsProject = ts.createProject("./tsconfig.json");
const sourcemaps = require('gulp-sourcemaps');

const paths = {
    webroot: "./wwwroot/",
    lib: "./wwwroot/lib/",
    css: "./wwwroot/css/lib/"
};

var roots = {
    libs: "./node_modules",
    appbase: "./wwwroot/js/",
    appjs: "**/*.js",
    appmins: "**/*.min.js",
    importmapbase: "/js/"
};

roots.appjs = roots.appbase + roots.appjs;
roots.appmins = roots.appbase + roots.appmins;

paths.modules = "./node_modules/";
paths.libs = [
    { name: "bootstrap", path: "/dist/js/bootstrap.min.js", css: true, cssMap: true, copyMap: true },
    { name: "jquery", path: "/dist/jquery.min.js" },
    { name: "jquery-validation", path: "/dist/jquery.validate.min.js" },
    { name: "jquery-validation", path: "/dist/additional-methods.min.js" },
    { name: "jquery-validation-unobtrusive", path: "/dist/jquery.validate.unobtrusive.min.js" },
    { name: "systemjs", path: "/dist/system.min.js" },
    { name: "popper.js", path: "/dist/umd/popper.js", copyMap: true },
    { name: "sweetalert2", path: "/dist/sweetalert2.js", css:true},
    { name: "sweetalert2", path: "/dist/sweetalert2.min.js", css:true}
];

function processTypeScript(cb) {
    //Enable to debug TS Options
    //console.log(tsProject.options);
    tsProject.src()
        .pipe(sourcemaps.init())
        .pipe(tsProject())
        .js
        .pipe(sourcemaps.write())
        .pipe(dest(tsProject.options.outDir))
        .on('finish', function () {
            cb();
        });
}

function minify(cb) {
    src([roots.appjs, `!${roots.appmins}`], { sourcemaps: true })
        .pipe(terser())
        .pipe(rename({ suffix: ".min" }))
        .pipe(dest(function (file) { return file.base; }, { sourcemaps: "." }))
        .on('finish', function () {
            cb();
        });
}

function importmapgen(cb) {
    // Every key in  importmap dictionary MUST be in lowercase, because there's a custom resolver in the _Layout.cshtml view
    var importmap = {
        "imports": {
            "sweetalert2": "/lib/sweetalert2/sweetalert2.js",
            "typescript-logging": "/lib/typescript-logging/typescript-logging-bundle.js"
        }
    };

    const rootPath = path.resolve(roots.appbase);

    src([roots.appjs, `!${roots.appmins}`])
        .pipe(through.obj(function (file, enc, cb) {
            const item = file.path.substr(file.path.lastIndexOf(rootPath) + 1 + rootPath.length);
            const plainName = item.substr(0, item.lastIndexOf(".")).replace("\\", "/").toLocaleLowerCase();
            importmap["imports"][plainName] = roots.importmapbase + item.replace("\\", "/");
            cb();
        })).on('finish', function () {
            return fs.writeFile(roots.appbase + "importmap.json", JSON.stringify(importmap), cb);
        });
    cb();
}

function watchChanges(cb) {
    watch("./Scripts/", processTypeScript);
}

function copyLib(cb) {
    var itemsProcessed = 0;
    paths.libs.forEach(function (jsLib, index) {
        console.log(paths.modules + jsLib.name + jsLib.path + " -> " + paths.lib + jsLib.name);
        src(paths.modules + jsLib.name + jsLib.path)
            .pipe(dest(paths.lib + jsLib.name))
            .on('error', (error) => {
                console.log(error.toString());
            });
        if (jsLib.copyMap) {
            console.log(paths.modules + jsLib.name + jsLib.path.replace(".js", ".js.map"));
            src(paths.modules + jsLib.name + jsLib.path.replace(".js", ".js.map"))
                .pipe(dest(paths.lib + jsLib.name))
                .on('error', (error) => {
                    console.log(error.toString());
                });
        }
        itemsProcessed++;
        if (itemsProcessed === paths.libs.length) {
            return cb();
        }
    });
    cb();
}

function copyCss(cb) {
    var itemsProcessed = 0;
    paths.libs.filter((l) => l.css).forEach(function (jsLib, index) {
        console.log(paths.modules + jsLib.name + jsLib.path + " -> " + paths.css + jsLib.name);
        src(paths.modules + jsLib.name + jsLib.path.replace(".js", ".css").replace("/js/", "/css/"))
            .pipe(dest(paths.css + jsLib.name))
            .on('error', function (error) {
                console.log(error.toString());
            });
        if (jsLib.cssMap) {
            src(paths.modules + jsLib.name + jsLib.path.replace(".js", ".css.map").replace("/js/", "/css/"))
                .pipe(dest(paths.css + jsLib.name))
                .on('error', function (error) {
                    console.log(error.toString());
                });
        }
        itemsProcessed++;
        if (itemsProcessed === paths.libs.length) {
            return cb();
        }
    });
    cb();
}

function clean(cb) {
    console.log(`Clean all files in lib folder: ${roots.appbase}*`);
    rimraf(roots.appbase + "*", cb);
    console.log(`Clean all files in lib folder: ${paths.lib}*`);
    rimraf(paths.lib + "*", cb);
}

exports.default = series(clean, processTypeScript, minify, importmapgen, copyLib, copyCss);
exports.copy = series(copyLib, copyCss);
exports.build = series(processTypeScript, minify, importmapgen);
exports.processTypeScript = processTypeScript;
exports.watch = watchChanges;
exports.clean = clean;