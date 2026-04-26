'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Loader2, Globe, AlertCircle, CheckCircle2, History, Trash2, Hexagon, Sparkles } from 'lucide-react';

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
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
    const lastTime = localStorage.getItem('web2native_last_build');
    if (lastTime) {
      setLastBuildTime(Number(lastTime));
    }
  }, []);

  useEffect(() => {
    if (lastBuildTime) {
      const checkRateLimit = () => {
        const timeDiff = Date.now() - lastBuildTime;
        const oneDay = 24 * 60 * 60 * 1000;
        if (timeDiff < oneDay) {
          const remainingMs = oneDay - timeDiff;
          const h = Math.floor(remainingMs / (1000 * 60 * 60));
          const m = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((remainingMs % (1000 * 60)) / 1000);
          const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
          setTimeRemaining(formatted);
        } else {
          setTimeRemaining(null);
        }
      };
      
      checkRateLimit();
      const interval = setInterval(checkRateLimit, 1000);
      return () => clearInterval(interval);
    }
  }, [lastBuildTime]);

  const saveHistory = (items: HistoryItem[]) => {
    setHistory(items);
    localStorage.setItem('web2native_history', JSON.stringify(items));
  };

  const updateHistoryItem = (id: string, updates: Partial<HistoryItem>) => {
    setHistory(prev => {
      const newHistory = prev.map(item => item.id === id ? { ...item, ...updates } : item);
      localStorage.setItem('web2native_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    if (confirm('Yakin ingin menghapus semua history?')) {
      saveHistory([]);
    }
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
      const formatted = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      setError(`⚠️ Rate limit: 1 build per 24 hours. Wait ${formatted}`);
      return;
    }
    
    let formattedUrl = websiteUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'https://' + formattedUrl;
    }

    setIsLoading(true);
    setError(null);
    setBuildStatus(null);
    setIsDone(false);
    setRequestId(null);
    
    try {
      const response = await fetch('/api/build', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ appName, websiteUrl: formattedUrl }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to initiate application build.');
      }
      
      const newId = result.data.requestId;
      setRequestId(newId);
      
      const now = Date.now();
      setLastBuildTime(now);
      localStorage.setItem('web2native_last_build', now.toString());
      
      const newItem: HistoryItem = {
        id: newId,
        appName,
        websiteUrl: formattedUrl,
        date: now,
        status: 'PROCESSING'
      };
      saveHistory([newItem, ...history]);
      
    } catch (err: any) {
      setError(err.message || 'System error occurred.');
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
            updateHistoryItem(requestId, {
              status: 'DONE',
              androidUrl: data.android_url,
              iosUrl: data.ios_url
            });
          }
        }
      } catch (err) {
        console.error('Failed to check status', err);
      }
    };
    if (requestId && !isDone) {
      checkStatus();
      interval = setInterval(checkStatus, 5000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [requestId, isDone]);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem', minHeight: '100vh' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div 
          className="glass-neo" 
          style={{ padding: '0.75rem 1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }} 
          onClick={() => setShowHistory(false)}
        >
          <Sparkles size={24} style={{ color: '#ffd700' }} />
          <div>
            <div style={{ fontWeight: '900', fontSize: '1.25rem', letterSpacing: '-0.05em' }}>SCRAPENATIVE</div>
            <div style={{ fontSize: '0.6rem', fontWeight: 'bold', opacity: 0.8 }}>NEO • GLASS</div>
          </div>
        </div>
        
        <button 
          className="glass-neo" 
          style={{ padding: '0.75rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} 
          onClick={() => setShowHistory(!showHistory)}
        >
          <History size={20} />
          <span style={{ fontWeight: 'bold' }}>HISTORY</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {showHistory ? (
          <motion.div 
            key="history" 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="glass-neo" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>📁 BUILD HISTORY</h2>
                {history.length > 0 && (
                  <button 
                    className="neo-button" 
                    style={{ background: '#ff3366', padding: '0.5rem 1rem', fontSize: '0.75rem', cursor: 'pointer' }} 
                    onClick={clearHistory}
                  >
                    <Trash2 size={14} style={{ display: 'inline', marginRight: '0.25rem' }} /> CLEAR ALL
                  </button>
                )}
              </div>
            </div>
            
            {history.length === 0 ? (
              <div className="glass-neo" style={{ padding: '3rem', textAlign: 'center' }}>
                <History size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <p style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>NO BUILDS YET</p>
                <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.7 }}>Start your first conversion ☝️</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {history.map((item) => (
                  <div key={item.id} className="glass-neo" style={{ padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div>
                        <h3 style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{item.appName}</h3>
                        <p style={{ fontSize: '0.7rem', fontFamily: 'monospace', opacity: 0.7, wordBreak: 'break-all' }}>{item.websiteUrl}</p>
                      </div>
                      <span 
                        className="neo-border" 
                        style={{ 
                          padding: '0.25rem 0.75rem', 
                          fontSize: '0.65rem', 
                          fontWeight: 'bold', 
                          background: item.status === 'DONE' ? '#a3e635' : '#fbbf24',
                          color: 'black',
                          display: 'inline-block',
                          alignSelf: 'flex-start'
                        }}
                      >
                        {item.status}
                      </span>
                    </div>
                    
                    {item.status === 'DONE' ? (
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {item.androidUrl && (
                          <a 
                            href={item.androidUrl} 
                            className="neo-button-glass" 
                            style={{ flex: 1, textAlign: 'center', padding: '0.75rem', textDecoration: 'none', display: 'block', minWidth: '120px', cursor: 'pointer' }}
                            target="_blank"
                            rel="noreferrer"
                          >
                            📱 ANDROID
                          </a>
                        )}
                        {item.iosUrl && (
                          <a 
                            href={item.iosUrl} 
                            className="neo-button-glass" 
                            style={{ flex: 1, textAlign: 'center', padding: '0.75rem', textDecoration: 'none', display: 'block', minWidth: '120px', background: 'rgba(255,255,255,0.9)', color: 'black', cursor: 'pointer' }}
                            target="_blank"
                            rel="noreferrer"
                          >
                            🍎 iOS
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="neo-border" style={{ padding: '0.75rem', textAlign: 'center', background: 'rgba(0,0,0,0.5)', color: 'white' }}>
                        <Loader2 size={16} style={{ display: 'inline', animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} /> COMPILING...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="build" 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 20 }}
          >
            {/* Hero Section */}
            <div className="glass-neo" style={{ padding: '2rem', textAlign: 'center', marginBottom: '1.5rem' }}>
              <h1 style={{ fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-0.05em', marginBottom: '0.75rem' }}>
                WEB → <span style={{ background: '#ffd700', padding: '0 0.5rem', display: 'inline-block', color: 'black' }}>NATIVE</span>
              </h1>
              <p style={{ fontWeight: 'bold', fontSize: '0.85rem', letterSpacing: '0.05em' }}>ZERO CODE • ANDROID & iOS • 100% FREE</p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                <span className="neo-border" style={{ padding: '0.35rem 1rem', fontSize: '0.7rem', fontWeight: 'bold', background: 'rgba(255,255,255,0.2)' }}>⚡ FAST</span>
                <span className="neo-border" style={{ padding: '0.35rem 1rem', fontSize: '0.7rem', fontWeight: 'bold', background: 'rgba(255,255,255,0.2)' }}>🔒 SECURE</span>
                <span className="neo-border" style={{ padding: '0.35rem 1rem', fontSize: '0.7rem', fontWeight: 'bold', background: 'rgba(255,255,255,0.2)' }}>📱 NATIVE</span>
              </div>
            </div>

            {/* Form Section */}
            <div className="glass-neo" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '1.75rem' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', letterSpacing: '0.05em' }}>APP NAME</label>
                  <input 
                    className="neo-input" 
                    type="text" 
                    placeholder="MyAwesomeApp" 
                    value={appName} 
                    onChange={(e) => setAppName(e.target.value)} 
                    disabled={isLoading || isDone || !!requestId || !!timeRemaining}
                  />
                </div>
                
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', fontSize: '0.8rem', letterSpacing: '0.05em' }}>WEBSITE URL</label>
                  <div style={{ position: 'relative' }}>
                    <Globe size={18} style={{ position: 'absolute', left: '1rem', top: '1rem', opacity: 0.6 }} />
                    <input 
                      className="neo-input" 
                      style={{ paddingLeft: '2.75rem' }} 
                      type="text" 
                      placeholder="https://example.com" 
                      value={websiteUrl} 
                      onChange={(e) => setWebsiteUrl(e.target.value)} 
                      disabled={isLoading || isDone || !!requestId || !!timeRemaining}
                    />
                  </div>
                </div>
                
                {error && (
                  <div className="neo-border" style={{ padding: '0.85rem', background: 'rgba(255, 51, 102, 0.3)', marginBottom: '1rem', display: 'flex', gap: '0.5rem', fontWeight: 'bold' }}>
                    <AlertCircle size={18} /> {error}
                  </div>
                )}
                
                {timeRemaining && !error && (
                  <div className="neo-border" style={{ padding: '0.85rem', background: 'rgba(255, 215, 0, 0.2)', textAlign: 'center', fontWeight: 'bold', marginBottom: '1rem' }}>
                    ⏱️ RATE LIMIT: {timeRemaining} REMAINING
                  </div>
                )}
              </div>
              
              <div style={{ borderTop: '3px solid rgba(255,255,255,0.3)', padding: '1.5rem', background: 'rgba(0,0,0,0.2)' }}>
                {!requestId && !isDone && (
                  <button 
                    className="neo-button" 
                    style={{ width: '100%', padding: '1rem', fontSize: '1rem', cursor: 'pointer' }} 
                    onClick={handleSubmit} 
                    disabled={isLoading || !!timeRemaining}
                  >
                    {timeRemaining ? '🚫 LIMIT REACHED' : isLoading ? <><Loader2 size={18} style={{ display: 'inline', animation: 'spin 1s linear infinite', marginRight: '0.5rem' }} /> PROCESSING...</> : '⚡ BUILD NOW ⚡'}
                  </button>
                )}
                
                {(requestId || isLoading || isDone) && (
                  <div>
                    <div className="glass-neo-dark" style={{ padding: '1rem', marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>BUILD STATUS</span>
                        <span style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>
                          {isDone ? <><CheckCircle2 size={16} style={{ display: 'inline', marginRight: '0.25rem', color: '#a3e635' }} /> COMPLETED</> : <><Loader2 size={14} style={{ display: 'inline', animation: 'spin 1s linear infinite', marginRight: '0.25rem' }} /> IN PROGRESS</>}
                        </span>
                      </div>
                    </div>
                    
                    {buildStatus && (
                      <div className="glass-neo-dark" style={{ padding: '1rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                          <span>📱 ANDROID</span>
                          <span style={{ fontWeight: 'bold' }}>{buildStatus.android_status || 'WAITING'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>🍎 iOS</span>
                          <span style={{ fontWeight: 'bold' }}>{buildStatus.ios_status || 'WAITING'}</span>
                        </div>
                      </div>
                    )}
                    
                    {isDone && buildStatus && (
                      <div>
                        {buildStatus.android_url && (
                          <a 
                            href={buildStatus.android_url} 
                            className="neo-button-glass" 
                            style={{ display: 'block', textAlign: 'center', padding: '1rem', marginBottom: '0.75rem', textDecoration: 'none', cursor: 'pointer' }}
                            target="_blank"
                            rel="noreferrer"
                          >
                            📱 DOWNLOAD ANDROID APK
                          </a>
                        )}
                        {buildStatus.ios_url && (
                          <a 
                            href={buildStatus.ios_url} 
                            className="neo-button-glass" 
                            style={{ display: 'block', textAlign: 'center', padding: '1rem', marginBottom: '0.75rem', textDecoration: 'none', background: 'rgba(255,255,255,0.9)', color: 'black', cursor: 'pointer' }}
                            target="_blank"
                            rel="noreferrer"
                          >
                            🍎 DOWNLOAD iOS IPA
                          </a>
                        )}
                        <button 
                          className="neo-button" 
                          style={{ width: '100%', padding: '0.85rem', background: 'rgba(255,255,255,0.2)', color: 'white', cursor: 'pointer' }} 
                          onClick={() => { 
                            setIsDone(false); 
                            setBuildStatus(null); 
                            setRequestId(null); 
                            setAppName(''); 
                            setWebsiteUrl('');
                          }}
                        >
                          ➕ START NEW CONVERSION
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* How it works */}
            <div className="glass-neo" style={{ padding: '1.75rem', marginTop: '1.5rem' }}>
              <h3 style={{ fontWeight: '900', fontSize: '1.25rem', textAlign: 'center', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Sparkles size={20} /> HOW IT WORKS <Sparkles size={20} />
              </h3>
              {[
                { step: '1', text: 'Enter your app name and website URL' },
                { step: '2', text: 'System wraps your site in native container' },
                { step: '3', text: 'Download APK (Android) & IPA (iOS)' }
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', border: '2px solid rgba(255,255,255,0.3)', padding: '0.85rem', background: 'rgba(255,255,255,0.1)' }}>
                  <div style={{ width: '2rem', height: '2rem', background: 'white', color: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1rem' }}>{item.step}</div>
                  <span style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{item.text}</span>
                </div>
              ))}
              <div style={{ borderTop: '2px solid rgba(255,255,255,0.3)', marginTop: '1.25rem', paddingTop: '1rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
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