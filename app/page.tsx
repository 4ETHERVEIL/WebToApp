'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Loader2, Globe, AlertCircle, CheckCircle2, History, Trash2, Code, Layers, Cpu, Zap, Rocket, Shield, Hexagon } from 'lucide-react';

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

  // Load history
  useEffect(() => {
    const saved = localStorage.getItem('web2native_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
    const lastTime = localStorage.getItem('web2native_last_build');
    if (lastTime) setLastBuildTime(Number(lastTime));
  }, []);

  // Rate limit
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
          setTimeRemaining(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
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
    if (confirm('Delete all history?')) saveHistory([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appName || !websiteUrl) {
      setError('App Name and Website URL are required.');
      return;
    }

    if (lastBuildTime && Date.now() - lastBuildTime < 24 * 60 * 60 * 1000) {
      setError(`⚠️ Rate limit: 1 build per day. Try again later.`);
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appName, websiteUrl: formattedUrl }),
      });
      
      const result = await response.json();
      
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to initiate build.');
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
    <div className="min-h-screen bg-white text-black border-4 border-black">
      <div className="max-w-xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex justify-between items-center border-b-4 border-black pb-4 mb-8">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowHistory(false)}>
            <div className="w-10 h-10 bg-yellow-400 border-2 border-black flex items-center justify-center shadow-md">
              <Hexagon className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tighter">WEBTOAPP</span>
              <span className="block text-[10px] font-bold">NEO BRUTALISM</span>
            </div>
          </div>
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="border-2 border-black p-2 shadow-md hover:shadow-sm transition-all"
          >
            <History className="w-5 h-5" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {showHistory ? (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold border-l-8 border-yellow-400 pl-3">HISTORY</h2>
                {history.length > 0 && (
                  <button onClick={clearHistory} className="border-2 border-black px-3 py-1 text-xs font-bold hover:bg-red-500 hover:text-white">
                    CLEAR ALL
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <div className="border-4 border-black p-12 text-center shadow-lg">
                  <History className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="font-bold">No builds yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div key={item.id} className="border-2 border-black p-4 shadow-md">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold">{item.appName}</h3>
                          <p className="text-xs font-mono break-all">{item.websiteUrl}</p>
                        </div>
                        <span className={`border border-black px-2 py-1 text-[10px] font-bold ${item.status === 'DONE' ? 'bg-green-400' : 'bg-yellow-400'}`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {item.status === 'DONE' ? (
                          <>
                            {item.androidUrl && <a href={item.androidUrl} target="_blank" className="flex-1 border-2 border-black bg-white py-2 text-center text-xs font-bold hover:bg-yellow-400">APK</a>}
                            {item.iosUrl && <a href={item.iosUrl} target="_blank" className="flex-1 border-2 border-black bg-white py-2 text-center text-xs font-bold hover:bg-yellow-400">IPA</a>}
                          </>
                        ) : (
                          <div className="w-full border-2 border-black bg-gray-100 py-2 text-center text-xs font-bold">PROCESSING...</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="builder" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {/* Hero */}
              <div className="text-center mb-8">
                <h1 className="text-4xl font-black tracking-tighter mb-2">
                  NATIVE <span className="bg-yellow-400 inline-block px-2">APPS</span>
                </h1>
                <p className="text-sm font-bold">Convert any website → Android + iOS</p>
                <p className="text-xs mt-1">No coding required. Fast. Bold.</p>
              </div>

              {/* Form */}
              <div className="border-4 border-black shadow-lg bg-white mb-8">
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">App Name</label>
                    <input
                      type="text"
                      placeholder="My Awesome App"
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      disabled={isLoading || isDone || !!requestId}
                      className="w-full border-2 border-black p-3 font-mono focus:bg-yellow-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase mb-1">Website URL</label>
                    <input
                      type="text"
                      placeholder="https://example.com"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      disabled={isLoading || isDone || !!requestId}
                      className="w-full border-2 border-black p-3 font-mono focus:bg-yellow-400 focus:outline-none"
                    />
                  </div>
                  {error && (
                    <div className="border-2 border-red-500 bg-red-50 p-3 text-xs font-bold text-red-700">
                      {error}
                    </div>
                  )}
                </div>
                <div className="border-t-4 border-black p-6 bg-gray-50">
                  {!requestId && !isDone && (
                    <button
                      onClick={handleSubmit}
                      disabled={isLoading || !!timeRemaining}
                      className="w-full border-2 border-black bg-yellow-400 py-3 font-bold uppercase shadow-md hover:shadow-sm transition-all disabled:opacity-50"
                    >
                      {isLoading ? 'PROCESSING...' : 'CONVERT TO APP →'}
                    </button>
                  )}

                  {(requestId || isDone) && (
                    <div className="space-y-4">
                      <div className="border-2 border-black p-4 bg-white">
                        <div className="flex justify-between">
                          <span className="text-xs font-bold">STATUS</span>
                          <span className="text-sm font-bold">{isDone ? '✅ DONE' : '⏳ BUILDING...'}</span>
                        </div>
                      </div>
                      {isDone && buildStatus && (
                        <div className="space-y-2">
                          {buildStatus.android_url && (
                            <a href={buildStatus.android_url} target="_blank" className="block border-2 border-black bg-yellow-400 py-3 text-center font-bold uppercase shadow-md hover:shadow-sm">
                              📱 DOWNLOAD APK
                            </a>
                          )}
                          {buildStatus.ios_url && (
                            <a href={buildStatus.ios_url} target="_blank" className="block border-2 border-black bg-white py-3 text-center font-bold uppercase shadow-md hover:shadow-sm">
                              🍎 DOWNLOAD IPA
                            </a>
                          )}
                          <button onClick={() => { setIsDone(false); setBuildStatus(null); setRequestId(null); setAppName(''); setWebsiteUrl(''); }} className="w-full text-xs font-bold underline">
                            + New Build
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* How it works */}
              <div className="border-4 border-black shadow-lg p-6">
                <h3 className="text-xl font-bold text-center mb-6">HOW IT WORKS</h3>
                <div className="space-y-4">
                  {[
                    { icon: "1", title: "Input Your Data", desc: "Enter app name and website URL that supports mobile view." },
                    { icon: "2", title: "Native Wrapping", desc: "We generate native Android & iOS configurations automatically." },
                    { icon: "3", title: "Cloud Compilation", desc: "Secure cloud compilation delivers APK + IPA packages in minutes." }
                  ].map((item) => (
                    <div key={item.icon} className="flex gap-3 border-b-2 border-black pb-3">
                      <div className="border-2 border-black p-2 bg-yellow-400 font-bold w-8 h-8 flex items-center justify-center">{item.icon}</div>
                      <div>
                        <div className="font-bold text-sm">{item.title}</div>
                        <div className="text-xs">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t-2 border-black flex justify-between text-xs font-bold">
                  <span>🔒 Secure</span>
                  <span>⚡ 1 Build/Day</span>
                  <span>⚙️ SANN404</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}