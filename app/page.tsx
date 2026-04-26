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
      setError(`⚠️ RATE LIMIT: 1 build per 24 hours. Wait ${formatted} more.`);
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
    <div className="min-h-screen bg-white text-black font-mono p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        
        {/* HEADER - Neo Brutal */}
        <div className="flex justify-between items-center mb-12 border-b-4 border-black pb-4">
          <div 
            className="flex items-center gap-3 cursor-pointer neo-shadow-sm p-2 bg-white border-2 border-black"
            onClick={() => setShowHistory(false)}
          >
            <Hexagon className="w-6 h-6 text-black" />
            <div>
              <span className="font-black text-xl tracking-tighter">SCRAPENATIVE</span>
              <span className="block text-[10px] font-bold">NEO-BRUTAL v1.0</span>
            </div>
          </div>
          
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="border-2 border-black p-2 bg-white neo-shadow-sm hover:bg-black hover:text-white transition-all"
          >
            <History className="w-5 h-5" />
          </button>
        </div>

        {/* MAIN CONTENT */}
        <AnimatePresence mode="wait">
          {showHistory ? (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center border-2 border-black p-4 bg-white neo-shadow">
                <h2 className="font-black text-xl tracking-tighter">📁 BUILD HISTORY</h2>
                {history.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="border-2 border-black px-3 py-1 text-sm font-bold bg-red-500 text-white hover:bg-black transition-all"
                  >
                    CLEAR ALL
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="border-4 border-black p-8 text-center bg-white neo-shadow-lg">
                  <History className="w-12 h-12 mx-auto mb-4" />
                  <p className="font-bold">NO BUILDS YET</p>
                  <p className="text-sm mt-2">Start your first conversion!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {history.map((item) => (
                    <div key={item.id} className="border-3 border-black p-5 bg-white neo-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-black text-lg uppercase">{item.appName}</h3>
                          <p className="text-xs font-mono mt-1 break-all">{item.websiteUrl}</p>
                        </div>
                        <span className={`border-2 border-black px-2 py-1 text-[10px] font-black ${
                          item.status === 'DONE' ? 'bg-lime-300' : 'bg-yellow-300 animate-pulse'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      
                      <div className="flex gap-3 mt-3">
                        {item.status === 'DONE' ? (
                          <>
                            {item.androidUrl && (
                              <a href={item.androidUrl} target="_blank" rel="noreferrer" 
                                 className="flex-1 border-2 border-black bg-black text-white text-center py-3 font-bold hover:bg-white hover:text-black transition-all neo-shadow-sm">
                                📱 ANDROID
                              </a>
                            )}
                            {item.iosUrl && (
                              <a href={item.iosUrl} target="_blank" rel="noreferrer"
                                 className="flex-1 border-2 border-black bg-white text-black text-center py-3 font-bold hover:bg-black hover:text-white transition-all neo-shadow-sm">
                                🍎 iOS
                              </a>
                            )}
                          </>
                        ) : (
                          <div className="w-full border-2 border-black bg-gray-100 text-center py-3 font-bold flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> COMPILING...
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
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Hero Section */}
              <div className="border-4 border-black p-6 text-center bg-white neo-shadow-lg">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-4">
                  WEB → <span className="bg-yellow-300 px-2">NATIVE</span>
                </h1>
                <p className="font-bold text-sm">
                  ZERO CODE • ANDROID & iOS • 100% FREE
                </p>
                <div className="mt-4 flex gap-2 justify-center">
                  <span className="border-2 border-black px-2 py-1 text-[10px] font-black">⚡ FAST</span>
                  <span className="border-2 border-black px-2 py-1 text-[10px] font-black">🔒 SECURE</span>
                  <span className="border-2 border-black px-2 py-1 text-[10px] font-black">📱 NATIVE</span>
                </div>
              </div>

              {/* Form Section */}
              <div className="border-4 border-black bg-white neo-shadow-lg overflow-hidden">
                <div className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                      <label className="block font-black text-sm mb-2 uppercase">APP NAME</label>
                      <input
                        type="text"
                        placeholder="MyAwesomeApp"
                        value={appName}
                        onChange={(e) => setAppName(e.target.value)}
                        disabled={isLoading || isDone || !!requestId || !!timeRemaining}
                        className="w-full border-3 border-black p-4 font-mono font-bold focus:outline-none focus:neo-shadow disabled:bg-gray-100"
                      />
                    </div>

                    <div>
                      <label className="block font-black text-sm mb-2 uppercase">WEBSITE URL</label>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" />
                        <input
                          type="text"
                          placeholder="https://example.com"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          disabled={isLoading || isDone || !!requestId || !!timeRemaining}
                          className="w-full border-3 border-black p-4 pl-12 font-mono font-bold focus:outline-none focus:neo-shadow disabled:bg-gray-100"
                        />
                      </div>
                    </div>

                    {error && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="border-3 border-red-500 bg-red-100 p-4 flex gap-2 items-start font-bold text-sm"
                      >
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p>{error}</p>
                      </motion.div>
                    )}
                    
                    {timeRemaining && !error && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="border-3 border-yellow-500 bg-yellow-100 p-4 text-center font-bold"
                      >
                        ⏱️ RATE LIMIT: {timeRemaining} REMAINING
                      </motion.div>
                    )}
                  </form>
                </div>

                <div className="border-t-4 border-black bg-gray-50 p-6">
                  {!requestId && !isDone && (
                    <button
                      onClick={handleSubmit}
                      disabled={isLoading || !!timeRemaining}
                      className="w-full border-3 border-black bg-black text-white py-4 font-black text-lg uppercase neo-shadow-lg hover:bg-white hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {timeRemaining ? '🚫 LIMIT REACHED' : isLoading ? <><Loader2 className="inline w-5 h-5 animate-spin mr-2" /> PROCESSING...</> : '⚡ BUILD NOW ⚡'}
                    </button>
                  )}

                  <AnimatePresence>
                    {(requestId || isLoading || isDone) && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-4 mt-4"
                      >
                        <div className="border-3 border-black p-4 bg-white neo-shadow-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-black text-sm uppercase">STATUS</span>
                            <span className="font-black text-xs">
                              {isDone ? '✓ COMPLETED' : <><Loader2 className="inline w-4 h-4 animate-spin mr-1" /> BUILDING</>}
                            </span>
                          </div>
                          <div className="mt-3 h-2 bg-gray-200 border border-black">
                            <motion.div 
                              className="h-full bg-black"
                              initial={{ width: "0%" }}
                              animate={{ width: isDone ? "100%" : "60%" }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        </div>

                        {buildStatus && (
                          <div className="border-3 border-black p-4 bg-white">
                            <div className="flex justify-between mb-2">
                              <span className="font-bold text-sm">📱 ANDROID</span>
                              <span className={`font-black text-xs ${buildStatus.android_status === 'DONE' ? 'text-green-600' : 'text-yellow-600'}`}>
                                {buildStatus.android_status || 'WAITING'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="font-bold text-sm">🍎 iOS</span>
                              <span className={`font-black text-xs ${buildStatus.ios_status === 'DONE' ? 'text-green-600' : 'text-yellow-600'}`}>
                                {buildStatus.ios_status || 'WAITING'}
                              </span>
                            </div>
                          </div>
                        )}

                        {isDone && buildStatus && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-3"
                          >
                            {buildStatus.android_url && (
                              <a href={buildStatus.android_url} target="_blank" rel="noreferrer"
                                 className="block border-3 border-black bg-black text-white text-center py-4 font-black text-lg neo-shadow-lg hover:bg-white hover:text-black transition-all">
                                📱 DOWNLOAD ANDROID APK
                              </a>
                            )}
                            {buildStatus.ios_url && (
                              <a href={buildStatus.ios_url} target="_blank" rel="noreferrer"
                                 className="block border-3 border-black bg-white text-black text-center py-4 font-black text-lg hover:bg-black hover:text-white transition-all">
                                🍎 DOWNLOAD iOS IPA
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
                              className="w-full border-2 border-black py-3 font-bold text-sm uppercase hover:bg-black hover:text-white transition-all"
                            >
                              ➕ NEW CONVERSION
                            </button>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Info Section */}
              <div className="border-4 border-black p-6 bg-white neo-shadow-lg">
                <h3 className="font-black text-xl mb-4 text-center">⚙️ HOW IT WORKS</h3>
                <div className="space-y-4">
                  {[
                    { icon: "1", text: "Enter your app name and website URL" },
                    { icon: "2", text: "System wraps your site in native container" },
                    { icon: "3", text: "Download APK (Android) & IPA (iOS)" }
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3 border-2 border-black p-3">
                      <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-black">{step.icon}</div>
                      <span className="font-bold text-sm">{step.text}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t-2 border-black text-center">
                  <p className="text-[10px] font-black uppercase tracking-wider">Powered by SANN404 FORUM</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}