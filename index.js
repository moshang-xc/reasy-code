#!/usr/bin/env node

const cfg = require('./package.json')

const axios = require('axios');

const inquirer = require("inquirer");

// let url = "http://192.168.80.215:8929/api/v4/projects";

// const token = "private_token=8sx97pqLQjxR4BU6tmpH"; //令牌

// const codeName = "security-system-admin"; //代码线名称

// const branch = "develop_web"; //分支名称

// let startHash = "";

// let endHash = "";

let startPage = 1;

let endPage = 5;

const pageCount = 100;

let hasData = true;

let isRange = '';

let isHash;

let id,
    url,
    token,
    codeName,
    branch,
    startHash,
    endHash;

let count = {};

function init() {
    if (process.argv[2].toLocaleLowerCase() == '-v') {
        console.log("版本号：" + cfg.version);
        return;
    }

    console.log("请输入以下配置：")

    const prompt = [
        {
            type: "input",
            message: "请输入代码路径：",
            name: "url",
            validate(value) {
                return !value.length ? new Error('必填') : true
            }
        },
        {
            type: "input",
            message: "请输入令牌：",
            name: "token",
            validate(value) {
                return !value.length ? new Error('必填') : true
            }
        },
        {
            type: "input",
            message: "请输入项目名称：",
            name: "codeName",
            validate(value) {
                return !value.length ? new Error('必填') : true
            }
        },
        {
            type: "input",
            message: "请输入分支名称：",
            name: "branch",
            validate(value) {
                return !value.length ? new Error('必填') : true
            }
        },
        {
            type: "input",
            message: "请输入起始哈希值（哈希值之后的提交，非必填）：",
            name: "startHash"
        },
        {
            type: "input",
            message: "请输入结束哈希值（哈希值之前的提交，非必填）：",
            name: "endHash"
        },
    ];

    inquirer.prompt(prompt).then((answer) => {

        url = answer.url.trim();
        token = "private_token=" + answer.token.trim();
        codeName = answer.codeName.trim();
        branch = answer.branch.trim();
        startHash = answer.startHash.trim();
        endHash = answer.endHash.trim();
        isHash = startHash.length || endHash.length;

        axios.get(url + "/?" + token)
            .then((response) => {
                response = response.data;
                id = "";
                response.forEach(element => {
                    if (element.name == codeName) {
                        id = element.id;
                    }
                });
                countCode();
            }, () => {
                console.log("请确认输入的信息是否正确！")
            })
    });
}

function countCode() {
    let promisePageArr = [];
    let promiseCountArr = [];

    let commitUrl;
    for (let i = startPage; i <= endPage; i++) {
        commitUrl = url + "/" + id + "/repository/commits?per_page=" + pageCount + "&page=" + i + "&ref_name=" + branch;
        promisePageArr.push(axios.get(commitUrl + "&" + token));
    }

    axios.all(promisePageArr)
        .then(axios.spread = (arr) => {
            arr.forEach((element) => {
                startPage = startPage + 5;
                endPage = endPage + 5;

                element.data.forEach((item) => {
                    let itemUrl = url + "/" + id + "/repository/commits/" + item.id;
                    promiseCountArr.push(axios.get(itemUrl + "?" + token));
                })

                if (element.data.length < pageCount) {
                    hasData = false;
                }
            })
            axios.all(promiseCountArr)
                .then(axios.spread = (countArr) => {
                    countArr.forEach((item) => {
                        item = item.data;
                        if ((item.id == endHash || !endHash.length) && isRange == '') {
                            isRange = "true";
                        }
                        if ((isRange == 'true' && isHash) || !isHash) {
                            if (!count[item.author_name]) {
                                count[item.author_name] = {
                                    "总代码量": 0,
                                    "增加代码量": 0,
                                    "删除代码量": 0
                                };
                            }
                            count[item.author_name]["总代码量"] += item.stats.total;
                            count[item.author_name]["增加代码量"] += item.stats.additions;
                            count[item.author_name]["删除代码量"] += item.stats.deletions;
                        }
                        if (item.id == startHash) {
                            isRange = "false";
                        }
                    })
                    if (hasData && isRange != 'false') {
                        countCode();
                    } else {
                        console.log(count);
                    }
                })

        })
}

init();




