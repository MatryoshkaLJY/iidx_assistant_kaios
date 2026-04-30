# IIDX Analyzer KaiOS App - Design Document

## 1. 项目概述

为 Nokia 2720（KaiOS 2.5.2）开发一款查询 iidx.pro 数据的 KaiOS 应用。

### 1.1 设备约束

- **系统**: KaiOS 2.5.2（基于 Gecko 48 / Firefox 48）
- **内存**: ~256MB RAM
- **屏幕**: 240x320 分辨率
- **JS 限制**:
  - 无 `async/await`
  - 无 `fetch` API，需使用 `XMLHttpRequest`
  - Promise 支持有限，优先使用回调
  - 避免现代 ES6+ 语法（箭头函数、解构赋值等需谨慎测试）

---

## 2. 认证机制

### 2.1 登录接口

**API Base URL:** `https://iidx.pro`

```
POST /api/login
Content-Type: application/x-www-form-urlencoded
```

**请求体:**
```
username={用户名}&password={密码}
```

**响应:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

### 2.2 Token 使用

- `access_token` 存储在 `sessionStorage` 中
- 后续 API 请求在 Header 中携带：`Authorization: Bearer {access_token}`
- `refresh_token` 为 HttpOnly Cookie，由浏览器自动管理
- **Token 过期自动续期**：API 返回 401 时，自动调用 `POST /api/refresh` 获取新 `access_token`，**无感重试原请求**，失败再跳转登录页

