#!/bin/bash
# publish-all.sh

set -e

# 获取当前脚本的真实路径（解析符号链接）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 切换到项目根目录
cd "$SCRIPT_DIR/.."
# echo "当前工作目录: $(pwd)"

# 你的子包目录列表
PACKAGES=(
  "packages/core"

  "packages/assist-counter"
  "packages/assist-dialog"
  "packages/assist-dropdown"
  "packages/assist-message"
  "packages/assist-popup"

  "packages/plugin-blockquote"
  "packages/plugin-code"
  "packages/plugin-heading"
  "packages/plugin-link"
  "packages/plugin-list"
  "packages/plugin-mark"
  "packages/plugin-media"
  "packages/plugin-table"

  "main"

  "packages/themes"
  "packages/assist-ai"
)

echo "🚀 开始发布所有包（需 2FA）..."

for pkg in "${PACKAGES[@]}"; do
  echo "📦 发布 $pkg..."
  (
    cd "$pkg"
    bun publish --access public 
  )
  echo "✅ $pkg 发布成功！"
  echo "---"
done

echo "🎉 所有包发布完成！"