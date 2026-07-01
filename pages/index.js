import { useState, useRef, useEffect } from 'react'
import Head from 'next/head'

export default function Home() {
  const [url, setUrl] = useState('https://t1.kugou.com/645R5cG3V3')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [isWide, setIsWide] = useState(false)

  useEffect(() => {
    const check = () => setIsWide(window.innerWidth >= 1100)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const handleParse = async () => {
    if (!url.trim()) { setError('请输入分享链接'); return }
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      })
      const data = await res.json()
      if (!res.ok || data.error) { setError(data.error || '解析失败') }
      else { setResult(data) }
    } catch (err) { setError('网络请求失败: ' + err.message) }
    finally { setLoading(false) }
  }

  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => toast('✅ 已复制'))
    .catch(() => { const t = document.createElement('textarea'); t.value = text; t.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); toast('✅ 已复制') })
  }

  const download = async (url, filename) => {
    toast('⏳ 下载中...')
    try {
      const r = await fetch(url)
      if (!r.ok) throw new Error('失败')
      const blob = await r.blob()
      const u = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = u; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(u); toast('✅ 下载完成')
    } catch (e) { toast('❌ 下载失败') }
  }

  const toast = (msg) => {
    const t = document.getElementById('toast')
    t.textContent = msg; t.classList.add('show')
    setTimeout(() => t.classList.remove('show'), 2000)
  }

  const fmtDur = (s) => s >= 60 ? `${Math.floor(s/60)}分${s%60}秒` : `${s}秒`
  const fmtSize = (b) => b ? (b/1024).toFixed(1)+' KB' : '0 KB'
  const safeName = (singer, name, suf='') => `${singer||'unknown'} - ${name||'unknown'}${suf}.mp3`.replace(/[\\/:*?"<>|]/g, '_')

  return (
    <>
      <Head><title>酷狗AIK音乐解析下载器</title></Head>
      <div className="wrap">
        <h1>🎵 酷狗AIK音乐解析下载器</h1>
        <p className="sub">粘贴分享链接，自动提取 MP3 下载地址</p>

        <div className={`grid ${isWide?'wide':''}`}>
          {/* 左侧 */}
          <div className="col">
            <div className="box">
              <div className="box-h">🔗 输入分享链接</div>
              <div className="row">
                <input value={url} onChange={e=>setUrl(e.target.value)} onKeyPress={e=>e.key==='Enter'&&handleParse()} placeholder="https://t1.kugou.com/xxxx" />
                <button className="btn" onClick={handleParse} disabled={loading}>
                  {loading?<><span className="spin"/>解析中...</>:<>🔍 开始解析</>}
                </button>
              </div>
            </div>

            <div className="box tips">
              <div className="box-h">📖 使用说明</div>
              <ol>
                <li>复制酷狗音乐分享链接（如 <code>t1.kugou.com/xxxx</code>）</li>
                <li>粘贴到上方输入框，点击"开始解析"</li>
                <li>后端自动获取页面并提取 MP3 直链</li>
                <li>支持 128kbps / 320kbps 在线试听和下载</li>
              </ol>
            </div>

            {error && <div className="box err">❌ {error}</div>}
          </div>

          {/* 右侧 */}
          <div className="col">
            {!result ? (
              <div className="box empty">
                <div className="empty-icon">🎵</div>
                <p>在左侧输入链接并解析</p>
                <p className="empty-sub">结果将显示在这里</p>
              </div>
            ) : (
              <div className="box">
                <div className="box-h">✅ 解析结果</div>

                {/* 歌曲信息 */}
                <div className="info-row">
                  {result.albumImg && <img className="cover" src={result.albumImg.replace('{size}','400')} onError={e=>e.target.style.display='none'} />}
                  <div className="info-text">
                    <div className="info-name">{result.songName}</div>
                    <div className="info-singer">🎤 {result.singer}{result.originalSinger&&` (原唱: ${result.originalSinger})`}</div>
                    {result.isAIK && <div className="info-aik">🤖 AI 翻唱作品</div>}
                  </div>
                </div>

                {/* 四个信息卡片 */}
                <div className="stats">
                  <div className="stat"><div className="stat-l">⏱️ 时长</div><div className="stat-v">{fmtDur(result.duration)}</div></div>
                  <div className="stat"><div className="stat-l">🔊 码率</div><div className="stat-v">{result.bitrate} kbps</div></div>
                  <div className="stat"><div className="stat-l">📦 大小</div><div className="stat-v">{fmtSize(result.fileSize)}</div></div>
                  <div className="stat"><div className="stat-l">🔑 Hash</div><div className="stat-v hash">{result.hash}</div></div>
                </div>

                {/* 128kbps */}
                <div className="sec">
                  <div className="sec-h">🎵 标准音质（128kbps）</div>
                  <audio className="player" controls preload="metadata" src={result.mp3Url} />
                  <div className="url">{result.mp3Url}</div>
                  <div className="acts">
                    <button className="act act-copy" onClick={()=>copy(result.mp3Url)}>📋 复制链接</button>
                    <button className="act act-dl" onClick={()=>download(result.mp3Url, safeName(result.singer,result.songName))}>⬇️ 下载 128kbps</button>
                  </div>
                </div>

                {/* 备用 */}
                {result.backupUrl && (
                  <div className="sec">
                    <div className="sec-h">🔗 备用链接（TX 节点）</div>
                    <div className="url">{result.backupUrl}</div>
                    <div className="acts">
                      <button className="act act-copy" onClick={()=>copy(result.backupUrl)}>📋 复制</button>
                      <button className="act act-dl" onClick={()=>download(result.backupUrl, safeName(result.singer,result.songName))}>⬇️ 下载</button>
                    </div>
                  </div>
                )}

                {/* 320kbps */}
                {result.hqAvailable && result.hqUrl ? (
                  <div className="sec hq">
                    <div className="sec-h hq-h">💎 高音质（{result.hqBitrate||320}kbps）</div>
                    <audio className="player" controls preload="metadata" src={result.hqUrl} />
                    <div className="url">{result.hqUrl}</div>
                    <div className="acts">
                      <button className="act act-copy" onClick={()=>copy(result.hqUrl)}>📋 复制链接</button>
                      <button className="act act-dl" onClick={()=>download(result.hqUrl, safeName(result.singer,result.songName,' [320kbps]'))}>⬇️ 下载 320kbps</button>
                    </div>
                    {result.hqBackupUrl && (
                      <>
                        <div className="url" style={{marginTop:8}}>{result.hqBackupUrl}</div>
                        <div className="acts">
                          <button className="act act-copy" onClick={()=>copy(result.hqBackupUrl)}>📋 复制备用</button>
                          <button className="act act-dl" onClick={()=>download(result.hqBackupUrl, safeName(result.singer,result.songName,' [320kbps]'))}>⬇️ 下载备用</button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="sec disabled">
                    <div className="sec-h" style={{color:'#888'}}>💎 高音质（320kbps）— 未获取到链接</div>
                    <p className="disabled-txt">该歌曲可能不提供 320kbps 下载，或需要 VIP 权限</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="toast" id="toast" />

      <style jsx>{`
        .wrap { min-height:100vh; background:linear-gradient(135deg,#0f0c29,#302b63,#24243e); color:#e0e0e0; padding:20px; }
        h1 { text-align:center; color:#00d4ff; font-size:1.8rem; margin-bottom:6px; text-shadow:0 0 20px rgba(0,212,255,0.3); }
        .sub { text-align:center; color:#8892b0; font-size:0.9rem; margin-bottom:30px; }

        .grid { max-width:800px; margin:0 auto; }
        .grid.wide { max-width:1200px; display:grid; grid-template-columns:400px 1fr; gap:20px; align-items:start; }

        .col { width:100%; }

        .box { background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:20px; margin-bottom:16px; }
        .box-h { color:#00d4ff; font-size:1rem; font-weight:600; margin-bottom:14px; }

        .row { display:flex; gap:10px; flex-wrap:wrap; }
        input { flex:1; min-width:200px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.15); border-radius:10px; padding:12px 16px; color:#e0e0e0; font-size:1rem; outline:none; }
        input:focus { border-color:#00d4ff; }
        input::placeholder { color:#555; }

        .btn { display:inline-flex; align-items:center; gap:6px; padding:12px 24px; border:none; border-radius:10px; font-size:1rem; font-weight:600; cursor:pointer; background:linear-gradient(135deg,#00d4ff,#0099cc); color:#0f0c29; }
        .btn:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 6px 20px rgba(0,212,255,0.3); }
        .btn:disabled { opacity:0.5; cursor:not-allowed; }

        .tips { background:rgba(0,212,255,0.04); border-color:rgba(0,212,255,0.15); }
        .tips ol { padding-left:18px; font-size:0.85rem; color:#b0b0b0; line-height:1.8; }
        .tips code { background:rgba(0,0,0,0.3); padding:2px 6px; border-radius:4px; color:#00d4ff; font-family:monospace; }

        .err { background:rgba(244,67,54,0.08); border-color:rgba(244,67,54,0.2); color:#f44336; text-align:center; }

        .empty { min-height:300px; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#555; }
        .empty-icon { font-size:3.5rem; margin-bottom:12px; opacity:0.4; }
        .empty-sub { font-size:0.85rem; color:#666; margin-top:4px; }

        /* 歌曲信息 */
        .info-row { display:flex; align-items:center; gap:16px; margin-bottom:16px; flex-wrap:wrap; }
        .cover { width:100px; height:100px; border-radius:10px; object-fit:cover; border:2px solid rgba(0,212,255,0.3); }
        .info-name { font-size:1.4rem; font-weight:600; color:#fff; margin-bottom:4px; }
        .info-singer { color:#8892b0; font-size:0.95rem; }
        .info-aik { color:#00d4ff; font-size:0.8rem; margin-top:4px; }

        /* 统计卡片 */
        .stats { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:16px; }
        @media(max-width:600px){ .stats { grid-template-columns:repeat(2,1fr); } }
        .stat { background:rgba(0,0,0,0.25); border-radius:10px; padding:12px; }
        .stat-l { font-size:0.7rem; color:#8892b0; margin-bottom:4px; }
        .stat-v { font-size:0.95rem; color:#e0e0e0; }
        .stat-v.hash { font-size:10px; font-family:monospace; word-break:break-all; }

        /* 各区块 */
        .sec { background:rgba(0,0,0,0.2); border:1px solid rgba(0,212,255,0.2); border-radius:12px; padding:14px; margin-bottom:12px; }
        .sec-h { color:#00d4ff; font-size:0.85rem; font-weight:600; margin-bottom:10px; }
        .sec.hq { border-color:rgba(255,193,7,0.3); background:rgba(255,193,7,0.03); }
        .sec-h.hq-h { color:#ffc107; }
        .sec.disabled { border-color:rgba(255,255,255,0.05); background:rgba(0,0,0,0.08); opacity:0.7; }
        .disabled-txt { font-size:0.8rem; color:#666; margin-top:4px; }

        .player { width:100%; height:36px; margin-bottom:10px; border-radius:6px; }
        .url { font-family:monospace; font-size:11px; color:#888; word-break:break-all; background:rgba(0,0,0,0.3); padding:8px; border-radius:6px; margin-bottom:10px; line-height:1.5; }
        .acts { display:flex; gap:8px; flex-wrap:wrap; }
        .act { padding:7px 14px; border:none; border-radius:6px; font-size:0.8rem; font-weight:600; cursor:pointer; }
        .act-copy { background:rgba(0,212,255,0.12); color:#00d4ff; }
        .act-copy:hover { background:rgba(0,212,255,0.22); }
        .act-dl { background:rgba(76,175,80,0.12); color:#4caf50; }
        .act-dl:hover { background:rgba(76,175,80,0.22); }

        .toast { position:fixed; bottom:30px; left:50%; transform:translateX(-50%) translateY(100px); background:#00d4ff; color:#0f0c29; padding:10px 20px; border-radius:10px; font-weight:700; opacity:0; transition:all 0.3s; z-index:1000; }
        .toast.show { transform:translateX(-50%) translateY(0); opacity:1; }
        .spin { display:inline-block; width:16px; height:16px; border:2px solid rgba(15,12,41,0.3); border-top-color:#0f0c29; border-radius:50%; animation:spin 0.8s linear infinite; }
        @keyframes spin { to{transform:rotate(360deg)} }

        @media(max-width:1100px){
          h1 { font-size:1.4rem; }
          .grid.wide { grid-template-columns:1fr; }
          .info-row { flex-direction:column; text-align:center; }
          .row { flex-direction:column; }
          input { width:100%; }
        }
      `}</style>
    </>
  )
}
