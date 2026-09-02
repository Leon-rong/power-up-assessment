#!/usr/bin/env bash
# ============================================================================
# 其乐嵘戎 Power Up Assessment — 音频压缩脚本 (Opus)
#
# 作用：把 audio/ 下的所有 .mp3 转成 Opus（语音优化），体积约为原 MP3 的
#       1/3 ~ 1/10，且音质几乎无损（针对人声/听力录音）。
#       原 .mp3 保留不删，作为浏览器不支持 Opus 时的降级兜底。
#
# 为何选 Opus：
#   - 免版税、开放标准；2026 年所有现代浏览器（Chrome/Edge/Firefox/Safari）
#     均原生支持 <audio> 播放 .opus。
#   - 同等语音可懂度下，码率约为 MP3 的一半。语音推荐 32~48 kbps 单声道。
#
# 依赖：ffmpeg  https://ffmpeg.org/download.html
#   Windows:  winget install ffmpeg   或   choco install ffmpeg
#   macOS:     brew install ffmpeg
#   Linux:     apt install ffmpeg
#
# 用法：
#   bash tools/compress_audio.sh           # 默认 40 kbps 单声道
#   bash tools/compress_audio.sh 48        # 自定义码率 (kbps)
#
# 网页加载逻辑（已内置）：优先 .opus，加载失败自动回退 .mp3
#   - 定级测评听力：placement.js -> plPlayPart()
#   - 原版试卷听力：index.html -> toggleAudio()
# ============================================================================
set -euo pipefail

BR="${1:-40}"                          # 码率 kbps（语音 32~48 即可）
APP="voip"                             # OPUS 应用模式：voip=语音通话优化
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
AUDIO_DIR="$ROOT/audio"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "❌ 未找到 ffmpeg。请先安装后再运行本脚本："
  echo "   Windows: winget install ffmpeg   (或 choco install ffmpeg)"
  echo "   macOS:   brew install ffmpeg"
  echo "   Linux:   apt install ffmpeg"
  echo "   下载页: https://ffmpeg.org/download.html"
  exit 1
fi

echo "🔊 开始压缩 audio/ 下所有 MP3 → Opus (${BR}kbps, 单声道, ${APP})"
total_before=0
total_after=0
n=0

while IFS= read -r -d '' mp3; do
  opus="${mp3%.mp3}.opus"
  if [ -f "$opus" ]; then
    echo "⏭ 跳过(已存在): ${opus}"
  else
    echo "🎙 转换: $(basename "$mp3")"
    ffmpeg -y -i "$mp3" -c:a libopus -b:a "${BR}k" -ac 1 -application "$APP" -vbr on "$opus" </dev/null
    n=$((n + 1))
  fi
  before=$(stat -c%s "$mp3" 2>/dev/null || stat -f%s "$mp3")
  after=$(stat -c%s "$opus"  2>/dev/null || stat -f%s "$opus")
  total_before=$((total_before + before))
  total_after=$((total_after + after))
  pct=$(( after * 100 / before ))
  printf "   ✅ %s -> %s : %dKB -> %dKB (%d%%)\n" \
    "$(basename "$mp3")" "$(basename "$opus")" "$((before / 1024))" "$((after / 1024))" "$pct"
done < <(find "$AUDIO_DIR" -type f -name '*.mp3' -print0)

echo "────────────────────────────────────────"
if [ "$total_before" -gt 0 ]; then
  save=$(( (total_before - total_after) * 100 / total_before ))
  echo "📦 本次新转换 ${n} 个文件；累计体积 $((total_before / 1024))KB -> $((total_after / 1024))KB，节省 ${save}%"
fi
echo "💡 原 MP3 已保留作降级兜底。网页优先加载 .opus，失败自动回退 .mp3。"
