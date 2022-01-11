#!/usr/bin/env node
const init = require('./main.js');
const { version } = require('./package.json')

function start() {
    if (process.argv[2] && process.argv[2].toLocaleLowerCase() == '-v') {
        console.log("版本号：" + version);
        return;
    }
    init();
}

start();