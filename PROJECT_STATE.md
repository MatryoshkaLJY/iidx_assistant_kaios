# PocketIIDX 项目状态总结

## 项目概述

PocketIIDX 是一个基于 KaiOS 2.5.2 的移动端应用，用于在 Nokia 2720 等功能机上查询 iidx.pro 的玩家数据。纯前端单页应用，无构建系统，直接部署静态文件。

**技术约束：**
- 目标引擎：Gecko 48 / Firefox 48
- 无 ES6+ 语法（无箭头函数、解构、模板字符串、const/let、class）
- 无 async/await 或 Promise，全部使用回调式异步
- 网络请求使用 `new XMLHttpRequest({ mozSystem: true })`
- 屏幕固定 240x320 竖屏

## 已完成功能

### 1. 登录系统
- 用户名密码登录
- Token 自动刷新（401 时静默 refresh，失败则尝试自动重登录）
- 记住用户名/密码/自动登录选项

### 2. 菜单导航
- SP/DP 难度表入口
- SP/DP 雷达入口
- SP/DP 练习推荐入口
- 歌曲搜索入口
- 应用菜单（用户信息、退出登录）

### 3. 难度表（Difficulty Tables）
- 支持多种难度表：温火、PPI、BPI、SP12、CPI、人气表、ELO、SNJ、ZRIS、ERETER
- 状态机：type -> level -> lamp -> songs
- 左右键切换 rank_groups
- 点击进入歌曲详情

### 4. 练习推荐（Recommendations）
- 三种模式：热手、进步、飞升
- 推荐歌曲列表，显示推荐度和概率

### 5. 歌曲搜索
- 全曲库本地缓存（字段裁剪至 ~12 个）
- 客户端模糊匹配（曲名、拼音、艺术家、流派）
- 搜索结果上限 100 条
- 支持手动刷新曲库

### 6. 歌曲详情
- 显示最佳成绩/最近成绩
- 难度表条目列表
- 右软键切换谱面

### 7. Notes Radar（核心功能）
- 6 维度雷达：Notes、Scratch、Peak、Chord、Charge、Soflan
- 支持 SP/DP 两种 playStyle
- 雷达概览页：显示各维度平均值
- 维度详情页：该维度 Top Charts 列表
- 维度推荐页：该维度的练习推荐歌曲
- **懒加载 + 缓存优化**：进入雷达页时并行预取全部 6 个维度的详情和推荐（共 12 个请求）

## 缓存策略

### 缓存架构
所有缓存基于 `localStorage`，以服务器同步状态（`/api/sync/status/bjmania`）的时间戳作为缓存有效性判断依据。

**核心逻辑：**
1. App 启动/登录成功后，后台请求 sync status，解析为 `App.syncStatusTimestamp`
2. 各页面加载数据时，先检查本地缓存的 `syncTimestamp` 是否与当前服务器状态一致
3. 一致则直接使用缓存，无需网络请求
4. 不一致或缓存不存在，则请求数据并保存到缓存

### 缓存类型

| 数据类型 | 缓存 Key 前缀 | 存储内容 |
|---------|-------------|---------|
| 雷达数据 | `pocketiidx_radar_cache_` | summary + dimensions + dimensionData |
| 难度表 | `pocketiidx_diff_cache_` | tableData (按 tableName) |
| 练习推荐 | `pocketiidx_rec_cache_` | songs 数组 (按 playStyle_mode) |
| 曲库 | `pocketiidx_music_cache` | 裁剪后的歌曲数组 |
| 曲库元信息 | `pocketiidx_music_cache_meta` | syncTimestamp |

### 缓存清除
- 退出登录时清除所有用户相关缓存（radar + diff + rec）
- 曲库缓存为公共数据，退出登录时保留

## API 接口

| 接口 | 用途 |
|-----|------|
| `POST /api/login` | 登录获取 token |
| `POST /api/refresh` | 刷新 token |
| `GET /api/sync/status/{ext}` | 获取外部数据源同步状态（用于缓存校验）|
| `GET /api/difficulty-tables/{name}` | 获取难度表数据 |
| `GET /api/recommendation/difficulty/{playStyle}?mode={mode}` | 获取练习推荐 |
| `GET /api/music/list` | 获取全部歌曲列表 |
| `GET /api/music/{musicId}/{playStyle}/{chartDifficulty}` | 获取歌曲详情 |
| `GET /api/radar/{playStyle}/summary` | 获取雷达概览 |
| `GET /api/radar/{playStyle}/dimension/{dimension}` | 获取维度详情 |
| `GET /api/recommendation/player-radar/{playStyle}?radar_dimension={dim}` | 获取维度推荐 |

## 文件结构

```
app/
├── index.html              # 页面结构，script 加载顺序
├── css/app.css             # 样式
├── js/
│   ├── polyfill.js         # KaiOS API 桌面环境 mock
│   ├── utils.js            # 工具函数（escapeHtml、chartDiffText、fuzzyMatch 等）
│   ├── storage.js          # localStorage 封装（token、凭证、各类缓存）
│   ├── api.js              # XMLHttpRequest 封装 + 所有 API 方法
│   ├── app.js              # 应用核心（页面切换、焦点管理、按键绑定、同步状态）
│   ├── init.js             # 入口初始化
│   └── pages/
│       ├── login.js        # 登录页
│       ├── menu.js         # 菜单页
│       ├── difficulty.js   # 难度表选择 + 歌曲列表
│       ├── recommend.js    # 推荐模式选择 + 歌曲列表
│       ├── search.js       # 搜索页
│       ├── radar.js        # 雷达概览 + 维度详情 + 维度推荐
│       └── song.js         # 歌曲详情页
└── manifest.webapp         # KaiOS 应用清单
```

## 页面系统

所有页面为 `<section class="page">`，通过 `.active` 类控制显示。

**页面生命周期钩子：**
- `onShow(data)` — 页面显示时调用
- `onEnter()` — 按确定键时调用
- `onArrowUp/Down/Left/Right()` — 方向键
- `onSoftLeft/SoftRight()` — 软键（F1/F2）
- `onBack()` — 返回键，返回 true 阻止默认 goBack

**导航栈：** `App.navStack` 记录访问历史，`App.showPage()` 切换页面，`App.goBack()` 返回上一页。

**焦点系统：** `App.focusableItems` 为当前页面所有 `.list-item` 和 `.input-row`，上下键循环移动焦点，自动滚动到可视区域。

## 已知问题 / 待优化点

1. **同步状态代理**：当前使用 `bjmania` 的 sync status 作为所有数据类型的 freshness 代理，可能不够精确
2. **缓存失败回退**：sync status 请求失败时，所有缓存失效，会触发全量刷新
3. **内存缓存**：当前只有 localStorage 持久缓存，无内存缓存，重复访问同一页面会反复读取 localStorage
4. **错误处理**：API 错误统一使用 `alert()`，体验较粗糙
5. **加载状态**：多个页面独立管理 loading overlay，无请求去重/防并发机制
6. **图片资源**：歌曲详情无封面图支持（KaiOS 内存限制，可能故意省略）
7. **Offline 支持**：无离线模式，网络不可用时全部功能不可用
