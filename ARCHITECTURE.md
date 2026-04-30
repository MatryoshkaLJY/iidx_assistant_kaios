# PocketIIDX KaiOS App - 技术架构总结

## 1. 项目概述

PocketIIDX 是一款为 Nokia 2720（KaiOS 2.5.2）开发的 iidx.pro 数据查询应用。应用采用纯前端单页架构，所有页面在同一个 HTML 中通过 CSS 显隐切换，使用原生 JavaScript（兼容 Gecko 48）实现。

## 2. 技术约束与适配策略

| 约束 | 适配策略 |
|------|---------|
| KaiOS 2.5.2 (Gecko 48) | 避免所有 ES6+ 语法，使用 `var` + 传统函数声明 |
| 无 `async/await` | 纯回调驱动，所有异步操作通过 `callback(error, result)` 模式 |
| 无 `fetch` API | 使用 `XMLHttpRequest({ mozSystem: true })` 进行跨域请求 |
| 240x320 竖屏 | CSS 固定宽高，列表项限制高度，每屏 5~7 行 |
| ~256MB RAM | 歌曲库字段裁剪、搜索结果限制 100 条、难度表列表限制 200 条 |
| `privileged` 应用 | `manifest.webapp` 配置 `systemXHR` 权限 |

**关键兼容性处理：**
- `App.init()` 直接在内联脚本中调用，不依赖 `window.load` 事件（Gecko 48 中可能已错过）
- `Element.closest()` 替换为手动父节点遍历（KaiOS Gecko 48 可能缺失）
- SoftKey 同时监听 `SoftLeft`/`SoftRight` 和 `F1`/`F2` 键码

## 3. 架构设计

### 3.1 整体架构

```
+--------------------------------------------------+
|  index.html (单页容器，包含所有 page section)      |
|  + manifest.webapp (KaiOS 应用清单)                |
+--------------------------------------------------+
|  css/app.css (全局样式、KaiOS 原生风格)            |
+--------------------------------------------------+
|  js/utils.js      通用工具（搜索匹配、格式化）      |
|  js/storage.js    存储封装（token、曲库缓存）       |
|  js/api.js        XHR 封装 + Token 自动刷新         |
|  js/app.js        页面路由 + 导航栈 + 全局按键       |
+--------------------------------------------------+
|  js/pages/        各页面逻辑（状态机 + 渲染）       |
|    login.js       登录页                           |
|    menu.js        主菜单                           |
|    difficulty.js  难度表三级选择 + 歌曲列表          |
|    recommend.js   练习推荐                         |
|    search.js      歌曲搜索 + 本地缓存              |
|    song.js        歌曲详情                         |
+--------------------------------------------------+
```

### 3.2 页面生命周期

每个页面是一个 JavaScript 对象，实现以下可选钩子：

| 钩子 | 触发时机 |
|------|---------|
| `onShow(data)` | 页面显示时（含从其他页面返回） |
| `onEnter()` | 用户按确定键时 |
| `onArrowUp/Down/Left/Right()` | 方向键（未覆盖时默认移动焦点） |
| `onSoftLeft/Right()` | 软键 |
| `onBack()` | 返回键（返回 `true` 则拦截默认 pop 行为） |

### 3.3 导航栈

- `App.navStack` 维护页面访问顺序数组
- `App.showPage(pageId, data)` 切换页面并推入栈
- `App.goBack()` 弹出当前页，显示前一页
- 特殊页面（`diff-songs`, `rec-songs`）不通过 `showPage` 进入，直接操作 DOM 并手动 push，返回时由父页面 `onBack` 处理栈清理

## 4. 核心模块设计

### 4.1 API 层 (js/api.js)

```
Api.login(username, password, callback)
Api.getDifficultyTable(tableName, callback)
Api.getRecommendations(playStyle, mode, callback)
Api.getMusicList(callback)
Api.getMusicDetail(musicId, playStyle, chartDifficulty, callback)
```

**Token 自动刷新机制：**
1. 每个请求自动携带 `Authorization: Bearer {token}`
2. 收到 HTTP 401 时，静默调用 `POST /api/refresh`（依赖 HttpOnly Cookie）
3. 刷新成功：更新 `sessionStorage` 中的 token，无感重试原请求
4. 刷新失败：清除 token，回调返回 401 错误，页面层跳转登录页

**错误处理策略：**
- 网络请求失败时回调 `error` 对象，页面层决定是否提示用户
- 歌曲搜索的曲库加载失败时静默使用缓存数据

### 4.2 存储层 (js/storage.js)

| 存储 | 用途 | 键 |
|------|------|-----|
| `sessionStorage` | `access_token`（登录态，会话级） | `pocketiidx_token` |
| `localStorage` | 歌曲库缓存（裁剪字段后持久化） | `pocketiidx_music_cache` |

歌曲库缓存字段裁剪（从 ~900KB 原始响应精简）：
```js
{ musicId, title, plainTitle, artist, genre,
  lvSPB, lvSPN, lvSPH, lvSPA, lvSPL,
  lvDPB, lvDPN, lvDPH, lvDPA, lvDPL }
```

### 4.3 焦点与滚动管理 (js/app.js)

- 每个页面维护 `focusableItems`（`.list-item` 和 `.input-row`）
- 方向键上下移动焦点索引，`focused` CSS 类高亮当前项
- 焦点项自动滚动到可视区域（手动计算 `offsetTop` / `scrollTop`）

## 5. 功能页面设计

### 5.1 难度表查询 (difficulty.js)

**状态机：** `type` → `level` → `lamp` → `songs`

