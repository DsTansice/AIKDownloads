# AIKDownloader
🎵 酷狗AIK音乐解析下载器

一个基于 Next.js + Vercel 的酷狗音乐 AIK 分享链接解析工具，自动提取 MP3 直链，支持在线试听和下载。

## ✨ 功能特性

- 🔗 支持酷狗短链接（`t1.kugou.com/xxxx`）自动解析
- 🎵 支持 128kbps 标准音质下载
- 💎 支持 320kbps 高音质下载（通过酷狗 API 获取）
- 🎧 在线试听，无需下载
- 📋 一键复制 MP3 直链
- ⬇️ 直接下载到本地（解决 Chrome 弹窗问题）
- 🤖 自动识别 AI 翻唱作品

## 🚀 一键部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/DsTansice/AIKDownloader)

## 📦 手动部署

```bash
# 克隆项目
git clone https://github.com/DsTansice/AIKDownloader.git
cd AIKDownloader

# 安装依赖
npm install

# 本地开发
npm run dev

# 部署到 Vercel
npm i -g vercel
vercel --prod
```

## 🔗 使用示例

输入链接：`https://t1.kugou.com/6n5V11G3V3`

解析流程：
1. 粘贴分享链接到输入框
2. 点击"开始解析"
3. 后端自动跟随重定向、提取页面数据
4. 显示歌曲信息、在线试听、下载按钮

## 📁 项目结构

```
├── pages/
│   ├── index.js          # 前端页面
│   ├── _app.js           # App 组件（含统计代码）
│   └── api/
│       └── parse.js      # 后端解析 API
├── styles/
│   └── globals.css       # 全局样式
├── package.json
├── next.config.js
└── README.md
```

## 🔧 API 接口

### POST /api/parse

**请求体：**
```json
{
  "url": "https://t1.kugou.com/6n5V11G3V3"
}
```

**响应：**
```json
{
  "songName": "沈园外",
  "singer": "空零",
  "duration": 26,
  "bitrate": 128,
  "fileSize": 427214,
  "hash": "1076B28645371444B4ABF20DE814A216",
  "mp3Url": "https://sharefs.kugou.com/.../xxx.mp3",
  "backupUrl": "https://sharefs.tx.kugou.com/.../xxx.mp3",
  "albumImg": "http://imge.kugou.com/stdmusic/{size}/...jpg",
  "isAIK": true,
  "originalSinger": "落日微薰",
  "hqUrl": "https://...",
  "hqBitrate": 320,
  "hqAvailable": true
}
```

## ⚠️ 注意事项

- 提取的 MP3 链接带有时间戳签名，会过期，请及时下载
- 320kbps 高音质链接通过酷狗 API 获取，部分歌曲可能不可用
- Vercel Hobby 计划有 10 秒请求超时限制

## 👤 关于

- 作者：[https://about.ikl.ink](https://about.ikl.ink)
- 项目地址：[https://github.com/DsTansice/AIKDownloader](https://github.com/DsTansice/AIKDownloader)
- 捐赠支持：[https://thanks.ikl.ink](https://thanks.ikl.ink)

## 📄 License

MIT
