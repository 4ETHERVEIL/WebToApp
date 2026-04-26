'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, Loader2, Globe, AlertCircle, CheckCircle2, 
  History, Trash2, LayoutTemplate, Layers, Cpu, Code, Hexagon,
  Sparkles, Zap, Shield, Rocket 
} from 'lucide-react';

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

  // Load history and last build time
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

  // Rate limit countdown
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
    if (confirm('Delete all history? This cannot be undone.')) {
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
      setError(`⚠️ RATE LIMIT: Maximum 1 build per day. Wait ${formatted} more.`);
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-white text-black p-4 md:p-8">
      {/* Neo Header */}
      <div className="max-w-xl mx-auto mb-12">
        <div className="flex justify-between items-center border-b-4 border-black pb-4">
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => setShowHistory(false)}
          >
            <div className="w-12 h-12 bg-yellow-400 border-3 border-black flex items-center justify-center shadow-neo-sm group-hover:shadow-neo transition-all">
              <Hexagon className="w-6 h-6" />
            </div>
            <div>
              <span className="font-black text-xl tracking-tighter block">WEBTOAPP</span>
              <span className="text-[9px] font-bold uppercase tracking-wider">Neo Brutalism</span>
            </div>
          </div>
          
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="border-2 border-black p-2 shadow-neo-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
            aria-label="History"
          >
            <History className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-xl mx-auto">
        <AnimatePresence mode="wait">
          {showHistory ? (
            // HISTORY VIEW
            <motion.div 
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black border-l-8 border-yellow-400 pl-3 tracking-tighter">
                  BUILD HISTORY
                </h2>
                {history.length > 0 && (
                  <button 
                    onClick={clearHistory}
                    className="border-2 border-black px-3 py-1.5 text-xs font-bold hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                  >
                    <Trash2 className="inline w-3 h-3 mr-1" />
                    CLEAR
                  </button>
                )}
              </div>

              {history.length === 0 ? (
                <div className="border-4 border-black p-12 text-center shadow-neo-lg">
                  <History className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="font-bold text-lg">No builds yet</p>
                  <p className="text-sm mt-2 opacity-70">Start by converting a website</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {history.map((item) => (
                    <div key={item.id} className="border-3 border-black p-5 shadow-neo bg-white">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-black text-lg tracking-tighter">{item.appName}</h3>
                          <p className="text-xs font-mono mt-1 break-all opacity-70">
                            <Globe className="inline w-3 h-3 mr-1" />
                            {item.websiteUrl}
                          </p>
                          <p className="text-[10px] font-mono mt-2 opacity-50">
                            {formatDate(item.date)}
                          </p>
                        </div>
                        <span className={`border-2 border-black px-2 py-1 text-[10px] font-bold ${item.status === 'DONE' ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`}>
                          {item.status}
                        </span>
                      </div>
                      
                      <div className="flex gap-2 mt-3">
                        {item.status === 'DONE' ? (
                          <>
                            {item.androidUrl && (
                              <a 
                                href={item.androidUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="flex-1 border-2 border-black bg-white py-2.5 text-center text-xs font-bold hover:bg-yellow-400 transition-all flex items-center justify-center gap-2"
                              >
                                <Download className="w-3 h-3" /> APK
                              </a>
                            )}
                            {item.iosUrl && (
                              <a 
                                href={item.iosUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="flex-1 border-2 border-black bg-white py-2.5 text-center text-xs font-bold hover:bg-yellow-400 transition-all flex items-center justify-center gap-2"
                              >
                                <Download className="w-3 h-3" /> IPA
                              </a>
                            )}
                          </>
                        ) : (
                          <div className="w-full border-2 border-black bg-gray-100 py-2.5 text-center text-xs font-bold flex items-center justify-center gap-2">
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
            // BUILDER VIEW - MAIN FORM
            <motion.div 
              key="builder"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              {/* Hero Section */}
              <div className="mb-10 text-center">
                <div className="inline-block mb-4">
                  <div className="border-3 border-black p-2 shadow-neo-sm bg-yellow-400">
                    <Sparkles className="w-8 h-8" />
                  </div>
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter mb-3">
                  NATIVE <span className="bg-yellow-400 inline-block px-2 rotate-1">APPS</span>
                </h1>
                <p className="text-sm font-mono font-bold uppercase tracking-wider">
                  Convert any website → Android + iOS
                </p>
                <p className="text-xs font-mono mt-2 opacity-60">No coding required. Fast. Bold.</p>
              </div>

              {/* Main Form Card */}
              <div className="border-4 border-black shadow-neo-lg bg-white overflow-hidden mb-8">
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase mb-2 tracking-wider">
                      App Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., My Awesome App"
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                      disabled={isLoading || isDone || !!requestId || !!timeRemaining}
                      className="input-neo"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase mb-2 tracking-wider">
                      Website URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://example.com"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      disabled={isLoading || isDone || !!requestId || !!timeRemaining}
                      className="input-neo"
                    />
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="border-2 border-red-500 bg-red-50 p-3 text-xs font-bold flex gap-2"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                      <span className="text-red-700">{error}</span>
                    </motion.div>
                  )}
                  
                  {timeRemaining && !error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="border-2 border-orange-500 bg-orange-50 p-3 text-xs font-bold text-center text-orange-700"
                    >
                      <AlertCircle className="inline w-4 h-4 mr-1" />
                      RATE LIMIT: {timeRemaining} remaining
                    </motion.div>
                  )}
                </form>

                <div className="border-t-4 border-black p-6 bg-gray-50">
                  {!requestId && !isDone && (
                    <button
                      onClick={handleSubmit}
                      disabled={isLoading || !!timeRemaining}
                      className="btn-neo w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {timeRemaining ? (
                        'LIMIT REACHED'
                      ) : isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          PROCESSING...
                        </>
                      ) : (
                        <>
                          <Rocket className="w-4 h-4" />
                          CONVERT TO APP →
                        </>
                      )}
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
                        <div className="border-2 border-black p-4 shadow-neo-sm bg-white">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-black uppercase">Build Status</span>
                            <span className="text-sm font-bold flex items-center gap-2">
                              {isDone ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                  <span className="text-green-600">COMPLETED</span>
                                </>
                              ) : (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin text-yellow-600" />
                                  <span className="text-yellow-600">IN PROGRESS</span>
                                </>
                              )}
                            </span>
                          </div>
                        </div>

                        {buildStatus && (
                          <div className="border-2 border-black p-4 space-y-3 bg-white">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-sm flex items-center gap-2">
                                <Layers className="w-4 h-4" /> Android
                              </span>
                              <span className={`text-xs font-bold px-2 py-1 border-2 border-black ${buildStatus.android_status === 'DONE' ? 'bg-green-400' : 'bg-yellow-400'}`}>
                                {buildStatus.android_status || 'WAITING'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-sm flex items-center gap-2">
                                <Cpu className="w-4 h-4" /> iOS
                              </span>
                              <span className={`text-xs font-bold px-2 py-1 border-2 border-black ${buildStatus.ios_status === 'DONE' ? 'bg-green-400' : 'bg-yellow-400'}`}>
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
                              <a 
                                href={buildStatus.android_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="block border-2 border-black bg-yellow-400 py-3.5 text-center font-black uppercase tracking-wider shadow-neo-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                              >
                                <Download className="inline w-4 h-4 mr-2" /> DOWNLOAD APK (Android)
                              </a>
                            )}
                            {buildStatus.ios_url && (
                              <a 
                                href={buildStatus.ios_url} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="block border-2 border-black bg-white py-3.5 text-center font-black uppercase tracking-wider shadow-neo-sm hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
                              >
                                <Download className="inline w-4 h-4 mr-2" /> DOWNLOAD IPA (iOS)
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
                              className="w-full text-xs font-black uppercase underline mt-2 hover:text-yellow-600 transition-colors"
                            >
                              + Build Another App
                            </button>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Features / Documentation Section */}
              <div className="border-4 border-black shadow-neo p-6 bg-white">
                <div className="flex items-center justify-center gap-2 mb-6">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  <h3 className="text-xl font-black tracking-tighter">HOW IT WORKS</h3>
                  <Zap className="w-5 h-5 text-yellow-600" />
                </div>
                
                <div className="space-y-4">
                  <div className="flex gap-3 items-start border-b-2 border-black pb-3">
                    <div className="border-2 border-black p-2 bg-yellow-400 shrink-0">
                      <Code className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-black text-sm uppercase">1. Input Your Data</div>
                      <div className="text-xs font-mono opacity-70">Enter app name and website URL that supports mobile view.</div>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start border-b-2 border-black pb-3">
                    <div className="border-2 border-black p-2 bg-yellow-400 shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-black text-sm uppercase">2. Native Wrapping</div>
                      <div className="text-xs font-mono opacity-70">We generate native Android & iOS configurations automatically.</div>
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="border-2 border-black p-2 bg-yellow-400 shrink-0">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-black text-sm uppercase">3. Cloud Compilation</div>
                      <div className="text-xs font-mono opacity-70">Secure cloud compilation delivers APK + IPA packages in minutes.</div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="mt-6 pt-4 border-t-2 border-black">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase">Secure</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Rocket className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase">1 Build/Day</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Hexagon className="w-4 h-4" />
                      <span className="text-[10px] font-black uppercase">SANN404 FORUM</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}