| 表类型 | 需要等级 | 需要灯种 |
|--------|---------|---------|
| 温火 (wenhuo) | 是 | 是 |
| ELO (elo) | 是 | 是 |
| PPI (ppi) | 是 | 否 |
| AAA (aaa) | 是 | 否 |
| SP12参考 (sp12) | 否 | 是 |
| CPI (cpi) | 否 | 是 |
| ZRIS (zris) | 是 | 否 |
| ERETER (ereter) | 否 | 是 |
| SNJ (snj) | 否 | 否 |
| 人气表 (popular) | 否 | 否 |

**等级规则：**
- SP 温火/PPI：1, 3~12（无 ★2）
- DP 温火/ELO/PPI：3, 5~12（无 ★1,2,4）
- 低等级（≤9）仅 CLEAR/H_CLEAR；高等级（10~12）增加 E_CLEAR/EXH_CLEAR
- ELO DP 等级 5 仅 CLEAR

**歌曲列表展示：**
- API 返回完整 `rank_groups`，前端按 key 分组
- 左右键循环切换分组，顶部 info-bar 显示当前分组名和歌曲数量
- 列表项显示：曲名 + Lv.等级难度 + 排名 + 个人通关状态

### 5.2 练习推荐 (recommend.js)

- 选择模式：热手 (`hot_hand`) / 进步 (`progress`) / 飞升 (`ascension`)
- 响应按 `recommendation_score` 降序排列
- 列表项显示：曲名 + Lv.等级难度 + 推荐度 + 通关概率

### 5.3 歌曲搜索 (search.js)

**懒加载策略：**
1. 首次进入搜索页时检查 `localStorage` 缓存
2. 无缓存：调用 `/api/music/list`，裁剪字段后存入 `localStorage`
3. 用户输入关键词后本地模糊匹配 `title` / `plainTitle` / `artist` / `genre`
4. 结果限制 100 条，避免 DOM 节点过多

**缓存刷新：** SoftKey Right 触发手动重新加载曲库。

**从详情返回保留状态：** `onShow` 不清空已有搜索结果。

### 5.4 歌曲详情 (song.js)

- 基本信息：`music_info`（曲名、艺术家、流派、SP/DP 各级难度）
- 谱面信息：`chart_info`（Note数、Radar：notes/scratch/peak/chord/charge/soflan）
- 难度表排名：平铺列出 `difficulty_tables` 全部表名及排名（按字母序），不折叠分组
- 成绩：最佳成绩（EX Score、DJ Level、通关状态、PPI）+ 最近成绩（最多 3 条）

## 6. 按键映射

| 按键 | 全局行为 | 页面特殊行为 |
|------|---------|------------|
| ↑/↓ | 移动焦点 | — |
| ←/→ | 默认无操作 | 难度表：切换 rank_group |
| 确定 (Enter) | 触发当前焦点项 | 登录页：提交登录；搜索页：执行搜索/选中结果 |
| 返回 (Back) | 导航栈 pop | 难度表/推荐：返回父选择页 |
| SoftLeft | 默认无操作 | 难度表歌曲页/推荐歌曲页：返回 |
| SoftRight | 默认无操作 | 搜索页：刷新曲库缓存 |

## 7. 性能优化策略

| 优化点 | 实现 |
|--------|------|
| 网络请求 | `XMLHttpRequest` + 回调，无 Promise 开销 |
| 曲库内存 | 字段裁剪，仅保留搜索/展示所需字段 |
| 曲库缓存 | `localStorage` 持久化，避免重复请求 900KB 数据 |
| 搜索结果 | 限制 100 条，减少 DOM 节点 |
| 难度表数据 | 按需请求，不预加载 |
| 图片资源 | 完全不加载 BGA/封面，纯文本展示 |
| 断网处理 | 搜索曲库静默使用缓存，不弹阻塞式错误提示 |

## 8. 已知问题与待办

### 8.1 当前已知问题

1. **手机白屏问题**：PC 浏览器可正常显示登录页，KaiOS 真机侧载后白屏。已修复 `window.load` 事件和 `Element.closest()` 兼容性，需验证是否解决。
2. **难度表歌曲列表无虚拟滚动**：单个 rank_group 歌曲过多时（数百首），DOM 节点可能过多。
3. **歌曲详情默认 SP 谱面**：从搜索页进入详情时固定选择最高可用 SP 难度，无法直接查看 DP 谱面。

### 8.2 潜在优化项

1. 为难度表歌曲列表增加分页或虚拟滚动
2. 歌曲详情页支持 SP/DP 谱面切换
3. 难度表选择过程支持返回上一级（当前从歌曲列表直接返回到类型选择）
4. 增加加载失败重试机制
5. 为应用添加图标

## 9. 文件清单

```
app/
├── manifest.webapp          # KaiOS 应用清单 (privileged + systemXHR)
├── index.html               # 单页容器，含所有 page section
├── css/
│   └── app.css              # 全局样式、KaiOS 原生风格、240x320 适配
└── js/
    ├── utils.js             # 通用工具函数
    ├── storage.js           # sessionStorage / localStorage 封装
    ├── api.js               # XHR 封装、Token 管理、401 自动刷新
    ├── app.js               # 应用初始化、页面路由、导航栈、按键绑定
    └── pages/
        ├── login.js         # 登录页
        ├── menu.js          # 主菜单
        ├── difficulty.js    # 难度表三级选择 + 歌曲列表
        ├── recommend.js     # 练习推荐
        ├── search.js        # 歌曲搜索 + 本地缓存
        └── song.js          # 歌曲详情
```