#### Refresh 响应

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
  "access_expire": 1777460571.98882
}
```

### 2.3 当前测试账号

- 用户名: `TEST001`
- 密码: `2E39RJDEftiM8mV`

---

## 3. 核心功能与 API

### 3.1 功能一：难度表查询

#### API

```
GET /api/difficulty-tables/{table_name}
```

#### SP 难度表

| 中文名 | API 名称 | 说明 |
|--------|----------|------|
| 温火全等级难易度表 | `wenhuo_SP_{等级}_{灯}` | 等级: 1,3~12（无★2）；灯: E_CLEAR/CLEAR/H_CLEAR/EXH_CLEAR（低等级1,3~9仅CLEAR/H_CLEAR） |
| PPI AAA表 / Best 40 | `PPI_AAA_SINGLE_{等级}` | 等级: 1,3~12 |
| BPI推定表 / AAA表 | `AAA_SINGLE_11`, `AAA_SINGLE_12` | 对应 ★11 / ★12 Best 40 和 AAA表 |
| SP★12参考表 | `sp12_epolis_{灯}` | 灯: clear(蓝)/h_clear(白)/exh_clear(闪) |
| CPI适正表 | `cpi_epolis_{灯}` | 灯: e_clear/clear/h_clear/exh_clear/fc |

#### DP 难度表

| 中文名 | API 名称 | 说明 |
|--------|----------|------|
| 温火全等级难易度表 | `wenhuo_DP_{等级}_{灯}` | 等级: 3,5~12（无★1,2,4）；灯: E_CLEAR/CLEAR/H_CLEAR/EXH_CLEAR（低等级仅CLEAR/H_CLEAR） |
| ELO全等级难易度表 | `elo_DP_{等级}_{灯}` | 等级: 3,5~12（无★1,2,4）；灯: E_CLEAR/CLEAR/H_CLEAR/EXH_CLEAR（**注意大写**，等级5仅CLEAR） |
| PPI AAA表 / Best 40 | `PPI_AAA_DOUBLE_{等级}` | 等级: 3,5~12 |
| SNJ难易度表 | `snj_epolis` | 固定一张 |
| ZRIS难易度表 | `zris_epolis_dp10_h_clear` / `zris_epolis_dp11_h_clear` / `zris_epolis_dp11_exh_clear` | dp10白灯 / dp11白灯 / dp11闪灯 |
| ERETER★12推定表 | `ereter_epolis_dp12_{灯}` | 灯: e_clear(绿)/h_clear(白)/exh_clear(闪) |

#### 响应结构示例

```json
{
  "table_name": "wenhuo_SP_1_CLEAR",
  "display_name": "WENHUO SP★1 蓝灯表",
  "play_style": 0,
  "clear_flag": 4,
  "rank_groups": {
    "地力D": [
      {
        "music_id": 31017,
        "music_title": "ポラリスノウタ",
        "level": 1,
        "chart_difficulty": 0,
        "estimation": -1.013602,
        "rank_type": "地力",
        "rank": "D",
        "individual_diff": 1.7209045,
        "best_score": null
      }
    ]
  }
}
```

#### KaiOS 适配策略

- 温火/ELO 表分两级选择：先选等级（★1~★12），再选灯种
- 每次只请求一张表，数据量 10KB~300KB 可接受
- **分组筛选在本地进行**：API 一次性返回整张表的全部 `rank_groups`，前端按 key 切换显示，不需要为每个分组单独请求

---

### 3.2 功能二：练习推荐

#### API

```
GET /api/recommendation/difficulty/{play_style}?mode={mode}
```

**参数:**
- `play_style`: `0` = SP, `1` = DP
- `mode`: `hot_hand`（热手）/ `progress`（进步）/ `ascension`（飞升）

**URL 示例:**
- SP 进步: `/api/recommendation/difficulty/0?mode=progress`
- DP 热手: `/api/recommendation/difficulty/1?mode=hot_hand`

**数据量:** ~4.5KB

#### 响应结构

```json
[
  {
    "music_id": 15014,
    "music_title": "Ristaccia",
    "level": 10,
    "chart_difficulty": 3,
    "clear_flag": 1,
    "target_clear_flag": 4,
    "probability": 0.731,
    "recommendation_score": 93.8
  }
]
```

---

### 3.3 功能三：歌曲搜索

#### API

```
GET /api/music/list
```

**数据量:** ~900KB（1977 首歌曲）

#### 响应结构

```json
{
  "total": 1977,
  "items": [
    {
      "musicId": 1000,
      "title": "5.1.1.",
      "plainTitle": "5.1.1.",
      "genre": "PIANO AMBIENT",
      "artist": "dj nagureo",
      "lvSPB": "0",
      "lvSPN": "2",
      "lvSPH": "6",
      "lvSPA": "10",
      "lvSPL": "0",
      "lvDPB": "0",
      "lvDPN": "1",
      "lvDPH": "7",
      "lvDPA": "10",
      "lvDPL": "0",
      "fiSPB": "0",
      "fiSPN": "1",
      "fiSPH": "a",
      "fiSPA": "a",
      "fiSPL": "0",
      "fiDPB": "0",
      "fiDPN": "2",
      "fiDPH": "a",
      "fiDPA": "a",
      "fiDPL": "0",
      "bgmVolume": 108,
      "bgaDelay": -120,
      "bgaFilename": "01000"
    }
  ]
}
```

#### 搜索策略

- 网站无服务端搜索 API，搜索为前端本地过滤
- **优化方案**:
  1. 惰性加载：仅在用户进入搜索功能时拉取
  2. 字段裁剪：解析后只保留 `musicId`、`title`、`plainTitle`、`artist`、`genre`、各级难度字段
  3. 本地缓存：首次加载后存入 `localStorage`，后续从本地读取；**无自动过期，需用户手动触发刷新**
  4. 支持按曲名、艺术家、流派模糊搜索

---

### 3.4 歌曲详情

#### API

```
GET /api/music/{music_id}/{play_style}/{chart_difficulty}
```

**示例:** `/api/music/15014/1/3`

**数据量:** ~3.7KB

#### 响应结构

```json
{
  "music_info": {
    "musicId": 15014,
    "title": "Ristaccia",
    "plainTitle": "Ristaccia",
    "artist": "Zektbach",
    "genre": "OUVERTÜRE",
    "version": 15,
    "lvSPB": "0",
    "lvSPN": "6",
    "lvSPH": "9",
    "lvSPA": "12",
    "lvSPL": "0",
    "lvDPB": "0",
    "lvDPN": "5",
    "lvDPH": "8",
    "lvDPA": "10",
    "lvDPL": "11"
  },
  "chart_info": {
    "play_style": 0,
    "chart_difficulty": 3,
    "level": 12,
    "note_count": 1386,
    "radar": {
      "notes": 10065,
      "scratch": 5502,
      "peak": 11842,
      "chord": 11414,
      "charge": 0,
      "soflan": 0
    }
  },
  "difficulty_tables": {
    "sp12_epolis_clear": { ... },
    "AAA_SINGLE_12": { ... },
    "PPI_AAA_SINGLE_12": { ... },
    "wenhuo_SP_12_CLEAR": { ... },
    "cpi_epolis_clear": { ... }
  },
  "recent_scores": [
    {
      "music_id": 15014,
      "play_style": 0,
      "chart_difficulty": 3,
      "clear_flag": 5,
      "ex_score": 2157,
      "miss_count": 32,
      "dj_level": 7,
      "detailed_dj_level": "AA + 1",
      "score_ratio": 0.7781,
      "play_time": "2024-05-16T19:27:31",
      "source": "bjmania",
      "option1": null,
      "option2": null
    }
  ],
  "best_score": {
    "ex_score": 2157,
    "dj_level": 7,
    "detailed_dj_level": "AA + 1",
    "score_ratio": 0.7781,
    "clear_flag": 5,
    "miss_count": 32,
    "play_time": "2024-05-16T19:27:31",
    "play_count": 1,
    "option1": null,
    "option2": null,
    "bpi_info": { ... },
    "ppi": 35.82
  }
}
```

#### 难度表展示策略

- 歌曲详情页**平铺列出** `difficulty_tables` 中存在的全部表名及排名信息
- 每首歌通常出现在 5~15 个表中，240x320 屏幕下每表占 1~2 行
- 按表名字母顺序排列，不额外分组折叠

---

## 4. UI 设计要点

### 4.1 屏幕适配

- 分辨率 240x320，竖屏
- 每屏显示约 5~7 行列表项
- 文字需足够大，适合功能机小屏幕阅读
- 使用 KaiOS 原生样式和 SoftKey 布局

### 4.2 导航结构

```
[登录页]
  └── [主菜单]
        ├── [SP 难度表]
        │       ├── [选择难度表类型]
        │       ├── [选择等级]（温火/ELO）
        │       ├── [选择灯种]
        │       └── [歌曲列表] → [歌曲详情]
        ├── [DP 难度表]
        │       └── （同 SP 结构）
        ├── [SP 练习推荐]
        │       ├── [热手/进步/飞升]
        │       └── [歌曲列表] → [歌曲详情]
        ├── [DP 练习推荐]
        │       └── （同 SP 结构）
        └── [歌曲搜索]
                ├── [搜索输入]
                ├── [结果列表]
                └── [歌曲详情]
