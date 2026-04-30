# PocketIIDX — KaiOS App 文档

## 1. 项目概述

PocketIIDX 是一款为 **Nokia 2720（KaiOS 2.5.2, Gecko 48）** 开发的 IIDX 数据查询应用，数据来源为 [iidx.pro](https://iidx.pro)。

支持功能：
- 登录 iidx.pro 并自动维持会话
- SP/DP 难度表查询（温火、PPI、AAA、SP12参考、CPI、SNJ、ZRIS、ELO、ERETER、人气表）
- SP/DP 练习推荐（热手 / 进步 / 飞升）
- 本地歌曲搜索（曲库缓存 + 模糊匹配）
- 歌曲详情（谱面信息、成绩、难度表排名、最近成绩）

---

## 2. 技术约束

- **系统**: KaiOS 2.5.2（Gecko 48 / Firefox 48）
- **屏幕**: 240 x 320 竖屏
- **内存**: ~256MB RAM
- **JS 限制**:
  - 无 `async/await`，无 `fetch`
  - 使用 `XMLHttpRequest({ mozSystem: true })` 进行跨域请求
  - 无箭头函数、解构赋值、Promise 等现代语法
  - 无 `Element.closest()`，手动 DOM 遍历

---

## 3. 文件结构

```
app/
  manifest.webapp          # KaiOS 应用清单
  index.html               # 单页应用主入口，包含所有页面容器
  css/
    app.css                # 全局样式、KaiOS 原生风格、240x320 适配
  js/
    polyfill.js            # KaiOS 系统 API 桌面端 polyfill
    init.js                # 应用启动入口
    app.js                 # 核心框架：路由、导航栈、焦点管理、按键绑定
    api.js                 # XHR 封装、Token 自动刷新、自动重登录
    storage.js             # localStorage 封装（Token、凭据、曲库缓存）
    utils.js               # 通用工具函数
    pages/
      login.js             # 登录页（含记住凭据、自动登录）
      menu.js              # 主菜单页（含右软键呼出应用菜单）
      difficulty.js        # 难度表选择 + 歌曲列表
      recommend.js         # 练习推荐选择 + 歌曲列表
      search.js            # 歌曲搜索（本地缓存 + 关键词过滤）
      song.js              # 歌曲详情页（含谱面切换菜单）
```

---

## 4. manifest.webapp

```json
{
  "name": "PocketIIDX",
  "description": "iidx.pro data viewer for KaiOS",
  "version": "0.2",
  "launch_path": "/index.html",
  "type": "privileged",
  "origin": "app://pocketiidx",
  "permissions": {
    "systemXHR": {}
  },
  "default_locale": "zh-CN"
}
```

- `privileged` 类型 + `systemXHR` 权限：允许跨域请求 iidx.pro API
- `origin` 固定为 `app://pocketiidx`，避免白屏问题

---

## 5. 核心模块详解

### 5.1 js/app.js — 应用框架

全局对象 `App` 提供以下功能：

#### 导航栈管理
- `navStack`: 页面历史栈
- `showPage(pageId, data)`: 显示新页面，推入栈顶（去重）
- `goBack()`: 弹出当前页，返回上一页；栈空时回到 menu/login

#### 焦点管理
- `focusableItems`: 当前页可聚焦元素列表
- `currentFocusIndex`: 当前焦点索引（0-based）
- `updateFocusableItems()`: 从当前页面查询 `.list-item, .input-row`
- `renderFocus()`: 渲染焦点高亮 + 自动滚动到可视区域 + **更新列表计数器**（`.list-counter`）
- `moveFocus(delta)`: 焦点上下移动，边界循环（上翻到最底，下翻到最顶）

#### 按键绑定
绑定到 `document.body` 的 `keydown` 事件：

| 按键 | 默认行为 | 可被页面覆盖 |
|------|---------|------------|
| ArrowUp | 焦点上移 / 页面滚动 | `onArrowUp` |
| ArrowDown | 焦点下移 / 页面滚动 | `onArrowDown` |
| ArrowLeft | — | `onArrowLeft` |
| ArrowRight | — | `onArrowRight` |
| Enter / Accept | 触发选中 | `onEnter` |
| Backspace / Back | `goBack()` | — |
| SoftLeft / F1 | — | `onSoftLeft` |
| SoftRight / F2 | — | `onSoftRight` |

页面处理器通过 `App.pageHandlers[pageId]` 注册，各页面只需实现所需回调。

---

### 5.2 js/api.js — API 层

```
API_BASE = 'https://iidx.pro'
```

#### 核心方法

| 方法 | 说明 |
|------|------|
| `Api.login(username, password, cb)` | 登录，成功后存 token |
| `Api.getDifficultyTable(name, cb)` | 获取难度表 |
| `Api.getRecommendations(style, mode, cb)` | 获取练习推荐 |
| `Api.getMusicList(cb)` | 获取完整曲库 |
| `Api.getMusicDetail(id, style, diff, cb)` | 获取歌曲详情 |

#### Token 自动续期机制

`_requestWithAuth` 流程：

1. 发送请求，Header 带 `Authorization: Bearer {token}`
2. 收到 401：
   a. 调用 `POST /api/refresh`（依赖 HttpOnly cookie）
   b. 刷新成功 → 更新 token → **无感重试原请求**
   c. 刷新失败 → 使用本地保存的用户名/密码 **自动重登录**
   d. 重登录成功 → 重试原请求；失败 → 清除 token，回调返回 401 错误

---

### 5.3 js/storage.js — 存储层

全部使用 `localStorage`：

| Key | 用途 |
|-----|------|
| `pocketiidx_token` | access_token |
| `pocketiidx_username` | 记住的用户名 |
| `pocketiidx_password` | 记住的密码 |
| `pocketiidx_remember_username` | 是否记住用户名（`1`/`0`）|
| `pocketiidx_remember_password` | 是否记住密码（`1`/`0`）|
| `pocketiidx_auto_login` | 是否自动登录（`1`/`0`）|
| `pocketiidx_music_cache` | 曲库缓存（JSON 字符串）|

方法：`getToken/setToken/clearToken`、`getUsername/setUsername`、...、`getCachedMusicList/setCachedMusicList`

---

### 5.4 js/utils.js — 工具函数

| 方法 | 说明 |
|------|------|
| `fuzzyMatch(text, keyword)` | 大小写不敏感子串匹配 |
| `chartDiffText(diff)` | 0→B, 1→N, 2→H, 3→A, 4→L |
| `clearFlagText(flag)` | 0→NO PLAY, 1→FAILED, 2→A-CLEAR, 3→E-CLEAR, 4→CLEAR, 5→H-CLEAR, 6→EXH-CLEAR, 7→FC, 8→PERFECT |
| `clearFlagColor(flag)` | 返回对应 clear flag 的色值（用于列表左侧色条）|
| `djLevelText(level)` | 0→F, 1→E, ... 7→AAA, 8→MAX |
| `playStyleText(style)` | 0→SP, 1→DP |
| `escapeHtml(str)` | HTML 实体编码 |
| `truncate(str, maxLen)` | 截断加省略号 |
| `getLevels(item, style)` | 返回歌曲各级难度字符串 |
| `debounce(func, wait)` | 防抖 |
| `sortBy(arr, prop, desc)` | 按属性排序 |
| `createEl(tag, className, text)` | DOM 元素工厂 |

#### Clear Flag 色值映射

| Flag | 名称 | 色值 |
|------|------|------|
| 0 | NO PLAY | `#ffffff` |
| 1 | FAILED | `#cccccc` |
| 2 | A-CLEAR | `#7f66ff` |
| 3 | E-CLEAR | `#99ff33` |
| 4 | CLEAR | `#0dccf2` |
| 5 | H-CLEAR | `#ff3333` |
| 6 | EXH-CLEAR | `#ffdd33` |
| 7 | FC | `#00ffff` |
| 8 | PERFECT | `#00ffff` |

---

### 5.5 js/polyfill.js

桌面浏览器测试用的 KaiOS API polyfill：
- `widget.setNavigationEnabled()`
- `widget.preferenceForKey()`
- `menu.append()` / `showSoftkeys()` / `setRightSoftkeyLabel()` / `setLeftSoftkeyLabel()` / `remove()`

---

### 5.6 js/init.js

应用启动：
```js
if (document.readyState === 'complete') {
  App.init();
} else {
  window.onload = function() { App.init(); };
}
```

---

## 6. 页面详解

### 6.1 登录页 — `pages/login.js`

页面 ID: `login`

- 用户名/密码输入框 + 三个复选框：记住用户名、记住密码、自动登录
- 凭据恢复：进入页面时自动回填已保存的用户名/密码
- 自动登录：若勾选自动登录且凭据存在，页面加载后自动执行登录
- 登录成功 → 存 token → 跳转主菜单
- 复选框支持方向键聚焦 + Enter 键切换

---

### 6.2 主菜单 — `pages/menu.js`

页面 ID: `menu`

列表项：
1. SP 难度表
2. DP 难度表
3. SP 练习推荐
4. DP 练习推荐
5. 歌曲搜索

**右软键菜单**：呼出应用菜单（用户信息 / 退出登录）
- 退出登录：清除 token + 凭据 + 导航栈 → 回到登录页

---

### 6.3 难度表页 — `pages/difficulty.js`

页面 ID: `difficulty` → `diff-songs`

#### 状态机
`type` → `level` → `lamp` → `songs`

#### SP 难度表类型
| 类型 | 需等级 | 需灯种 |
|------|--------|--------|
| 温火全等级难易度表 | 是 | 是 |
| PPI AAA表 / Best 40 | 是 | 否 |
| BPI推定表 / AAA表 | 是 | 否 |
| SP12参考表 | 否 | 是 |
| CPI适正表 | 否 | 是 |
| 人气表 | 否 | 否 |

#### DP 难度表类型
| 类型 | 需等级 | 需灯种 |
|------|--------|--------|
| 温火全等级难易度表 | 是 | 是 |
| ELO全等级难易度表 | 是 | 是 |
| PPI AAA表 / Best 40 | 是 | 否 |
| BPI推定表 / AAA表 | 是 | 否 |
| SNJ难易度表 | 否 | 否 |
| ZRIS难易度表 | 是 | 否 |
| ERETER推定表 | 否 | 是 |
| CPI适正表 | 否 | 是 |
| 人气表 | 否 | 否 |

#### 等级范围
- **SP**: 温火/PPI: 1, 3~12；AAA: 11, 12
- **DP**: 温火/ELO/PPI: 3, 5~12；AAA: 11, 12；ZRIS: dp10, dp11h, dp11e

#### 歌曲列表页 (`diff-songs`)
- Info bar 显示当前分组名称、歌曲数、分组序号/总数
- 左右方向键切换分组（循环）
- 列表项显示：左侧 clear flag 色条 + 曲名 + 副标题（Lv. + 难度 + 排名 + clear flag）
- Info bar 右上角实时显示光标位置 `current/total`

---

### 6.4 练习推荐页 — `pages/recommend.js`

页面 ID: `recommend` → `rec-songs`

模式选择：热手 (`hot_hand`) / 进步 (`progress`) / 飞升 (`ascension`)

歌曲列表页 (`rec-songs`)：
- 列表项显示：左侧 clear flag 色条 + 曲名 + 副标题（Lv. + 难度 + 推荐度 + 概率）
- Info bar 右上角显示光标位置 `current/total`
- 按 `recommendation_score` 降序排列

---

### 6.5 搜索页 — `pages/search.js`

页面 ID: `search`

流程：
1. 进入页面时检查 `localStorage` 曲库缓存
2. 无缓存时，用户按 Enter 触发加载（或自动加载后搜索）
3. 调用 `Api.getMusicList()` → 字段裁剪 → 存入 `localStorage`
4. 本地模糊匹配 `title` / `plainTitle` / `artist` / `genre`
5. 结果限制最多 100 条

输入框支持方向键上下在输入框和结果列表间切换焦点。

右软键：手动刷新曲库。

---

### 6.6 歌曲详情页 — `pages/song.js`

页面 ID: `song`

参数：`musicId`, `playStyle`, `chartDifficulty`

页面内容（从上至下）：
1. **Header**: 曲名 + SP/DP + 难度 + Lv.数值
2. **艺术家 / 流派**
3. **谱面信息**: 模式 + 难度 + 等级、Note数、Radar 数据
4. **最佳成绩**: EX Score、DJ Level、Clear Flag、详细 DJ Level、比率、Miss、次数、日期、PPI
5. **最近成绩**（最多 3 条）
6. **难度表排名**: 平铺列出所有表名 + 排名（字母序）

**右软键菜单 — 谱面切换**：
- 根据 `music_info` 中各难度字段（`lvSPB`~`lvSPL`, `lvDPB`~`lvDPL`）生成可用谱面列表
- 呼出菜单后上下选择，Enter 切换谱面并重新加载
- 当前谱面标注 `[当前]`

---

## 7. CSS 布局要点

屏幕总高 320px，宽度 240px：

| 区域 | 高度 | 说明 |
|------|------|------|
| Header | 28px | 页面标题 |
| Info bar | 20px | 分组信息 / 状态 / 计数器（部分页面）|
| Content | 212~232px | 滚动内容区 |
| SoftKey bar | 30px | 底部功能键提示 |
| **合计** | **290~310px** | 适配 320px 屏幕 |

#### 关键样式
- `.list-item`: `height: 44px`, `display: flex`, `flex-direction: column`, `justify-content: center`
- `.item-title`: 主标题，`white-space: nowrap` + 省略号
- `.sub`: 副标题，独立一行，11px 灰色
- `.clear-flag-bar`: 绝对定位在 list-item 最左侧，4px 宽，100% 高，背景色根据 clear flag 动态设置
- `.info-bar`: flex 布局，`justify-content: space-between`，左侧主信息，右侧 `.list-counter`
- `.focused`: 背景 `#00a0e9`，文字白色

---

## 8. 数据流

### 8.1 登录流程
```
用户输入账号密码 → Api.login() → 存 token → App.showPage('menu')
```

### 8.2 难度表查询
```
选择 SP/DP → 选择表类型 → [选择等级] → [选择灯种]
  → Api.getDifficultyTable(name) → 按 rank_groups 分组
  → 左右键切换分组 → 选择歌曲 → Api.getMusicDetail()
```

### 8.3 练习推荐
```
选择 SP/DP → 选择模式
  → Api.getRecommendations() → 按 recommendation_score 排序
  → 选择歌曲 → Api.getMusicDetail()
```

### 8.4 歌曲搜索
```
进入搜索页 → 读取 localStorage 缓存
  → [无缓存] Api.getMusicList() → 裁剪字段 → 存 localStorage
  → 输入关键词 → Utils.fuzzyMatch() 本地过滤
  → 选择歌曲 → Api.getMusicDetail()
```

---

## 9. 打包说明

### 9.1 目录结构（打包前确认）

```
app/
  manifest.webapp
  index.html
  css/
    app.css
  js/
    polyfill.js
    init.js
    app.js
    api.js
    storage.js
    utils.js
    pages/
      login.js
      menu.js
      difficulty.js
      recommend.js
      search.js
      song.js
```

### 9.2 KaiOS 安装方式

1. 将 `app/` 目录打包为 ZIP（保留目录结构，manifest.webapp 在根目录）
2. 通过 WebIDE / KaiOSrt / adb 安装到设备
3. 或使用 [Bananahackers 的 Wallace Toolbox](https://wiki.bananahackers.net/install) 侧载

### 9.3 图标

`manifest.webapp` 中 `icons` 字段为空，需自行添加：
```json
"icons": {
  "56": "/img/icon-56.png",
  "112": "/img/icon-112.png"
}
```

---

## 10. 开发历史与关键修复

| 问题 | 修复措施 |
|------|---------|
| 真机白屏 | manifest 添加 `origin`；使用 `type="text/javascript"`；外置内联脚本；添加 `widget/menu` polyfill |
| 推荐页空白 | API 返回包装对象，增加多格式解析兼容 |
| 歌曲详情页无按键响应 | `e.preventDefault()` 改为条件执行；为 SongPage 添加 `onArrowUp/Down` 滚动 |
| 左软键不响应 | 为 difficulty/recommend/search 页面添加 `onSoftLeft` |
| 内容覆盖 SoftKey | `.content` 高度从 262px 改为 232px，diff-songs 改为 212px |
| 焦点不循环 | `moveFocus()` 从 clamp 改为 wrap-around |
| Session 过期 | Token 401 时先 refresh，失败再自动重登录；登录页增加记住凭据 + 自动登录 |
| 列表 sub 被挤出 | `.list-item` 改为双行 flex 布局，`.sub` 独立一行 |
| 列表添加 clear flag 色条 | 新增 `clearFlagColor()` + `.clear-flag-bar` 样式 + 列表项渲染时插入 |
| Info bar 光标计数 | `renderFocus()` 自动更新 `.list-counter`，info bar 改为 flex 左右分布 |
