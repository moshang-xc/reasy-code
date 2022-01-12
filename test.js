const init = require('./main.js');
const { version } = require('./package.json')

//是否自定义输入
const isCustom = false;

const data = {
    url: "http://192.168.80.215:8929/api/v4/projects",
    token: "8sx97pqLQjxR4BU6tmpH",
    codeName: "security-system-admin",
    branch: "",
    startHash: "",
    endHash: ""
}

function start() {
    if (process.argv[2] && process.argv[2].toLocaleLowerCase() == '-v') {
        console.log("版本号：" + version);
        return;
    }
    isCustom ? init() : init(data);
}

start();