'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Loader2, Globe, AlertCircle, CheckCircle2, History, Trash2, LayoutTemplate, Layers, Cpu, Code, Hexagon } from 'lucide-react';

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
      setError(`⚠️ RATE LIMIT: 1 build per day. Wait ${formatted} more.`);
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

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [requestId, isDone]);

  return (
    <div className="min-h-screen bg-white text-black p-4 md:p-8">
      {/* Header - Neo Brutalism */}
      <div className="max-w-xl mx-auto mb-12 flex justify-between items-center border-b-4 border-black pb-4">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => setShowHistory(false)}
        >
          <div className="w-10 h-10 bg-yellow-400 border-2 border-black flex items-center justify-center shadow-neo-sm">
            <Hexagon className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-xl tracking-tighter">WebToApp</span>
            <span className="block text-[10px] font-bold uppercase">Neo Brutalism</span>
          </div>
        </div>
        
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="border-2 border-black p-2 shadow-neo-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
        >
          <History className="w-5 h-5" />
        </button>
      </div>

      {/* Main Content */}
      <div className="max-w-xl mx-auto">
        <AnimatePresence mode="wait">
          {showHistory ? (
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold border-l-8 border-yellow-400 pl-3">BUILDS</h2>
                {history.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="border-2 border-black px-3 py-1 text-xs font-bold hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                  >
                    CLEAR
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="border-4 border-black p-8 text-center shadow-neo">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-bold">No builds yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {history.map((item) => (
                    <div key={item.id} className="border-3 border-black p-5 shadow-neo bg-white">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-lg">{item.appName}</h3>
                          <p className="text-xs font-mono mt-1 break-all">{item.websiteUrl}</p>
                        </div>
                        <span className={`border-2 border-black px-2 py-1 text-[10px] font-bold ${item.status === 'DONE' ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`}>
                          {item.status}
                        </span>
                      </div>
                      
                      <div className="flex gap-2 mt-3">
                        {item.status === 'DONE' ? (
                          <>
                            {item.androidUrl && (
                              <a href={item.androidUrl} target="_blank" rel="noreferrer" className="flex-1 border-2 border-black bg-white py-2 text-center text-xs font-bold hover:bg-yellow-400 transition-all flex items-center justify-center gap-2">
                                <Download className="w-3 h-3" /> APK
                              </a>
                            )}
                            {item.iosUrl && (
                              <a href={item.iosUrl} target="_blank" rel="noreferrer" className="flex-1 border-2 border-black bg-white py-2 text-center text-xs font-bold hover:bg-yellow-400 transition-all flex items-center justify-center gap-2">
                                <Download className="w-3 h-3" /> IPA
                              </a>
                            )}
                          </>
                        ) : (
                          <div className="w-full border-2 border-black bg-gray-100 py-2 text-center text-xs font-bold flex items-center justify-center gap-2">
                            <Loader2 className="w-3 h-3 animate-spin" /> PROCESSING...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="builder"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
            >
              {/* Hero */}
              <div className="mb-8 text-center">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
                  NATIVE<br/>
                  <span className="bg-yellow-400 inline-block px-2">APPS</span>
                </h1>
                <p className="text-sm font-mono">Convert any website to Android/iOS. No code. Bold.</p>
              </div>

              {/* Form Card */}
              <div className="border-4 border-black shadow-neo-lg bg-white overflow-hidden mb-8">
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold mb-1 uppercase">App Name</label>
                    <input
                      type="text"
                      placeholder="My Awesome App"
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      disabled={isLoading || isDone || !!requestId || !!timeRemaining}
                      className="w-full border-2 border-black p-3 font-mono text-sm focus:bg-yellow-400 focus:outline-none disabled:bg-gray-100"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1 uppercase">Website URL</label>
                    <input
                      type="text"
                      placeholder="https://example.com"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      disabled={isLoading || isDone || !!requestId || !!timeRemaining}
                      className="w-full border-2 border-black p-3 font-mono text-sm focus:bg-yellow-400 focus:outline-none disabled:bg-gray-100"
                    />
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-2 border-red-500 bg-red-100 p-3 text-xs font-bold flex gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                  
                  {timeRemaining && !error && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-2 border-orange-500 bg-orange-100 p-3 text-xs font-bold text-center"
                    >
                      ⚠️ RATE LIMIT: {timeRemaining} remaining
                    </motion.div>
                  )}
                </form>

                <div className="border-t-4 border-black p-6 bg-gray-50">
                  {!requestId && !isDone && (
                    <button
                      onClick={handleSubmit}
                      disabled={isLoading || !!timeRemaining}
                      className="w-full border-2 border-black bg-yellow-400 py-4 font-bold text-sm uppercase shadow-neo-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {timeRemaining ? 'LIMIT REACHED' : isLoading ? <><Loader2 className="inline w-4 h-4 animate-spin mr-2" /> PROCESSING...</> : 'CONVERT →'}
                    </button>
                  )}

                  <AnimatePresence>
                    {(requestId || isLoading || isDone) && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4 mt-4"
                      >
                        {/* Status Card */}
                        <div className="border-2 border-black p-4 shadow-neo-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold uppercase">Status</span>
                            <span className="text-sm font-bold">
                              {isDone ? (
                                <><CheckCircle2 className="inline w-4 h-4 mr-1 text-green-600" /> DONE</>
                              ) : (
                                <><Loader2 className="inline w-4 h-4 mr-1 animate-spin" /> BUILDING</>
                              )}
                            </span>
                          </div>
                        </div>

                        {buildStatus && (
                          <div className="border-2 border-black p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-bold">Android</span>
                              <span className={buildStatus.android_status === 'DONE' ? 'text-green-600' : 'text-yellow-600'}>
                                {buildStatus.android_status || 'WAITING'}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="font-bold">iOS</span>
                              <span className={buildStatus.ios_status === 'DONE' ? 'text-green-600' : 'text-yellow-600'}>
                                {buildStatus.ios_status || 'WAITING'}
                              </span>
                            </div>
                          </div>
                        )}

                        {isDone && buildStatus && (
                          <motion.div className="space-y-3">
                            {buildStatus.android_url && (
                              <a href={buildStatus.android_url} target="_blank" rel="noreferrer" className="block border-2 border-black bg-yellow-400 py-3 text-center font-bold uppercase shadow-neo-sm hover:shadow-none transition-all">
                                <Download className="inline w-4 h-4 mr-2" /> DOWNLOAD APK
                              </a>
                            )}
                            {buildStatus.ios_url && (
                              <a href={buildStatus.ios_url} target="_blank" rel="noreferrer" className="block border-2 border-black bg-white py-3 text-center font-bold uppercase shadow-neo-sm hover:shadow-none transition-all">
                                <Download className="inline w-4 h-4 mr-2" /> DOWNLOAD IPA
                              </a>
                            )}
                            <button 
                              onClick={() => {
                                setIsDone(false);
                                setBuildStatus(null);
                                setRequestId(null);
                                setAppName('');
                                setWebsiteUrl('');
                              }}
                              className="w-full text-xs font-bold uppercase underline mt-2"
                            >
                              + New Build
                            </button>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Docs Card */}
              <div className="border-4 border-black shadow-neo p-6">
                <h3 className="text-xl font-black mb-6 text-center bg-yellow-400 inline-block w-full py-2">📖 DOCS</h3>
                
                <div className="space-y-4">
                  {[
                    { icon: <Code className="w-4 h-4"/>, title: "1. Input Details", desc: "Enter app name and valid URL. Mobile-friendly required." },
                    { icon: <Layers className="w-4 h-4"/>, title: "2. Native Wrapping", desc: "We generate native Android & iOS configs." },
                    { icon: <Cpu className="w-4 h-4"/>, title: "3. Compilation", desc: "Cloud compiles APK + IPA packages." }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3 items-start border-b-2 border-black pb-3">
                      <div className="border-2 border-black p-1 bg-yellow-400">{item.icon}</div>
                      <div>
                        <div className="font-bold text-sm">{item.title}</div>
                        <div className="text-xs font-mono">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t-2 border-black text-center">
                  <div className="text-xs font-bold">⚡ SANN404 FORUM ⚡</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}