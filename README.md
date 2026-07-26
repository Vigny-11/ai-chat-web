# AI聊天系统

一个本地优先的中文 AI 角色聊天网页。你可以创建多个角色，维护世界观、图片、服装、聊天记录和长期记忆。系统不包含登录、后台或付费数据库，数据默认保存在当前浏览器 IndexedDB 中。

## 功能介绍

- AI 服务初始化：只输入一个全局 API Key，测试成功后才能继续。
- 角色系统：创建、编辑、预览角色基础资料、性格资料和故事资料。
- 世界观系统：为角色维护年代、规则、组织、禁忌、局势等设定。
- 图片与服装：上传头像、全身图和多套服装，浏览器端压缩后保存到 IndexedDB。
- 聊天页面：响应式三栏/抽屉布局，支持流式输出、停止生成、重新生成、编辑和删除消息、复制回复、导出当前聊天。
- 知识边界：统一系统提示词要求角色不能使用设定之外的事实，未知内容必须明确表示不知道。
- 长期记忆：按间隔自动提取，也支持手动添加、编辑、删除、固定、禁用、搜索和筛选。
- 数据管理：本地优先保存到 IndexedDB，支持本地 ZIP 导入导出，也支持同步到用户自己的服务器。备份和同步都不包含 API Key。
- 设置页面：AI、聊天、数据、界面和数据服务器预留配置。

## 技术栈

Vue 3、Vite、TypeScript、Vue Router、Pinia、Tailwind CSS、Dexie.js、IndexedDB、Marked、DOMPurify、Lucide 图标、Node.js + Express 本地代理。

## 安装步骤

```bash
npm install
```

## 启动方法

```bash
npm run dev
```

该命令会启动 Vue 前端。部署到 Cloudflare Pages 后，接口由 `functions/api/` 下的 Pages Functions 提供，前端统一请求 `/api/test` 和 `/api/chat`。

## 构建方法

```bash
npm run build
```

## 预览构建

```bash
npm run preview
```

## AI 服务初始化

首次打开页面进入“AI 服务初始化页面”，只需要填写 API Key，然后点击“测试连接”。测试成功后点击“开始使用”进入角色创建页面。

普通用户界面不会显示 Base URL、模型、Temperature、Top P、Token Limit 或请求路径。系统会自动识别服务商并使用内置默认配置。不要把 API Key 写入源码、`.env.example` 或 GitHub 仓库。

## 数据保存位置

角色、图片、服装、世界观、会话、消息、长期记忆和设置默认保存在浏览器 IndexedDB：`ai_role_chat_system`。

API Key 默认只保存在 `sessionStorage`，关闭浏览器后清除。用户勾选“记住我的 API Key”后才会保存到 IndexedDB 的 `globalAIConfigs` 表。

## API Key 安全说明

- `.gitignore` 已忽略 `.env` 和本地敏感文件。
- `.env.example` 不包含真实 API Key。
- 前端源码不写死 API Key。
- 后端代理不会打印 API Key，错误信息会隐藏类似密钥格式的内容。
- Markdown 内容经过 DOMPurify 清理。

## 数据管理

进入“数据管理”页面：

- 查看本地角色、聊天记录、长期记忆、图片数量和估算占用空间。
- 点击“导出本地备份”生成 `角色世界AI备份_日期.zip`。
- ZIP 中包含 `data.json`，并包含 `characters/`、`outfits/`、`images/`、`conversations/`、`memories/` 等目录。
- 导入 ZIP 时会先检查 `data.json`、备份版本和必要字段。
- 可选择合并导入或覆盖导入。
- API Key 禁止写入备份，换设备后必须重新填写。

## 云端同步

系统不提供官方云端账号，也不需要登录。用户可以在“数据管理”中填写自己的服务器地址、访问密钥和同步路径。

当前同步接口约定：

- `HEAD 服务器地址/同步路径`：测试服务器连接。
- `PUT 服务器地址/同步路径`：上传 ZIP 备份。
- `GET 服务器地址/同步路径`：下载 ZIP 备份。

上传和下载的数据与本地备份格式一致，永远不包含 API Key。

## 常见问题

**没有 API Key 可以聊天吗？**  
不可以。必须填写 API Key 并测试连接成功。

**为什么角色说不知道？**  
系统提示词限制角色只能使用资料、世界观、记忆和当前聊天中确认的信息，设定之外的信息会被视为未知。

**是否需要服务器数据库？**  
不需要。第一版默认完全本地使用，数据服务器功能只预留配置界面和接口结构。

## 项目目录结构

```text
src/
  components/   公共组件
  views/        页面
  stores/       Pinia 状态
  services/     API 与记忆服务
  database/     Dexie 数据库与备份
  types/        TypeScript 数据模型
  utils/        工具函数
  router/       路由
  prompts/      系统提示词生成器
server/
  index.ts      Express 本地代理
  services/     OpenAI Compatible 请求转发
  utils/        错误处理
docs/
  数据库结构说明.md
  系统提示词结构说明.md
```
