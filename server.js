const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 8000;

// MIME类型映射
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

const server = http.createServer((req, res) => {
    console.log(`[${new Date().toLocaleString()}] ${req.method} ${req.url}`);

    // 处理根路径
    if (req.url === '/') {
        req.url = '/index.html';
    }

    // 构建文件路径
    const filePath = path.join(__dirname, req.url);
    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeType = mimeTypes[extname] || 'application/octet-stream';

    // 读取文件
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // 文件不存在，返回404
                res.writeHead(404, { 
                    'Content-Type': 'text/html',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(`
                    <html>
                        <body>
                            <h1>404 - 页面未找到</h1>
                            <p>请求的文件 ${req.url} 不存在</p>
                            <a href="/">返回首页</a>
                        </body>
                    </html>
                `);
            } else {
                // 服务器错误
                res.writeHead(500, { 
                    'Content-Type': 'text/html',
                    'Access-Control-Allow-Origin': '*'
                });
                res.end(`
                    <html>
                        <body>
                            <h1>500 - 服务器错误</h1>
                            <p>${error.code}</p>
                        </body>
                    </html>
                `);
            }
        } else {
            // 成功返回文件
            res.writeHead(200, { 
                'Content-Type': mimeType,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
                'Access-Control-Allow-Headers': '*'
            });
            res.end(content, 'utf-8');
        }
    });
});

// 启动服务器
server.listen(PORT, '127.0.0.1', () => {
    console.log('=' * 50);
    console.log('🛒 易购商城服务器已启动!');
    console.log('=' * 50);
    console.log(`📍 本地访问地址: http://localhost:${PORT}`);
    console.log(`🌐 网络访问地址: http://127.0.0.1:${PORT}`);
    console.log(`📁 服务目录: ${__dirname}`);
    console.log('=' * 50);
    console.log('按 Ctrl+C 停止服务器');
    console.log('=' * 50);

    // 尝试自动打开浏览器
    const url = `http://localhost:${PORT}`;
    let command;
    
    switch (process.platform) {
        case 'win32':
            command = `start "" "${url}"`;
            break;
        case 'darwin':
            command = `open "${url}"`;
            break;
        default:
            command = `xdg-open "${url}"`;
    }
    
    exec(command, (error) => {
        if (error) {
            console.log('⚠️ 无法自动打开浏览器，请手动访问上述地址');
        } else {
            console.log('✅ 浏览器已自动打开');
        }
    });

    console.log('\n🚀 服务器正在运行中...');
});

// 处理服务器错误
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.log(`❌ 端口 ${PORT} 已被占用，请尝试其他端口`);
    } else {
        console.log(`❌ 启动服务器失败: ${error}`);
    }
    
    process.exit(1);
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n\n👋 服务器已停止');
    process.exit(0);
});