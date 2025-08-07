import React, { useState } from 'react';

interface Settings {
  model: 'gemini' | 'deepseek';
  geminiKey?: string;
  deepseekUrl?: string;
}

interface Props {
  show: boolean;
  initial: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
  onTest: (settings: Settings) => Promise<boolean>;
}

const SettingsModal: React.FC<Props> = ({ show, initial, onSave, onClose, onTest }) => {
  const [settings, setSettings] = useState<Settings>(initial);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  if (!show) return null;

  const handleChangeModel = (model: 'gemini' | 'deepseek') => {
    setSettings(prev => ({ ...prev, model }));
  };

  const handleSave = () => {
    onSave(settings);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const ok = await onTest(settings);
      setTestResult(ok ? 'Berhasil terhubung!' : 'Gagal terhubung');
    } catch (e) {
      setTestResult('Gagal terhubung');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Pengaturan AI</h2>
        <div className="space-y-4">
          <div>
            <label className="font-semibold block mb-2">Pilih Model</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1">
                <input type="radio" name="model" value="gemini" checked={settings.model==='gemini'} onChange={()=>handleChangeModel('gemini')} />
                Gemini
              </label>
              <label className="flex items-center gap-1">
                <input type="radio" name="model" value="deepseek" checked={settings.model==='deepseek'} onChange={()=>handleChangeModel('deepseek')} />
                Deepseek
              </label>
            </div>
          </div>

          {settings.model==='gemini' && (
            <div>
              <label className="font-semibold block mb-1">Gemini API Key</label>
              <input type="text" value={settings.geminiKey||''} onChange={e=>setSettings(prev=>({...prev, geminiKey:e.target.value}))} className="w-full border rounded px-3 py-2" placeholder="Masukkan API Key" />
            </div>
          )}
          {settings.model==='deepseek' && (
            <div>
              <label className="font-semibold block mb-1">Deepseek URL</label>
              <input type="text" value={settings.deepseekUrl||''} onChange={e=>setSettings(prev=>({...prev, deepseekUrl:e.target.value}))} className="w-full border rounded px-3 py-2" placeholder="http://host:11434" />
            </div>
          )}

          {testResult && <p className="text-sm">{testResult}</p>}

          <div className="flex justify-end gap-3 pt-4">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">Tutup</button>
            <button onClick={handleTest} className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50" disabled={testing}>{testing?'Menguji...':'Test koneksi'}</button>
            <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded">Simpan</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal; 