```

### 4.3 按键映射

- **方向键**: 上下移动光标，左右翻页/切换 Tab
- **确定键**: 进入/选择
- **返回键**: 返回上一级
- **SoftKey Left/Right**: 对应屏幕底部功能按钮

---

## 5. 数据流设计

### 5.1 登录流程

```
用户输入账号密码
  → XHR POST /api/login
  → 存储 access_token 到 sessionStorage
  → 进入主菜单
```

### 5.2 难度表查询流程

```
用户选择 SP/DP → 选择表类型
  → 如需等级/灯种，逐级选择
  → XHR GET /api/difficulty-tables/{table_name}
  → 按 rank_groups 分组展示
  → 用户选择歌曲 → XHR GET /api/music/{id}/{style}/{diff}
  → 展示歌曲详情
```

### 5.3 练习推荐流程

```
用户选择 SP/DP → 选择模式（热手/进步/飞升）
  → XHR GET /api/recommendation/difficulty/{play_style}?mode={mode}
  → 按 recommendation_score 排序展示
  → 用户选择歌曲 → XHR GET /api/music/{id}/{style}/{diff}
  → 展示歌曲详情
```

### 5.4 歌曲搜索流程

```
用户进入搜索页
  → 检查 localStorage 是否有缓存歌曲库
  → 有：直接读取
  → 无：XHR GET /api/music/list → 裁剪字段 → 存入 localStorage
  → 用户输入关键词
  → 本地过滤 title / plainTitle / artist / genre
  → 展示结果列表
  → 用户选择歌曲 → XHR GET /api/music/{id}/{style}/{diff}
  → 展示歌曲详情
