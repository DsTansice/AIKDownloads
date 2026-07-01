// 酷狗分享链接解析 API
// 支持短链接 t1.kugou.com/xxx 和长链接

function extractFromHtml(html) {
  // 从 __NEXT_DATA__ script 标签中提取 JSON
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)
  if (!match) return null

  let jsonText = match[1].trim()
  let data
  try {
    data = JSON.parse(jsonText)
  } catch (e) {
    return null
  }

  try {
    const props = data.props || {}
    const pageProps = props.pageProps || {}
    const state = pageProps.state || {}
    const defaultSongInfo = state.defaultSongInfo || {}
    const songData = defaultSongInfo.data || {}

    const result = {
      songName: songData.songName || '',
      singer: songData.author_name || '',
      duration: songData.timeLength || 0,
      bitrate: songData.bitRate || 0,
      fileSize: songData.fileSize || 0,
      hash: songData.hash || '',
      mp3Url: songData.url || '',
      backupUrl: (songData.backup_url && songData.backup_url[0]) || '',
      albumImg: songData.album_img || '',
      extra: songData.extra || {},
      isAIK: false,
      originalSinger: ''
    }

    // AI 歌曲信息
    const opusInfo = state.opusidByMixsongidInfo || {}
    const opusData = opusInfo.data || []
    if (opusData.length > 0) {
      const aikInfo = opusData[0].aik_audio_info || {}
      result.isAIK = true
      result.aikSongName = aikInfo.song_name || ''
      result.originalSinger = aikInfo.original_singer_name || ''
    }

    return result.mp3Url ? result : null
  } catch (e) {
    return null
  }
}

async function fetchWithRedirect(url, maxRedirects = 5) {
  // 手动处理重定向，获取最终页面内容
  let currentUrl = url
  let redirects = 0
  let finalHtml = null
  let finalUrl = url

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  }

  while (redirects < maxRedirects) {
    const response = await fetch(currentUrl, {
      method: 'GET',
      headers: headers,
      redirect: 'manual',
    })

    // 处理重定向
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) break

      // 处理相对路径
      if (location.startsWith('http')) {
        currentUrl = location
      } else if (location.startsWith('/')) {
        const urlObj = new URL(currentUrl)
        currentUrl = `${urlObj.protocol}//${urlObj.host}${location}`
      } else {
        currentUrl = new URL(location, currentUrl).href
      }

      finalUrl = currentUrl
      redirects++
      continue
    }

    // 获取页面内容
    if (response.ok) {
      finalHtml = await response.text()
      finalUrl = currentUrl
    }
    break
  }

  return { html: finalHtml, finalUrl }
}

async function resolveKugouUrl(url) {
  // 解析酷狗各种分享链接格式

  // 1. 短链接 t1.kugou.com/xxxx
  const shortMatch = url.match(/^https?:\/\/t\d+\.kugou\.com\/([a-zA-Z0-9]+)/)
  if (shortMatch) {
    // 短链接需要跟随重定向
    const result = await fetchWithRedirect(url)
    if (result.html) {
      // 检查是否是中间页（activity.kugou.com）
      if (result.finalUrl.includes('activity.kugou.com')) {
        // 从中间页提取 qrcode 参数中的真实链接
        const qrcodeMatch = result.html.match(/qrcode=([^&"']+)/)
        if (qrcodeMatch) {
          const decodedUrl = decodeURIComponent(qrcodeMatch[1])
          // 再次获取真实页面
          const realResult = await fetchWithRedirect(decodedUrl)
          return realResult
        }
      }
      return result
    }
  }

  // 2. activity.kugou.com 中间页
  if (url.includes('activity.kugou.com')) {
    const result = await fetchWithRedirect(url)
    if (result.html) {
      const qrcodeMatch = result.html.match(/qrcode=([^&"']+)/)
      if (qrcodeMatch) {
        const decodedUrl = decodeURIComponent(qrcodeMatch[1])
        return await fetchWithRedirect(decodedUrl)
      }
      return result
    }
  }

  // 3. 直接是 SSR 页面 m.kugou.com/ssr/...
  if (url.includes('kugou.com')) {
    return await fetchWithRedirect(url)
  }

  return { html: null, finalUrl: url }
}

export default async function handler(req, res) {
  // 只允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url } = req.body
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: '请提供有效的分享链接' })
  }

  // 验证 URL 格式
  let targetUrl = url.trim()
  if (!targetUrl.startsWith('http')) {
    targetUrl = 'https://' + targetUrl
  }

  try {
    new URL(targetUrl)
  } catch {
    return res.status(400).json({ error: '链接格式不正确' })
  }

  try {
    // 解析链接，跟随重定向
    const result = await resolveKugouUrl(targetUrl)

    if (!result.html) {
      return res.status(500).json({ 
        error: '无法获取页面内容，请检查链接是否有效，或尝试手动粘贴页面源码解析' 
      })
    }

    // 从 HTML 中提取歌曲信息
    const songInfo = extractFromHtml(result.html)

    if (!songInfo) {
      return res.status(500).json({ 
        error: '页面中未找到歌曲数据，可能该链接已过期或格式不支持' 
      })
    }

    return res.status(200).json(songInfo)

  } catch (error) {
    console.error('解析错误:', error)
    return res.status(500).json({ 
      error: '解析过程中发生错误: ' + (error.message || '未知错误') 
    })
  }
}

// 配置 API 路由不需要 body parser（Next.js 默认已处理）
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}
