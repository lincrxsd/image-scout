import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Settings, Command, Search, Sparkles, FolderOpen, Image as ImageIcon } from 'lucide-react';
import { searchGoogleImages, getKeywords } from './services/googleSearch';
import { generateRelatedKeywords } from './services/geminiService';
import { ImageGrid } from './components/ImageGrid';
import { SettingsPanel } from './components/SettingsPanel';
import { AppConfig, KeywordData } from './types';

const INITIAL_CONFIG: AppConfig = {
  googleApiKey: '',
  googleCxId: '',
  geminiApiKey: ''
};

export default function App() {
  const [config, setConfig] = useState<AppConfig>(() => {
    const saved = localStorage.getItem('imageScoutConfig');
    return saved ? JSON.parse(saved) : INITIAL_CONFIG;
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [keywords, setKeywords] = useState<KeywordData[]>([]);
  const [activeKeywordId, setActiveKeywordId] = useState<string | null>(null);
  const [bulkInput, setBulkInput] = useState('');
  const [isAddingKeywords, setIsAddingKeywords] = useState(false);
  const [isExpanding, setIsExpanding] = useState(false);

  // Parse a line that may look like: "keyword phrase | 00:01:23"
  // - left side is the search term
  // - right side (optional) is the timecode (not used for search)
  const parseKeywordLine = (line: string): { term: string; timecode?: string; label: string } => {
    const parts = line.split('|');
    const term = (parts[0] || '').trim();
    const timecode = parts.length > 1 ? parts.slice(1).join('|').trim() : undefined;
    const label = timecode ? `${term} | ${timecode}` : term;
    return { term, timecode: timecode || undefined, label };
  };

  // Determine if configuration is valid
  const isConfigured = config.googleApiKey && config.googleCxId;

  useEffect(() => {
    localStorage.setItem('imageScoutConfig', JSON.stringify(config));
  }, [config]);

  // Load keywords from backend on mount
  useEffect(() => {
    const loadBackendKeywords = async () => {
      const lines = await getKeywords();
      if (lines && lines.length > 0) {
        addKeywords(lines);
      }
    };
    loadBackendKeywords();
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      addKeywords(lines);
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const addKeywords = (terms: string[]) => {
    // Avoid adding exact duplicates by the original label (so same keyword can exist
    // multiple times if it has different timecodes)
    const existingLabels = new Set(keywords.map(k => k.label));
    const normalized = terms
      .map(t => t.trim())
      .filter(t => t !== '')
      .map(parseKeywordLine)
      .filter(k => k.term !== '');

    const unique = normalized.filter(k => !existingLabels.has(k.label));

    if (unique.length === 0) return;

    const newKeywords: KeywordData[] = unique.map(({ term, timecode, label }) => ({
      id: crypto.randomUUID(),
      term,
      timecode,
      label,
      results: null,
      status: 'idle'
    }));

    setKeywords(prev => [...prev, ...newKeywords]);
    if (!activeKeywordId && newKeywords.length > 0) {
      // Only set active if we don't have one
      setActiveKeywordId(prev => prev ? prev : newKeywords[0].id);
    }
    setIsAddingKeywords(false);
    setBulkInput('');
  };

  const deleteKeyword = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setKeywords(prev => prev.filter(k => k.id !== id));
    if (activeKeywordId === id) {
      setActiveKeywordId(null);
    }
  };

  const handleSearch = async (keywordId: string) => {
    const keyword = keywords.find(k => k.id === keywordId);
    if (!keyword || !isConfigured) return;

    // Optimistic update
    setKeywords(prev => prev.map(k => k.id === keywordId ? { ...k, status: 'loading', error: undefined } : k));

    try {
      // Request up to 50 results (backend should paginate Google Custom Search)
      const results = await searchGoogleImages(keyword.term, config.googleApiKey, config.googleCxId, 50);
      setKeywords(prev => prev.map(k => k.id === keywordId ? { ...k, status: 'success', results } : k));
    } catch (error: any) {
      setKeywords(prev => prev.map(k => k.id === keywordId ? { ...k, status: 'error', error: error.message } : k));
    }
  };

  const handleExpandWithAI = async () => {
    if (!config.geminiApiKey) {
      setIsSettingsOpen(true);
      return;
    }

    // Expand the currently active keyword or the last one added
    const targetId = activeKeywordId || (keywords.length > 0 ? keywords[keywords.length - 1].id : null);
    if (!targetId) return;

    const targetKeyword = keywords.find(k => k.id === targetId);
    if (!targetKeyword) return;

    setIsExpanding(true);
    try {
      const newTerms = await generateRelatedKeywords(targetKeyword.term, config.geminiApiKey);
      if (newTerms.length > 0) {
        addKeywords(newTerms);
      }
    } catch (error) {
      console.error("Failed to expand", error);
    } finally {
      setIsExpanding(false);
    }
  };

  const activeKeyword = keywords.find(k => k.id === activeKeywordId);

  // Auto-search effect when a keyword is selected and has no results
  useEffect(() => {
    if (activeKeywordId && isConfigured) {
      const kw = keywords.find(k => k.id === activeKeywordId);
      if (kw && kw.status === 'idle') {
        handleSearch(activeKeywordId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKeywordId, isConfigured]);

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">

      {/* Sidebar */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-400 font-bold tracking-tight">
            <Command className="w-5 h-5" />
            <span>IMAGE SCOUT</span>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* Keywords List */}
        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {keywords.length === 0 && (
            <div className="text-center p-8 text-zinc-500 text-sm">
              <p className="mb-2">No keywords loaded.</p>
              <p>Check keywords.txt</p>
            </div>
          )}

          {keywords.map((kw) => (
            <div
              key={kw.id}
              onClick={() => setActiveKeywordId(kw.id)}
              className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-all
                ${activeKeywordId === kw.id
                  ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 border border-transparent'
                }
              `}
            >
              <div className="flex items-center gap-3 truncate">
                {kw.status === 'loading' ? (
                  <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                ) : kw.status === 'success' ? (
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                ) : kw.status === 'error' ? (
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-zinc-600" />
                )}
                <span className="truncate font-medium">{kw.term}</span>
              </div>
              <button
                onClick={(e) => deleteKeyword(kw.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Sidebar Footer Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900 space-y-3">
          {isAddingKeywords ? (
            <div className="space-y-2 animate-in slide-in-from-bottom-2">
              <textarea
                autoFocus
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder="Enter keywords (one per line)..."
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    addKeywords(bulkInput.split('\n'));
                  }
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => addKeywords(bulkInput.split('\n'))}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-1.5 rounded-md font-medium"
                >
                  Add
                </button>
                <button
                  onClick={() => setIsAddingKeywords(false)}
                  className="px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs py-1.5 rounded-md"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsAddingKeywords(true)}
                className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 rounded-lg text-xs font-medium transition-colors border border-zinc-700"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Keyword
              </button>

              <label className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 rounded-lg text-xs font-medium transition-colors border border-zinc-700 cursor-pointer">
                <FolderOpen className="w-3.5 h-3.5" />
                Import File
                <input type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          )}

          <button
            onClick={handleExpandWithAI}
            disabled={isExpanding || !activeKeywordId}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all border
              ${activeKeywordId
                ? 'bg-gradient-to-r from-pink-900/40 to-indigo-900/40 border-indigo-500/30 text-indigo-200 hover:border-indigo-500/50'
                : 'bg-zinc-800/50 text-zinc-500 border-zinc-800 cursor-not-allowed'}
            `}
          >
            {isExpanding ? (
              <span className="animate-pulse">Reasoning...</span>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Expand with Gemini AI
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-zinc-950 relative">
        {!isConfigured ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="bg-zinc-900 p-4 rounded-2xl mb-6 shadow-xl border border-zinc-800">
              <Settings className="w-12 h-12 text-indigo-500 mx-auto" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Configuration Required</h1>
            <p className="text-zinc-400 max-w-md mb-8">
              To start searching, please configure your Google Custom Search API Key and Search Engine ID.
            </p>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20"
            >
              Open Settings
            </button>
          </div>
        ) : !activeKeyword ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 opacity-60">
            <div className="w-32 h-32 border-4 border-dashed border-zinc-800 rounded-2xl flex items-center justify-center mb-4">
              <ImageIcon className="w-12 h-12" />
            </div>
            <p className="text-lg font-medium">Select or add a keyword to begin</p>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950/80 backdrop-blur z-20 sticky top-0">
              <div>
                <h1 className="text-lg font-bold text-white flex items-center gap-3">
                  {activeKeyword.term}
                  {activeKeyword.timecode ? (
                    <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-xs font-normal border border-zinc-700">
                      {activeKeyword.timecode}
                    </span>
                  ) : null}
                  <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-xs font-normal border border-zinc-700">
                    {activeKeyword.results?.length || 0} Results
                  </span>
                </h1>
                {activeKeyword.status === 'error' && (
                  <p className="text-xs text-red-400 mt-0.5">{activeKeyword.error}</p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleSearch(activeKeyword.id)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-colors border border-zinc-700"
                >
                  <Search className="w-3.5 h-3.5" />
                  Refresh
                </button>
              </div>
            </div>

            {/* Results Grid */}
            <div className="flex-1 overflow-hidden relative">
              {activeKeyword.status === 'loading' ? (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/50 backdrop-blur-sm z-10">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-indigo-400 font-medium">Fetching assets...</p>
                  </div>
                </div>
              ) : null}

              <ImageGrid results={activeKeyword.results || []} />
            </div>
          </>
        )}
      </div>

      <SettingsPanel
        config={config}
        onSave={(newConfig) => {
          setConfig(newConfig);
          setIsSettingsOpen(false);
        }}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
