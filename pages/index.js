import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'

export default function Home() {
  const [url, setUrl] = useState('https://t1.kugou.com/645R5cG3V3')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [isWide, setIsWide] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    const check = () => setIsWide(window.innerWidth >= 1100)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleParse = async () => {
    if (!url.trim()) {
      setError('请输入分享链接')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || '解析失败')
      } else {
        setResult(data)
      }
    } catch (err) {
      setError('网络请求失败: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast('✅ 已复制到剪贴板！')
    }).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      showToast('✅ 已复制到剪贴板！')
    })
  }

  const downloadFile = async (url, filename) => {
    showToast('⏳ 正在下载...')
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error('下载失败')

      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      window.URL.revokeObjectURL(blobUrl)
      showToast('✅ 下载完成！')
    } catch (err) {
      showToast('❌ 下载失败: ' + err.message)
    }
  }

  const showToast = (msg) => {
    const toast = document.getElementById('toast')
    toast.textContent = msg
    toast.classList.add('show')
    setTimeout(() => toast.classList.remove('show'), 2500)
  }

  const formatDuration = (sec) => {
    if (!sec) return '0秒'
    return sec >= 60
      ? `${Math.floor(sec / 60)}分${sec % 60}秒`
      : `${sec}秒`
  }

  const formatSize = (bytes) => {
    if (!bytes) return '0 KB'
    return (bytes / 1024).toFixed(1) + ' KB'
  }

  const getSafeFilename = (singer, songName, suffix = '') => {
    const base = `${singer || 'unknown'} - ${songName || 'unknown'}${suffix}.mp3`
    return base.replace(/[\\/:*?"<>|]/g, '_')
  }

  const LeftPanel = () => (
    <div className="left-panel">
      <div className="card">
        <div className="card-title">🔗 输入分享链接</div>
        <div className="input-group">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleParse()}
            placeholder="https://t1.kugou.com/xxxx"
          />
          <button
            className="btn btn-primary"
            onClick={handleParse}
            disabled={loading}
          >
            {loading ? (
              <><span className="loading"></span> 解析中...</>
            ) : (
              <>🔍 开始解析</>
            )}
          </button>
        </div>

        <div className="steps">
          <h3>📖 使用说明</h3>
          <ol>
            <li>复制酷狗音乐分享链接（如 <code>t1.kugou.com/xxxx</code>）</li>
            <li>粘贴到上方输入框，点击"开始解析"</li>
            <li>后端自动获取页面并提取 MP3 直链</li>
            <li>支持 128kbps / 320kbps 在线试听和下载</li>
          </ol>
        </div>
      </div>

      {error && (
        <div className="card">
          <div className="error-msg">❌ {error}</div>
        </div>
      )}
    </div>
  )

  const RightPanel = () => {
    if (!result) {
      return (
        <div className="right-panel empty">
          <div className="placeholder">
            <div className="placeholder-icon">🎵</div>
            <p>在左侧输入链接并解析</p>
            <p style={{ fontSize: '0.85rem', color: '#666' }}>结果将显示在这里</p>
          </div>
        </div>
      )
    }

    const filename128 = getSafeFilename(result.singer, result.songName, '')
    const filename320 = getSafeFilename(result.singer, result.songName, ' [320kbps]')
    const hasHQ = result.hqAvailable && result.hqUrl

    return (
      <div className="right-panel">
        <div className="card result">
          <div className="card-title">✅ 解析结果</div>

          <div className="song-header">
            {result.albumImg && (
              <img
                className="cover-img"
                src={result.albumImg.replace('{size}', '400')}
                alt="封面"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            )}
            <div className="song-meta">
              <h2>{result.songName}</h2>
              <p>
                🎤 {result.singer}
                {result.originalSinger && ` (原唱: ${result.originalSinger})`}
              </p>
              {result.isAIK && (
                <p style={{ fontSize: '0.8rem', color: '#00d4ff', marginTop: '4px' }}>
                  🤖 AI 翻唱作品
                </p>
              )}
            </div>
          </div>

          <div className="song-info">
            <div className="info-item">
              <div className="label">⏱️ 时长</div>
              <div className="value">{formatDuration(result.duration)}</div>
            </div>
            <div className="info-item">
              <div className="label">🔊 码率</div>
              <div className="value">{result.bitrate} kbps</div>
            </div>
            <div className="info-item">
              <div className="label">📦 大小</div>
              <div className="value">{formatSize(result.fileSize)}</div>
            </div>
            <div className="info-item">
              <div className="label">🔑 Hash</div>
              <div className="value" style={{ fontSize: '10px' }}>{result.hash}</div>
            </div>
          </div>

          {/* 128kbps 区域 */}
          <div className="link-box">
            <div className="link-label">🎧 在线试听（128kbps）</div>
            <audio
              ref={audioRef}
              className="audio-player"
              controls
              preload="metadata"
              src={result.mp3Url}
            />
            <div className="link-url" style={{ marginTop: '10px' }}>{result.mp3Url}</div>
            <div className="link-actions">
              <button
                className="btn-small btn-copy"
                onClick={() => copyToClipboard(result.mp3Url)}
              >
                📋 复制链接
              </button>
              <button
                className="btn-small btn-download"
                onClick={() => downloadFile(result.mp3Url, filename128)}
              >
                ⬇️ 下载 128kbps
              </button>
            </div>
          </div>

          {/* 备用链接 */}
          {result.backupUrl && (
            <div className="link-box">
              <div className="link-label">🔗 备用链接（TX 节点）</div>
              <div className="link-url">{result.backupUrl}</div>
              <div className="link-actions">
                <button
                  className="btn-small btn-copy"
                  onClick={() => copyToClipboard(result.backupUrl)}
                >
                  📋 复制
                </button>
                <button
                  className="btn-small btn-download"
                  onClick={() => downloadFile(result.backupUrl, filename128)}
                >
                  ⬇️ 下载
                </button>
              </div>
            </div>
          )}

          {/* 320kbps 高音质区域 */}
          {hasHQ ? (
            <div className="link-box hq-box">
              <div className="link-label" style={{ color: '#ffc107' }}>
                💎 高音质（{result.hqBitrate || 320}kbps）
              </div>
              <audio
                className="audio-player"
                controls
                preload="metadata"
                src={result.hqUrl}
              />
              <div className="link-url" style={{ marginTop: '10px' }}>{result.hqUrl}</div>
              <div className="link-actions">
                <button
                  className="btn-small btn-copy"
                  onClick={() => copyToClipboard(result.hqUrl)}
                >
                  📋 复制链接
                </button>
                <button
                  className="btn-small btn-download"
                  onClick={() => downloadFile(result.hqUrl, filename320)}
                >
                  ⬇️ 下载 320kbps
                </button>
              </div>
              {result.hqBackupUrl && (
                <div style={{ marginTop: '8px' }}>
                  <div className="link-url">{result.hqBackupUrl}</div>
                  <div className="link-actions">
                    <button
                      className="btn-small btn-copy"
                      onClick={() => copyToClipboard(result.hqBackupUrl)}
                    >
                      📋 复制备用
                    </button>
                    <button
                      className="btn-small btn-download"
                      onClick={() => downloadFile(result.hqBackupUrl, filename320)}
                    >
                      ⬇️ 下载备用
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="link-box" style={{ borderColor: 'rgba(255,193,7,0.15)', opacity: 0.7 }}>
              <div className="link-label" style={{ color: '#888' }}>
                💎 高音质（320kbps）— 未获取到链接
              </div>
              <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                该歌曲可能不提供 320kbps 下载，或需要 VIP 权限
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <Head>
        <title>酷狗音乐分享链接解析器</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="page">
        <div className="header">
          <h1>🎵 酷狗音乐分享链接解析器</h1>
          <p>粘贴分享链接，自动提取 MP3 下载地址（支持 128kbps / 320kbps）</p>
        </div>

        <div className={`main-content ${isWide ? 'wide' : ''}`}>
          <LeftPanel />
          <RightPanel />
        </div>
      </div>

      <div className="toast" id="toast"></div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
          color: #e0e0e0;
          padding: 20px;
        }
        .header {
          text-align: center;
          padding: 20px 0 30px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .header h1 {
          font-size: 1.8rem;
          color: #00d4ff;
          margin-bottom: 6px;
          text-shadow: 0 0 20px rgba(0,212,255,0.3);
        }
        .header p {
          color: #8892b0;
          font-size: 0.9rem;
        }
        .main-content {
          max-width: 800px;
          margin: 0 auto;
        }
        .main-content.wide {
          max-width: 1200px;
          display: grid;
          grid-template-columns: 420px 1fr;
          gap: 20px;
          align-items: start;
        }
        .left-panel, .right-panel {
          width: 100%;
        }
        .right-panel.empty {
          min-height: 400px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .placeholder {
          text-align: center;
          color: #555;
        }
        .placeholder-icon {
          font-size: 4rem;
          margin-bottom: 16px;
          opacity: 0.5;
        }
        .card {
          background: rgba(255,255,255,0.05);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 16px;
          border: 1px solid rgba(255,255,255,0.08);
        }
        .card-title {
          font-size: 1.1rem;
          color: #00d4ff;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .input-group {
          display: flex;
          gap: 10px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .input-group input {
          flex: 1;
          min-width: 200px;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 12px;
          padding: 14px 18px;
          color: #e0e0e0;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.3s;
        }
        .input-group input:focus {
          border-color: #00d4ff;
        }
        .input-group input::placeholder {
          color: #555;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 28px;
          border: none;
          border-radius: 12px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }
        .btn-primary {
          background: linear-gradient(135deg, #00d4ff, #0099cc);
          color: #0f0c29;
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,212,255,0.3);
        }
        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .steps {
          background: rgba(0,212,255,0.05);
          border: 1px solid rgba(0,212,255,0.15);
          border-radius: 12px;
          padding: 16px;
        }
        .steps h3 {
          color: #00d4ff;
          font-size: 0.9rem;
          margin-bottom: 10px;
        }
        .steps ol {
          padding-left: 20px;
          font-size: 0.85rem;
          color: #b0b0b0;
          line-height: 1.8;
        }
        .steps code {
          background: rgba(0,0,0,0.3);
          padding: 2px 6px;
          border-radius: 4px;
          color: #00d4ff;
          font-family: monospace;
        }
        .result {
          animation: fadeIn 0.5s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .song-header {
          display: flex;
          align-items: center;
          gap: 20px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .cover-img {
          width: 120px;
          height: 120px;
          border-radius: 12px;
          object-fit: cover;
          border: 2px solid rgba(0,212,255,0.3);
        }
        .song-meta h2 {
          color: #e0e0e0;
          font-size: 1.5rem;
          margin-bottom: 4px;
        }
        .song-meta p {
          color: #8892b0;
        }
        .song-info {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 10px;
          margin-bottom: 20px;
        }
        .info-item {
          background: rgba(0,0,0,0.2);
          padding: 12px 14px;
          border-radius: 10px;
        }
        .info-item .label {
          font-size: 0.7rem;
          color: #8892b0;
          margin-bottom: 4px;
          text-transform: uppercase;
        }
        .info-item .value {
          font-size: 0.95rem;
          color: #e0e0e0;
          word-break: break-all;
        }
        .link-box {
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(0,212,255,0.2);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 12px;
        }
        .link-box.hq-box {
          border-color: rgba(255,193,7,0.3);
          background: rgba(255,193,7,0.03);
        }
        .link-box .link-label {
          font-size: 0.8rem;
          color: #00d4ff;
          margin-bottom: 8px;
          font-weight: 600;
        }
        .link-box .link-url {
          font-family: "SF Mono", "Consolas", monospace;
          font-size: 11px;
          color: #a0a0a0;
          word-break: break-all;
          line-height: 1.6;
          background: rgba(0,0,0,0.3);
          padding: 10px;
          border-radius: 8px;
          margin-bottom: 10px;
        }
        .link-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .btn-small {
          padding: 8px 16px;
          font-size: 0.8rem;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          transition: all 0.3s;
          font-weight: 600;
        }
        .btn-copy {
          background: rgba(0,212,255,0.15);
          color: #00d4ff;
        }
        .btn-copy:hover {
          background: rgba(0,212,255,0.25);
        }
        .btn-download {
          background: rgba(76,175,80,0.15);
          color: #4caf50;
        }
        .btn-download:hover {
          background: rgba(76,175,80,0.25);
        }
        .audio-player {
          width: 100%;
          margin-top: 10px;
          border-radius: 8px;
          height: 40px;
        }
        .error-msg {
          background: rgba(244,67,54,0.1);
          border: 1px solid rgba(244,67,54,0.2);
          color: #f44336;
          padding: 16px;
          border-radius: 12px;
          text-align: center;
        }
        .toast {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%) translateY(100px);
          background: #00d4ff;
          color: #0f0c29;
          padding: 12px 24px;
          border-radius: 12px;
          font-weight: 700;
          opacity: 0;
          transition: all 0.3s;
          z-index: 1000;
          box-shadow: 0 4px 20px rgba(0,212,255,0.3);
        }
        .toast.show {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
        .loading {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 2px solid rgba(15,12,41,0.3);
          border-top-color: #0f0c29;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 1100px) {
          .header h1 { font-size: 1.4rem; }
          .song-header { flex-direction: column; text-align: center; }
          .input-group { flex-direction: column; }
          .input-group input { width: 100%; }
          .main-content.wide {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  )
}
