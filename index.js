#!/usr/bin/env node

const { version } = require('./package.json')

const axios = require('axios');

const inquirer = require("inquirer");

// let url = "http://192.168.80.215:8929/api/v4/projects";

// const token = "private_token=8sx97pqLQjxR4BU6tmpH"; //令牌

// const codeName = "security-system-admin"; //代码线名称

// const branch = "develop_web"; //分支名称

// let startHash = "";

// let endHash = "";

let page = 1; //数据从第1页开始获取

const pageCount = 100; //每页获取100条数据

let hasData = true; //判断是否还存在数据

let isRange = false; //是否在起始结束哈希值之间

let projects = {}; //项目名称和项目ID的映射

let id, //项目ID
    url, //项目url
    token, //项目令牌
    branch, //项目分支名称
    startHash, //开始提交哈希值
    endHash; //结束提交哈希值

let count = {};

function init() {
    // if (process.argv[2].toLocaleLowerCase() == '-v') {
    //     console.log("版本号：" + version);
    //     return;
    // }

    console.log("请输入以下配置：")

    const prompt = [
        {
            type: "input",
            message: "请输入代码路径：",
            name: "url",
            validate(value) {
                if (value) {
                    value = value.trim() + "/api/v4/projects";
                    return axios.get(value).then(() => {
                        url = value;
                        return true;
                    }, () => {
                        return new Error('请确认输入的信息是否正确！')
                    })
                } else {
                    return new Error('必填')
                }
            }
        },
        {
            type: "input",
            message: "请输入令牌：",
            name: "token",
            validate(value) {
                if (value) {
                    value = "private_token=" + value.trim();
                    return axios.get(url + "/?" + value).then((response) => {
                        token = value;
                        //获取项目ID
                        response = response.data;
                        response.forEach(element => {
                            projects[element.name] = element.id;
                        });
                        return true;
                    }, () => {
                        return new Error('请确认输入的信息是否正确！')
                    })
                } else {
                    return new Error('必填')
                }
            }
        },
        {
            type: "input",
            message: "请输入项目名称：",
            name: "codeName",
            validate(value) {
                value = value.trim();
                if (value) {
                    return axios.get(url + "/" + projects[value] + "/repository/branches?" + token).then(() => {
                        id = projects[value];
                        return true;
                    }, () => {
                        return new Error('请确认输入的信息是否正确！')
                    })
                } else {
                    return new Error('必填')
                }
            }
        },
        {
            type: "input",
            message: "请输入分支名称：",
            name: "branch",
            validate(value) {
                value = value.trim();
                if (value) {
                    return axios.get(url + "/" + id + "/repository/commits?ref_name=" + value + "&" + token).then((response) => {
                        if (response.data.length > 0) {
                            branch = value;
                            return true;
                        }
                        return new Error('请确认输入的信息是否正确！')
                    }, () => {
                        return new Error('请确认输入的信息是否正确！')
                    })
                } else {
                    return new Error('必填')
                }
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
        startHash = answer.startHash.trim();
        endHash = answer.endHash.trim();

        countCode();

    });
}

function countCode() {
    let promisePageArr = [];
    let promiseCountArr = [];

    //获取5页提交记录
    let commitUrl;
    for (let i = page; i < page + 5; i++) {
        commitUrl = url + "/" + id + "/repository/commits?per_page=" + pageCount + "&page=" + i + "&ref_name=" + branch;
        promisePageArr.push(axios.get(commitUrl + "&" + token));
    }

    axios.all(promisePageArr)
        .then(axios.spread = (arr) => {
            //获取每页的100条记录
            arr.forEach((element) => {
                page += 5;

                element.data.forEach((item) => {
                    let itemUrl = url + "/" + id + "/repository/commits/" + item.id;
                    promiseCountArr.push(axios.get(itemUrl + "?" + token));
                })

                //如果某一页少于100条，则后续没有数据记录
                if (element.data.length < pageCount) {
                    hasData = false;
                }
            })
            axios.all(promiseCountArr)
                .then(axios.spread = (countArr) => {
                    for (let i = 0; i < countArr.length; i++) {
                        item = countArr[i].data;

                        //如果输入结束哈希并且结束哈希不等于id，则不计算代码量，否则计算代码量
                        if (endHash) {
                            if (item.id == endHash) {
                                isRange = true;
                            }
                        } else {
                            isRange = true;
                        }

                        if (isRange) {
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
                            isRange = 'end';
                            break;
                        }
                    }
                    if (hasData && isRange != 'end') {
                        countCode();
                    } else {
                        console.log(count);
                    }
                })

        })
}

init();




