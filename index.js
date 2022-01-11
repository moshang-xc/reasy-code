#!/usr/bin/env node

const axios = require('axios');

const inquirer = require("inquirer");

//数据从第1页开始获取
let page = 1;

//每页获取100条数据
const pageCount = 100;

//判断是否还存在数据
let hasData = true;

//是否开始计算代码量
const STATE = {
    //0 初始状态
    INIT: 0,
    //1 计算代码量状态
    COUNTING: 1,
    //2 介绍计算代码量
    END: 2
}

let status = STATE.INIT;

//项目名称和项目ID的映射
let projects = {};

//项目ID
let id,
    //项目url
    url,
    //项目令牌
    token,
    //项目分支名称
    branch,
    //开始提交哈希值
    startHash,
    //结束提交哈希值
    endHash;

let count = {};

const prompt = [
    {
        type: "input",
        message: "请输入代码路径：",
        name: "url",
        validate(value) {
            value = value.trim();
            if (value) {
                value = value + "/api/v4/projects";
                return axios.get(value).then(() => {
                    url = value;
                    return true;
                }, (err) => {
                    return new Error(err)
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
            value = value.trim();
            if (value) {
                value = "private_token=" + value;
                return axios.get(url + "/?" + value).then((response) => {
                    token = value;
                    //获取项目ID
                    response = response.data;
                    response.forEach(element => {
                        projects[element.name] = element.id;
                    });
                    return true;
                }, (err) => {
                    return new Error(err)
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
                if (projects[value]) {
                    return axios.get(url + "/" + projects[value] + "/repository/branches?" + token).then((response) => {
                        id = projects[value];
                        response.data.forEach((item) => {
                            if (item.default) {
                                branch = item.name;
                            }
                        })
                        return true;
                    }, (err) => {
                        return new Error(err);
                    })
                } else {
                    return new Error('请确认输入的信息是否正确！');
                }
            } else {
                return new Error('必填')
            }
        }
    },
    {
        type: "input",
        message: "请输入分支名称（默认统计主线代码，非必填）：",
        name: "branch",
        validate(value) {
            value = value.trim();
            if (value) {
                return axios.get(url + "/" + id + "/repository/commits?ref_name=" + value + "&" + token).then((response) => {
                    if (response.data.length > 0) {
                        branch = value;
                        return true;
                    }
                    console.log('\n');
                    console.log('分支不存在，代码统计为' + branch + '分支');
                    return true;
                }, (err) => {
                    return new Error(err)
                })
            } else {
                return axios.get(url + "/" + id + "/repository/commits?ref_name=" + branch + "&" + token).then(() => {
                    return true;
                }, (err) => {
                    return new Error(err)
                })
            }
        }
    },
    {
        type: "input",
        message: "起始哈希值（开始统计的提交commits，非必填）：",
        name: "startHash"
    },
    {
        type: "input",
        message: "结束哈希值（结束统计的提交commits，非必填）：",
        name: "endHash"
    },
];

function countCode() {
    let promisePageArr = [];
    let promiseCountArr = [];

    //获取5页提交记录
    let commitUrl;
    for (let i = page; i <= page + 5; i++) {
        commitUrl = url + "/" + id + "/repository/commits?per_page=" + pageCount + "&page=" + i + "&ref_name=" + branch;
        promisePageArr.push(axios.get(commitUrl + "&" + token));
    }

    Promise.all(promisePageArr)
        .then(axios.spread = (arr) => {

            //获取每页的100条记录
            arr.forEach((element) => {
                page += 5;

                element.data.forEach((item) => {
                    let itemUrl = url + "/" + id + "/repository/commits/" + item.id;
                    promiseCountArr.push(axios.get(itemUrl + "?" + token));
                })
            })
        }).then(() => {
            return Promise.all(promiseCountArr)
        }).then(axios.spread = (countArr) => {
            for (let i = 0; i < countArr.length; i++) {
                item = countArr[i].data;

                //如果输入结束哈希并且结束哈希不等于id，则不计算代码量，否则计算代码量
                if (endHash) {
                    if (item.id == endHash) {
                        status = STATE.COUNTING;
                    }
                } else {
                    status = STATE.COUNTING;
                }

                if (status == STATE.COUNTING) {
                    if (!count[item.author_name]) {
                        count[item.author_name] = {
                            "名称": item.author_name,
                            "总代码量": 0,
                            "增加代码量": 0,
                            "删除代码量": 0
                        };
                    }
                    count[item.author_name]["总代码量"] += item.stats.total;
                    count[item.author_name]["增加代码量"] += item.stats.additions;
                    count[item.author_name]["删除代码量"] += item.stats.deletions;
                }
                //如果到达结束提交哈希值，结束计算
                if (item.id == startHash) {
                    status = STATE.END;
                    break;
                }
            }
            //如果没有值，结束计算
            if (countArr.length < 5 * pageCount) {
                status = STATE.END;
            }
        }).then(() => {
            if (hasData && status != STATE.END) {
                countCode();
            } else {
                console.table(Object.values(count));

            }
        })
}

module.exports = function init(data) {
    if (data) {
        ({ url, token, codeName, branch, startHash, endHash } = data);
        //获取项目ID
        token = "private_token=" + token;
        axios.get(url + "/?" + token).then((response) => {
            response = response.data;
            response.forEach(element => {
                if (element.name == codeName) {
                    id = element.id;
                }
            });
            countCode();
        })
    } else {
        console.log("请输入以下配置：");

        inquirer.prompt(prompt).then((answer) => {
            startHash = answer.startHash.trim();
            endHash = answer.endHash.trim();
            console.log("请稍后，正在计算中...");
            countCode();
        });
    }
};



