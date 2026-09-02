# 其乐嵘戎 Power Up Assessment

> 其乐嵘戎 · Cambridge Power Up EOL 测评系统

本仓库的测评系统成果，由 **其乐嵘戎（代码分身）** 在 QClaw 工作间
`workspace-agent-610b48ca / 其乐嵘戎 Power Up Assessment` 中开发，
于 2026-08-17 整体迁移至本 WorkBuddy 项目。原项目为纯静态前端站点，
未做代码改动，仅搬运文件并保留相对路径结构。

---

## 项目是什么

一个面向 Cambridge **Power Up** 教材的 **EOL（End of Level）测评系统** 单页应用：
- 以高清试卷图片 + 配套听力音频的形式呈现各册 EOL 测试（原版试卷页）
- **自适应综合定级测评（定级测评页）**：语言应用（自适应词汇，TTS 朗读）+ 听力理解（真实 EOL 录音）双维度，即时自动评分，输出 CEFR 等级与分项报告（`placement.js`）
- **自适应词汇测评（词汇测评页）**：SM-2 思路 + 连续答对升级/答错降级，精准定位 CEFR 等级
- 双主题（深色暖金 / 浅色湖蓝）、Emoji 互动、键盘快捷键、懒加载

## 功能清单

- ✅ **5 册 EOL 测试**（PU0–PU4，含 Starters / Movers / Flyers）
- ✅ **148 页 WebP 高清试卷**（压缩率 90.3%，仅 4.84 MB）
- ✅ **22 个配套听力 MP3**（5 册全覆盖，按需加载；可再用 Opus 压缩见下）
- ✅ **原版试卷答题升级**：PU0–PU4 题目补全，每页全部题目一次显示、统一提交、即时自动判分
- ✅ **自适应综合定级测评（定级测评页）**：语言应用 + 听力双维度，自动出 CEFR 等级与分项报告
- ✅ **自适应词汇测评（词汇测评页）**：4 选 1、历史轨迹、IndexedDB 记录；内置词库已同步植词 pu0–pu6（904 词）
- ✅ **游戏化激励**：连击 XP、徽章、得分动效、彩带庆祝、等级变化特效
- ✅ 双主题切换、图片懒加载、答案一键切换、其乐嵘戎品牌标识

## 目录结构

```
其乐嵘戎 Power Up Assessment/
├── index.html            # 主页面（测评系统入口，含内联 VOCAB_DATA）
├── placement.js          # 自适应综合定级测评引擎（语言应用+听力，自动评分）
├── vocab_quiz.js         # 词库冗余备份（VOCAB_DATA 已内联进 index.html）
├── 部署指南.md            # 部署说明（GitHub Pages 流程）
├── tools/
│   ├── compress_audio.sh # 音频压缩脚本（MP3 → Opus，语音优化）
│   └── compress_audio.bat
├── .gitignore
├── audio/                # 配套听力（22 个 MP3，约 156 MB；可生成 .opus 兜底）
│   ├── pu0_starters/  pu1_starters/  pu2_movers/
│   ├── pu3_movers/    pu4_flyers/
├── images_webp/          # 148 页 WebP 试卷（4.84 MB）
│   ├── pu0_starters/  pu0_starters_ak/  pu1_starters/
│   ├── pu2_movers/    pu2_movers_ak/    pu3_movers/
│   ├── pu4_flyers/    pu4_flyers_ak/
└── task_*.md             # 开发任务归档（bug 修复 / UI 升级 / 游戏模块等历史记录）
```

> 注：`images_source/` 在原项目中为空，未搬运。

## 本地运行

直接双击 `index.html` 即可在浏览器打开（资源均为相对路径）。
若浏览器对 `file://` 下的音频/图片加载有限制，建议起一个本地静态服务：

```bash
cd "C:\Users\thunderbot\WorkBuddy\其乐嵘戎 工具\其乐嵘戎 Power Up Assessment"
python -m http.server 8080
# 浏览器访问 http://localhost:8080
```

## 部署

详见 `部署指南.md`：创建 GitHub 仓库 `power-up-assessment` → 推送 →
启用 GitHub Pages，即可获得公开访问地址。

## 开发历史（已归档）

`task_*.md` 系列记录了完整迭代过程，关键节点：

| 时间 | 文件 | 内容 |
|------|------|------|
| 08-10 | task_assessment_fix | index.html 重构，修复 `[object Object]`、4 选 1、音频三态、历史记录 |
| 08-11 | task_fix（多份） | 修复按钮无反应、查看器关闭、翻页/缩放、UI 升级、游戏模块 |
| 08-12 | task_games_ui_upgrade | 游戏 UI 升级 |
| 08-15 | task_match3_* / task_tone_game | 三消重设计 + 计时修复、音调游戏 |

## 音频压缩（MP3 → Opus）

听力 MP3 体积较大（约 156 MB）。已提供一键压缩脚本，把 `audio/*.mp3`
转成 Opus（语音优化，体积约为原 MP3 的 1/3 ~ 1/10，音质几乎无损）：

```bash
# 需先安装 ffmpeg： winget install ffmpeg  (或 choco install ffmpeg)
bash tools/compress_audio.sh          # 默认 40 kbps 单声道
bash tools/compress_audio.sh 48       # 自定义码率
# Windows cmd 用户： tools\compress_audio.bat
```

脚本只新增 `.opus` 文件，**不删除原 MP3**。网页逻辑已内置优先级：
优先加载 `.opus`，加载失败自动回退 `.mp3`，因此无论是否压缩都能正常工作。

## 待办 / 后续

- [x] 压缩音频（MP3 → Opus，脚本 `tools/compress_audio.*` 已就绪，装好 ffmpeg 即可运行）
- [ ] 补充 PU5 / PU6（如业务需要）
- [ ] 接入在线答题 / 题库系统

---

*迁移自 QClaw `workspace-agent-610b48ca`，2026-08-17；定级测评（placement.js）于 2026-08 新增。*
