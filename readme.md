# 代码行数统计工具

#### 工具用于统计gitlab上项目提交代码行数



实现效果如图：

![result](https://github.com/reasyTeam/reasy-code/blob/master/assets/result.png)



### 安装

```
npm install @reasy-team/code -g
```



### 使用

```
reasy-code
```



### 参数说明

代码路径：存放在gitlab上的项目代码路径

![codePath](https://github.com/reasyTeam/reasy-code/blob/master/assets/codePath.png)



项目令牌：项目中的访问令牌

创建令牌

![codeToken](https://github.com/reasyTeam/reasy-code/blob/master/assets/token.png)

复制令牌

![codeToken](https://github.com/reasyTeam/reasy-code/blob/master/assets/codeToken.png)



项目名称：存放在gitlab上的项目名称

![codeName](https://github.com/reasyTeam/reasy-code/blob/master/assets/codeName.png)



分支名称：存放在gitlab上的项目分支的名称

![codeBranch](https://github.com/reasyTeam/reasy-code/blob/master/assets/codeBranch.png)



起始哈希值：此哈希值之后的代码提交统计，非必填

结束哈希值：此哈希值之前的代码提交统计，非必填

![codeHash](https://github.com/reasyTeam/reasy-code/blob/master/assets/codeHash.png)

