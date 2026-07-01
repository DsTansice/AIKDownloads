// 酷狗分享链接解析 API
// 支持短链接 t1.kugou.com/xxx 和长链接
// 新增：通过酷狗 API 获取 320kbps 高音质链接

function extractFromHtml(html) {
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
      originalSinger: '',
      albumId: songData.albumid || songData.req_albumid || '',
      audioId: songData.audio_id || '',
    }

    const opusInfo = state.opusidByMixsongidInfo || {}
    const opusData = opusInfo.data || []
    if (opusData.length > 0) {
      const aikInfo = opusData[0].aik_audio_info || {}
      result.isAIK = true
      result.aikSongName = aikInfo.song_name || ''
      result.originalSinger = aikInfo.original_singer_name || ''
      // AIK 的 320 hash 在 aik_audio_info 中
      if (aikInfo.hash) {
        result.aikHash = aikInfo.hash
      }
    }

    return result.mp3Url ? result : null
  } catch (e) {
    return null
  }
}

async function fetchWithRedirect(url, maxRedirects = 5) {
  let currentUrl = url
  let redirects = 0
  let finalHtml = null
  let finalUrl = url

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  }

  while (redirects < maxRedirects) {
    const response = await fetch(currentUrl, {
      method: 'GET',
      headers: headers,
      redirect: 'manual',
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) break

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

    if (response.ok) {
      finalHtml = await response.text()
      finalUrl = currentUrl
    }
    break
  }

  return { html: finalHtml, finalUrl }
}

async function resolveKugouUrl(url) {
  const shortMatch = url.match(/^https?:\/\/t\d+\.kugou\.com\/([a-zA-Z0-9]+)/)
  if (shortMatch) {
    const result = await fetchWithRedirect(url)
    if (result.html) {
      if (result.finalUrl.includes('activity.kugou.com')) {
        const qrcodeMatch = result.html.match(/qrcode=([^&"']+)/)
        if (qrcodeMatch) {
          const decodedUrl = decodeURIComponent(qrcodeMatch[1])
          const realResult = await fetchWithRedirect(decodedUrl)
          return realResult
        }
      }
      return result
    }
  }

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

  if (url.includes('kugou.com')) {
    return await fetchWithRedirect(url)
  }

  return { html: null, finalUrl: url }
}

// ========== 新增：获取 320kbps 链接 ==========
async function getHighQualityUrl(hash, albumId) {
  try {
    // 方法1: 通过酷狗 play/getdata API
    const apiUrl = `https://wwwapi.kugou.com/yy/index.php?r=play/getdata&hash=${hash}&platid=4&album_id=${albumId || ''}&mid=00000000000000000000000000000000`

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.kugou.com/',
      },
    })

    if (!response.ok) return null

    const data = await response.json()

    if (data.status === 1 && data.data) {
      // play_url 或 play_backup_url 可能包含 320kbps 链接
      const playUrl = data.data.play_url || data.data.url || ''
      const backupUrl = data.data.play_backup_url || ''

      // 判断是否是 320kbps（通常 URL 中包含 320 或文件大小更大）
      const is320 = playUrl.includes('320') || (data.data.bitrate && data.data.bitrate >= 320)

      return {
        url: playUrl,
        backupUrl: backupUrl,
        bitrate: data.data.bitrate || 0,
        is320: is320,
        raw: data.data,
      }
    }
    return null
  } catch (e) {
    console.error('获取高音质链接失败:', e)
    return null
  }
}

// 方法2: 通过 getSongInfo API 获取
async function getSongInfo(hash) {
  try {
    const apiUrl = `http://m.kugou.com/app/i/getSongInfo.php?cmd=playInfo&hash=${hash}`

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      },
    })

    if (!response.ok) return null
    const data = await response.json()
    return data
  } catch (e) {
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { url } = req.body
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: '请提供有效的分享链接' })
  }

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
    // 1. 解析分享页面获取基本信息
    const result = await resolveKugouUrl(targetUrl)

    if (!result.html) {
      return res.status(500).json({
        error: '无法获取页面内容，请检查链接是否有效'
      })
    }

    const songInfo = extractFromHtml(result.html)

    if (!songInfo) {
      return res.status(500).json({
        error: '页面中未找到歌曲数据，可能该链接已过期或格式不支持'
      })
    }

    // 2. 尝试获取 320kbps 高音质链接
    let hqInfo = null

    // 优先用 320hash 获取
    const hash320 = songInfo.extra && songInfo.extra['320hash']
    const aikHash = songInfo.aikHash

    if (hash320) {
      hqInfo = await getHighQualityUrl(hash320, songInfo.albumId)
    }

    // 如果 320hash 没拿到，尝试用 AIK hash
    if (!hqInfo && aikHash) {
      hqInfo = await getHighQualityUrl(aikHash, songInfo.albumId)
    }

    // 最后尝试用 128 hash 获取（可能返回更高音质）
    if (!hqInfo) {
      hqInfo = await getHighQualityUrl(songInfo.hash, songInfo.albumId)
    }

    // 3. 合并结果
    const finalResult = {
      ...songInfo,
      hqUrl: hqInfo?.url || '',
      hqBackupUrl: hqInfo?.backupUrl || '',
      hqBitrate: hqInfo?.bitrate || 0,
      hqAvailable: !!hqInfo?.url,
    }

    return res.status(200).json(finalResult)

  } catch (error) {
    console.error('解析错误:', error)
    return res.status(500).json({
      error: '解析过程中发生错误: ' + (error.message || '未知错误')
    })
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}
