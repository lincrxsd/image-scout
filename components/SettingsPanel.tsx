import React, { useState } from 'react';
import { AppConfig } from '../types';
import { Settings, X, Save, Key, Search } from 'lucide-react';

interface SettingsPanelProps {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, onSave, isOpen, onClose }) => {
  const [localConfig, setLocalConfig] = useState<AppConfig>(config);

  if (!isOpen) return null;

  const handleChange = (field: keyof AppConfig, value: string) => {
    setLocalConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            Configuration
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1 flex items-center gap-2">
                <Search className="w-4 h-4" />
                Google Custom Search API Key
              </label>
              <input
                type="password"
                value={localConfig.googleApiKey}
                onChange={(e) => handleChange('googleApiKey', e.target.value)}
                placeholder="AIza..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Search Engine ID (CX)
              </label>
              <input
                type="text"
                value={localConfig.googleCxId}
                onChange={(e) => handleChange('googleCxId', e.target.value)}
                placeholder="0123456789..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Required for fetching images. Enable "Image search" in your CSE control panel.
              </p>
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <label className="block text-sm font-medium text-zinc-400 mb-1 flex items-center gap-2">
                <Key className="w-4 h-4" />
                Gemini API Key (Optional)
              </label>
              <input
                type="password"
                value={localConfig.geminiApiKey}
                onChange={(e) => handleChange('geminiApiKey', e.target.value)}
                placeholder="AIza..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Required only for AI keyword expansion features.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex justify-end">
          <button
            onClick={() => onSave(localConfig)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};