@echo off
title 推送项目到GitHub
color 0A

echo ========================================
echo    🚀 推送易购商城到GitHub
echo ========================================
echo.

REM 检查是否在正确目录
if not exist "index.html" (
    echo ❌ 错误：请在项目目录运行此脚本
    echo     当前目录：%cd%
    pause
    exit /b 1
)

echo ✅ 项目目录检查通过
echo.

REM 检查Git配置
echo 📋 检查Git配置...
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未找到Git，请先安装Git
    echo    下载地址: https://git-scm.com/download/win
    pause
    exit /b 1
)

echo ✅ Git已安装
echo.

REM 检查远程仓库配置
echo 📋 检查远程仓库...
git remote -v
echo.

REM 提示用户
echo ⚠️ 注意：推送需要GitHub身份验证
echo.
echo 请确保：
echo 1. 仓库 https://github.com/su-ron/shopping.git 存在
echo 2. 您有推送权限
echo 3. 已配置GitHub凭证
echo.

REM 尝试推送
echo 🚀 开始推送...
echo.
git push -u origin master

if %errorlevel% equ 0 (
    echo.
    echo ✅ 推送成功！
    echo 📍 仓库地址：https://github.com/su-ron/shopping.git
) else (
    echo.
    echo ❌ 推送失败
    echo.
    echo 🔧 解决方案：
    echo 1. 检查GitHub用户名和密码/令牌
    echo 2. 确认仓库存在且有权限
    echo 3. 运行：git config --global credential.helper manager
    echo 4. 或使用SSH密钥
)

echo.
echo 按任意键退出...
pause >nul