'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Loader2, Globe, AlertCircle, CheckCircle2, History, Trash2, Hexagon } from 'lucide-react';

interface HistoryItem {
  id: string;
  appName: string;
  websiteUrl: string;
  date: number;
  status: string;
  androidUrl?: string | null;
  iosUrl?: string | null;
}

export default function Home() {
  const [appName, setAppName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [buildStatus, setBuildStatus] = useState<any>(null);
  const [isDone, setIsDone] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [lastBuildTime, setLastBuildTime] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('web2native_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {}
    }
    const lastTime = localStorage.getItem('web2native_last_build');
    if (lastTime) setLastBuildTime(Number(lastTime));
  }, []);

  useEffect(() => {
    if (lastBuildTime) {
      const interval = setInterval(() => {
        const timeDiff = Date.now() - lastBuildTime;
        const oneDay = 24 * 60 * 60 * 1000;
        if (timeDiff < oneDay) {
          const remainingMs = oneDay - timeDiff;
          const h = Math.floor(remainingMs / (1000 * 60 * 60));
          const m = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((remainingMs % (1000 * 60)) / 1000);
          setTimeRemaining(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        } else {
          setTimeRemaining(null);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [lastBuildTime]);

  const saveHistory = (items: HistoryItem[]) => {
    setHistory(items);
    localStorage.setItem('web2native_history', JSON.stringify(items));
  };

  const clearHistory = () => {
    if (confirm('Yakin ingin menghapus semua history?')) saveHistory([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName || !websiteUrl) {
      setError('App Name and Website URL are required.');
      return;
    }

    if (lastBuildTime && Date.now() - lastBuildTime < 24 * 60 * 60 * 1000) {
      const remainingMs = 24 * 60 * 60 * 1000 - (Date.now() - lastBuildTime);
      const h = Math.floor(remainingMs / (1000 * 60 * 60));
      const m = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((remainingMs % (1000 * 60)) / 1000);
      setError(`⚠️ Rate limit: 1 build per 24 hours. Wait ${h}h ${m}m ${s}s.`);
      return;
    }
    
    let formattedUrl = websiteUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) formattedUrl = 'https://' + formattedUrl;

    setIsLoading(true);
    setError(null);
    setBuildStatus(null);
    setIsDone(false);
    setRequestId(null);
    
    try {
      const response = await fetch('/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName, websiteUrl: formattedUrl }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'Build failed.');
      
      const newId = result.data.requestId;
      setRequestId(newId);
      const now = Date.now();
      setLastBuildTime(now);
      localStorage.setItem('web2native_last_build', now.toString());
      saveHistory([{ id: newId, appName, websiteUrl: formattedUrl, date: now, status: 'PROCESSING' }, ...history]);
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const checkStatus = async () => {
      if (!requestId) return;
      try {
        const response = await fetch(`/api/status?requestId=${requestId}`);
        const result = await response.json();
        if (response.ok && result.success) {
          const data = result.data;
          setBuildStatus(data);
          if (data.isDone) {
            setIsDone(true);
            setIsLoading(false);
            clearInterval(interval);
            setHistory(prev => {
              const newHistory = prev.map(item => item.id === requestId ? { ...item, status: 'DONE', androidUrl: data.android_url, iosUrl: data.ios_url } : item);
              localStorage.setItem('web2native_history', JSON.stringify(newHistory));
              return newHistory;
            });
          }
        }
      } catch (err) {}
    };
    if (requestId && !isDone) {
      checkStatus();
      interval = setInterval(checkStatus, 5000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [requestId, isDone]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '4px solid black', paddingBottom: '1rem' }}>
        <div className="neo-card" style={{ padding: '0.5rem 1rem', cursor: 'pointer' }} onClick={() => setShowHistory(false)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Hexagon size={24} />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '1.25rem' }}>SCRAPENATIVE</div>
              <div style={{ fontSize: '0.6rem' }}>NEO-BRUTAL</div>
            </div>
          </div>
        </div>
        <button className="neo-button" style={{ padding: '0.5rem' }} onClick={() => setShowHistory(!showHistory)}>
          <History size={20} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {showHistory ? (
          <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="neo-card" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 'bold' }}>📁 HISTORY</h2>
              {history.length > 0 && <button className="neo-button" style={{ background: '#ff3366', padding: '0.25rem 0.75rem', fontSize: '0.75rem' }} onClick={clearHistory}>CLEAR</button>}
            </div>
            {history.length === 0 ? (
              <div className="neo-card" style={{ padding: '3rem', textAlign: 'center' }}>
                <p style={{ fontWeight: 'bold' }}>NO BUILDS YET</p>
              </div>
            ) : (
              history.map(item => (
                <div key={item.id} className="neo-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontWeight: 'bold' }}>{item.appName}</h3>
                      <p style={{ fontSize: '0.75rem' }}>{item.websiteUrl}</p>
                    </div>
                    <span className="neo-border" style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', background: item.status === 'DONE' ? '#a3e635' : '#fbbf24' }}>{item.status}</span>
                  </div>
                  {item.status === 'DONE' ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {item.androidUrl && <a href={item.androidUrl} className="neo-button" style={{ flex: 1, textAlign: 'center', padding: '0.75rem', textDecoration: 'none' }}>📱 ANDROID</a>}
                      {item.iosUrl && <a href={item.iosUrl} className="neo-button" style={{ flex: 1, textAlign: 'center', padding: '0.75rem', textDecoration: 'none', background: 'white', color: 'black' }}>🍎 iOS</a>}
                    </div>
                  ) : (
                    <div className="neo-border" style={{ padding: '0.75rem', textAlign: 'center', background: '#f3f4f6' }}><Loader2 style={{ display: 'inline', animation: 'spin 1s linear infinite' }} /> BUILDING...</div>
                  )}
                </div>
              ))
            )}
          </motion.div>
        ) : (
          <motion.div key="build" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Hero */}
            <div className="neo-card" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>WEB → <span style={{ background: '#ffd700', padding: '0 0.25rem' }}>NATIVE</span></h1>
              <p style={{ fontWeight: 'bold', fontSize: '0.875rem' }}>ZERO CODE • ANDROID & iOS • 100% FREE</p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1rem' }}>
                <span className="neo-border" style={{ padding: '0.25rem 0.75rem', fontSize: '0.7rem' }}>⚡ FAST</span>
                <span className="neo-border" style={{ padding: '0.25rem 0.75rem', fontSize: '0.7rem' }}>🔒 SECURE</span>
                <span className="neo-border" style={{ padding: '0.25rem 0.75rem', fontSize: '0.7rem' }}>📱 NATIVE</span>
              </div>
            </div>

            {/* Form */}
            <div className="neo-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>APP NAME</label>
                  <input className="neo-input" type="text" placeholder="MyAwesomeApp" value={appName} onChange={(e) => setAppName(e.target.value)} disabled={isLoading || isDone || !!requestId || !!timeRemaining} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem' }}>WEBSITE URL</label>
                  <div style={{ position: 'relative' }}>
                    <Globe style={{ position: 'absolute', left: '1rem', top: '1rem' }} size={20} />
                    <input className="neo-input" style={{ paddingLeft: '2.5rem' }} type="text" placeholder="https://example.com" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} disabled={isLoading || isDone || !!requestId || !!timeRemaining} />
                  </div>
                </div>
                {error && <div className="neo-border" style={{ padding: '0.75rem', background: '#fee2e2', marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}><AlertCircle size={18} /> {error}</div>}
                {timeRemaining && <div className="neo-border" style={{ padding: '0.75rem', background: '#fef3c7', textAlign: 'center', fontWeight: 'bold', marginBottom: '1rem' }}>⏱️ LIMIT: {timeRemaining}</div>}
              </div>
              <div style={{ borderTop: '3px solid black', padding: '1.5rem', background: '#fafafa' }}>
                {!requestId && !isDone && (
                  <button className="neo-button" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }} onClick={handleSubmit} disabled={isLoading || !!timeRemaining}>
                    {timeRemaining ? '🚫 LIMIT REACHED' : isLoading ? <><Loader2 style={{ display: 'inline', animation: 'spin 1s linear infinite' }} /> PROCESSING...</> : '⚡ BUILD NOW'}
                  </button>
                )}
                {(requestId || isLoading || isDone) && (
                  <div>
                    <div className="neo-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 'bold' }}>STATUS</span>
                        <span>{isDone ? '✓ COMPLETED' : <><Loader2 style={{ display: 'inline', animation: 'spin 1s linear infinite' }} /> BUILDING</>}</span>
                      </div>
                    </div>
                    {buildStatus && (
                      <div className="neo-border" style={{ padding: '1rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}><span>📱 ANDROID</span><span>{buildStatus.android_status || 'WAITING'}</span></div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>🍎 iOS</span><span>{buildStatus.ios_status || 'WAITING'}</span></div>
                      </div>
                    )}
                    {isDone && buildStatus && (
                      <div>
                        {buildStatus.android_url && <a href={buildStatus.android_url} className="neo-button" style={{ display: 'block', textAlign: 'center', padding: '1rem', marginBottom: '0.5rem', textDecoration: 'none' }}>📱 DOWNLOAD ANDROID</a>}
                        {buildStatus.ios_url && <a href={buildStatus.ios_url} className="neo-button" style={{ display: 'block', textAlign: 'center', padding: '1rem', marginBottom: '0.5rem', textDecoration: 'none', background: 'white', color: 'black' }}>🍎 DOWNLOAD iOS</a>}
                        <button className="neo-button" style={{ width: '100%', padding: '0.75rem', background: '#e5e5e5', color: 'black' }} onClick={() => { setIsDone(false); setBuildStatus(null); setRequestId(null); setAppName(''); setWebsiteUrl(''); }}>➕ NEW CONVERSION</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* How it works */}
            <div className="neo-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
              <h3 style={{ fontWeight: 'bold', fontSize: '1.25rem', textAlign: 'center', marginBottom: '1rem' }}>⚙️ HOW IT WORKS</h3>
              {['Enter your app name and website URL', 'System wraps your site in native container', 'Download APK & IPA'].map((step, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', border: '2px solid black', padding: '0.75rem' }}>
                  <div style={{ width: '2rem', height: '2rem', background: 'black', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{i + 1}</div>
                  <span style={{ fontWeight: 'bold' }}>{step}</span>
                </div>
              ))}
              <div style={{ borderTop: '2px solid black', marginTop: '1rem', paddingTop: '1rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                POWERED BY SANN404 FORUM
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}