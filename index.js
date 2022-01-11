#!/usr/bin/env node

const axios = require('axios');

const inquirer = require("inquirer");

//数据从第1页开始获取
let page = 1;

//每页获取100条数据
const PAGECOUNT = 100;

//每次叠加页面数量
const STACK = 3;

//是否开始计算代码量
const STATE = {
    //0 初始状态
    INIT: 0,
    //1 计算代码量状态
    COUNTING: 1,
    //2 结束计算代码量
    END: 2
}

let status = STATE.INIT;

//项目名称和项目ID的映射
let projects = {},
    G_Data = {
        //项目ID
        id: "",
        //项目url
        url: "",
        //项目令牌
        token: "",
        //项目分支名称
        branch: "",
        //开始提交哈希值
        startHash: "",
        //结束提交哈希值
        endHash: ""
    }


let count = {};

const prompt = [
    {
        type: "input",
        message: "请输入代码路径：",
        name: "url",
        filter(value) {
            return value.trim();
        },
        validate(value) {
            if (value) {
                value = `${value}/api/v4/projects`;
                return axios.get(value).then(() => {
                    G_Data.url = value;
                    return true;
                }).catch((err) => {
                    return new Error(err);
                })
            }
            return new Error('必填');
        }
    },
    {
        type: "input",
        message: "请输入令牌：",
        name: "token",
        filter(value) {
            return value.trim();
        },
        validate(value) {
            if (value) {
                return axios.get(`${G_Data.url}/?private_token=${value}`).then((response) => {
                    G_Data.token = `private_token=${value}`;
                    //获取项目ID
                    response.data.forEach(element => {
                        projects[element.name] = element.id;
                    });
                    return true;
                }).catch((err) => {
                    return new Error(err);
                })
            }
            return new Error('必填');
        }
    },
    {
        type: "input",
        message: "请输入项目名称：",
        name: "codeName",
        filter(value) {
            return value.trim();
        },
        validate(value) {
            if (value) {
                //项目不存在，提示报错
                if (!projects[value]) {
                    return new Error('请确认输入的信息是否正确！');
                }
                return axios.get(`${G_Data.url}/${projects[value]}/repository/branches?${G_Data.token}`).then((response) => {
                    G_Data.id = projects[value];
                    //获取主线代码
                    response.data.forEach((item) => {
                        if (item.default) {
                            G_Data.branch = item.name;
                        }
                    })
                    return true;
                }).catch((err) => {
                    return new Error(err);
                })
            }
            return new Error('必填');
        }
    },
    {
        type: "input",
        message: "请输入分支名称（默认统计主线代码，非必填）：",
        name: "branch",
        filter(value) {
            return value.trim();
        },
        validate(value) {
            if (value) {
                return axios.get(`${G_Data.url}/${G_Data.id}/repository/commits?ref_name=${value}&${G_Data.token}`).then((response) => {
                    if (response.data.length > 0) {
                        G_Data.branch = value;
                        return true;
                    }

                    console.log(`\n分支不存在，代码统计为${G_Data.branch}分支`);
                    return true;
                }).catch((err) => {
                    return new Error(err);
                })
            }
            return true;
        }
    },
    {
        type: "input",
        message: "起始哈希值（开始统计的提交commits，非必填）：",
        name: "startHash",
        filter(value) {
            return value.trim();
        },
    },
    {
        type: "input",
        message: "结束哈希值（结束统计的提交commits，非必填）：",
        name: "endHash",
        filter(value) {
            return value.trim();
        },
    },
];

function countCode() {
    let promisePageArr = [];
    let promiseCountArr = [];

    //获取3页提交记录
    for (let i = page; i <= page + STACK; i++) {
        promisePageArr.push(axios.get(`${G_Data.url}/${G_Data.id}/repository/commits?per_page=${PAGECOUNT}&page=${i}&ref_name=${G_Data.branch}&${G_Data.token}`));
    }

    Promise.all(promisePageArr)
        .then(axios.spread = (arr) => {
            //获取每页的100条记录
            arr.forEach((element) => {
                page += STACK;

                element.data.forEach((item) => {
                    promiseCountArr.push(axios.get(`${G_Data.url}/${G_Data.id}/repository/commits/${item.id}?${G_Data.token}`));
                })
            })
        }).then(() => {
            return Promise.all(promiseCountArr)
        }).then(axios.spread = (countArr) => {
            for (let i = 0; i < countArr.length; i++) {
                let item = countArr[i].data;
                //如果输入结束哈希并且结束哈希不等于id，则不计算代码量，否则计算代码量
                if (G_Data.endHash) {
                    if (item.id == G_Data.endHash) {
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
                if (item.id == G_Data.startHash) {
                    status = STATE.END;
                    break;
                }
            }
            //如果没有值，结束计算
            if (countArr.length < STACK * PAGECOUNT) {
                status = STATE.END;
            }
        }).then(() => {
            if (status != STATE.END) {
                countCode();
            } else {
                console.table(Object.values(count));
            }
        })
}

module.exports = function init(data) {
    if (data) {
        // ({ url, token, codeName, branch, startHash, endHash } = data);
        G_Data = Object.assign(G_Data, data);
        //获取项目ID
        G_Data.token = `private_token=${G_Data.token}`;
        axios.get(`${G_Data.url}/?${G_Data.token}`).then((response) => {
            response.data.forEach(element => {
                if (element.name == G_Data.codeName) {
                    G_Data.id = element.id;
                }
            });
            countCode();
        })
    } else {
        console.log("请输入以下配置：");

        inquirer.prompt(prompt).then((answer) => {
            G_Data.startHash = answer.startHash;
            G_Data.endHash = answer.endHash;
            console.log("请稍后，正在计算中...");
            countCode();
        });
    }
};