```

---

## 6. 内存与性能优化

| 优化点 | 策略 |
|--------|------|
| 网络请求 | 使用 `XMLHttpRequest`，纯回调写法 |
| JSON 解析 | 大响应（如 900KB 歌曲库）解析时显示加载提示 |
| 歌曲库内存 | 裁剪字段，仅保留搜索和展示需要的字段 |
| 歌曲库缓存 | localStorage 持久化，避免重复请求 |
| 难度表数据 | 按需请求，不预加载 |
| 图片资源 | 不加载 BGA/封面图片，纯文本展示 |
| 列表渲染 | 虚拟滚动或分页，避免 DOM 节点过多 |
| 断网处理 | 网络请求失败时静默使用已缓存数据（仅限搜索曲库），不弹阻塞式错误提示 |

---

## 7. 已确认事项

- [x] 登录态过期自动刷新 — `POST /api/refresh`，响应含 `access_token` + `refresh_token` + `access_expire`
- [x] SP★12参考表 API — `sp12_epolis_clear` / `sp12_epolis_h_clear` / `sp12_epolis_exh_clear`
- [x] BPI推定表/AAA表 API — SP: `AAA_SINGLE_11` / `AAA_SINGLE_12`；DP: `AAA_DOUBLE_12`
- [x] PPI Best 40 API — SP: `PPI_AAA_SINGLE_12`；DP: `PPI_AAA_DOUBLE_12`
- [x] ELO DP 难度表灯种命名 — **大写**: `E_CLEAR` / `CLEAR` / `H_CLEAR` / `EXH_CLEAR`
- [x] 练习推荐 API — `play_style=0`(SP) / `play_style=1`(DP)；`mode=hot_hand|progress|ascension`

## 7. 已确认事项（续）

- [x] 不需要支持"飞升轨迹"和"雷达分析"等其他功能 — 仅保留难度表查询、练习推荐、歌曲搜索三大功能
- [x] 歌曲搜索不需要按难度等级过滤 — 仅支持曲名、艺术家、流派模糊搜索
- [x] KaiOS manifest 配置：
  - `type`: `privileged`
  - `permissions`: `systemXHR`（跨域请求 iidx.pro API）
  - `launch_path`: `/index.html`
  - `name`: `PocketIIDX`
  - `developer`: `MatryoshkaLJY`
  - 图标字段留空，由用户自行填充
- [x] 歌曲详情 `difficulty_tables` 完整表名列表（共 116 个，经 API 采样验证）：

### 完整 difficulty_tables key 列表

**SP 参考表**
- `sp12_epolis_clear` / `sp12_epolis_h_clear` / `sp12_epolis_exh_clear`

**BPI推定表 / AAA表**
- SP: `AAA_SINGLE_11`, `AAA_SINGLE_12`
- DP: `AAA_DOUBLE_11`, `AAA_DOUBLE_12`

**PPI Best 40 / AAA表**
- SP: `PPI_AAA_SINGLE_1`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `10`, `11`, `12`
- DP: `PPI_AAA_DOUBLE_3`, `5`, `6`, `7`, `8`, `9`, `10`, `11`, `12`

**温火全等级难易度表 (SP)**
- 等级 1: `wenhuo_SP_1_CLEAR`, `wenhuo_SP_1_H_CLEAR`
- 等级 3: `wenhuo_SP_3_CLEAR`, `wenhuo_SP_3_H_CLEAR`
- 等级 4: `wenhuo_SP_4_CLEAR`, `wenhuo_SP_4_H_CLEAR`
- 等级 5: `wenhuo_SP_5_CLEAR`, `wenhuo_SP_5_H_CLEAR`
- 等级 6: `wenhuo_SP_6_CLEAR`, `wenhuo_SP_6_H_CLEAR`
- 等级 7: `wenhuo_SP_7_CLEAR`, `wenhuo_SP_7_H_CLEAR`
- 等级 8: `wenhuo_SP_8_CLEAR`, `wenhuo_SP_8_H_CLEAR`
- 等级 9: `wenhuo_SP_9_CLEAR`, `wenhuo_SP_9_H_CLEAR`
- 等级 10: `wenhuo_SP_10_E_CLEAR`, `wenhuo_SP_10_CLEAR`, `wenhuo_SP_10_H_CLEAR`, `wenhuo_SP_10_EXH_CLEAR`
- 等级 11: `wenhuo_SP_11_E_CLEAR`, `wenhuo_SP_11_CLEAR`, `wenhuo_SP_11_H_CLEAR`, `wenhuo_SP_11_EXH_CLEAR`
- 等级 12: `wenhuo_SP_12_E_CLEAR`, `wenhuo_SP_12_CLEAR`, `wenhuo_SP_12_H_CLEAR`, `wenhuo_SP_12_EXH_CLEAR`

**温火全等级难易度表 (DP)**
- 等级 3: `wenhuo_DP_3_CLEAR`, `wenhuo_DP_3_H_CLEAR`
- 等级 5: `wenhuo_DP_5_CLEAR`, `wenhuo_DP_5_H_CLEAR`
- 等级 6: `wenhuo_DP_6_CLEAR`, `wenhuo_DP_6_H_CLEAR`
- 等级 7: `wenhuo_DP_7_CLEAR`, `wenhuo_DP_7_H_CLEAR`
- 等级 8: `wenhuo_DP_8_CLEAR`, `wenhuo_DP_8_H_CLEAR`
- 等级 9: `wenhuo_DP_9_CLEAR`, `wenhuo_DP_9_H_CLEAR`
- 等级 10: `wenhuo_DP_10_E_CLEAR`, `wenhuo_DP_10_CLEAR`, `wenhuo_DP_10_H_CLEAR`, `wenhuo_DP_10_EXH_CLEAR`
- 等级 11: `wenhuo_DP_11_E_CLEAR`, `wenhuo_DP_11_CLEAR`, `wenhuo_DP_11_H_CLEAR`, `wenhuo_DP_11_EXH_CLEAR`
- 等级 12: `wenhuo_DP_12_E_CLEAR`, `wenhuo_DP_12_CLEAR`, `wenhuo_DP_12_H_CLEAR`, `wenhuo_DP_12_EXH_CLEAR`

**ELO 全等级难易度表 (DP)**
- 等级 3: `elo_DP_3_CLEAR`, `elo_DP_3_H_CLEAR`
- 等级 5: `elo_DP_5_CLEAR`（仅蓝灯）
- 等级 6: `elo_DP_6_CLEAR`, `elo_DP_6_H_CLEAR`
- 等级 7: `elo_DP_7_CLEAR`, `elo_DP_7_H_CLEAR`
- 等级 8: `elo_DP_8_CLEAR`, `elo_DP_8_H_CLEAR`
- 等级 9: `elo_DP_9_CLEAR`, `elo_DP_9_H_CLEAR`
- 等级 10: `elo_DP_10_E_CLEAR`, `elo_DP_10_CLEAR`, `elo_DP_10_H_CLEAR`, `elo_DP_10_EXH_CLEAR`
- 等级 11: `elo_DP_11_E_CLEAR`, `elo_DP_11_CLEAR`, `elo_DP_11_H_CLEAR`, `elo_DP_11_EXH_CLEAR`
- 等级 12: `elo_DP_12_E_CLEAR`, `elo_DP_12_CLEAR`, `elo_DP_12_H_CLEAR`, `elo_DP_12_EXH_CLEAR`

**CPI适正表**
- `cpi_epolis_e_clear`, `cpi_epolis_clear`, `cpi_epolis_h_clear`, `cpi_epolis_exh_clear`, `cpi_epolis_fc`

**ERETER推定表 (DP)**
- `ereter_epolis_dp12_e_clear`, `ereter_epolis_dp12_h_clear`, `ereter_epolis_dp12_exh_clear`

**SNJ / ZRIS**
- `snj_epolis`
- `zris_epolis_dp10_h_clear`, `zris_epolis_dp11_h_clear`, `zris_epolis_dp11_exh_clear`

**人气表**
- `sp_popular_clear`, `dp_popular_clear`

## 8. 已确认事项（补充）

- [x] 歌曲库缓存无自动过期，**需用户手动触发刷新**
- [x] 断网时静默使用已缓存数据，不弹阻塞式错误提示
- [x] Token 过期自动续期：API 返回 401 时自动调用 `/api/refresh`，无感重试原请求
- [x] 歌曲详情页 `difficulty_tables` **平铺展示**，不按类别分组折叠

## 9. 待确认事项

（已全部确认完毕）

（已全部确认完毕）
