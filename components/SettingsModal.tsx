import React, { useState } from 'react';

interface Settings {
  model: 'gemini' | 'deepseek';
  githubActions?: {
    enabled: boolean;
    autoDeploy: boolean;
    testOnPush: boolean;
  };
}

interface Props {
  show: boolean;
  initial: Settings;
  onSave: (settings: Settings) => void;
  onClose: () => void;
  onTest: (settings: Settings) => Promise<boolean>;
}

const SettingsModal: React.FC<Props> = ({ show, initial, onSave, onClose, onTest }) => {
  const [settings, setSettings] = useState<Settings>({
    ...initial,
    githubActions: initial.githubActions || {
      enabled: false,
      autoDeploy: false,
      testOnPush: true,
    }
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ai' | 'github'>('ai');

  if (!show) return null;

  const handleChangeModel = (model: 'gemini' | 'deepseek') => {
    setSettings(prev => ({ ...prev, model }));
  };

  const handleGitHubActionsChange = (key: keyof Settings['githubActions'], value: boolean) => {
    setSettings(prev => ({
      ...prev,
      githubActions: {
        ...prev.githubActions!,
        [key]: value
      }
    }));
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
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-lg font-bold mb-4">Pengaturan</h2>
        
        {/* Tab Navigation */}
        <div className="flex border-b mb-4">
          <button
            onClick={() => setActiveTab('ai')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'ai' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            AI Configuration
          </button>
          <button
            onClick={() => setActiveTab('github')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'github' 
                ? 'border-b-2 border-blue-500 text-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            GitHub Actions
          </button>
        </div>

        <div className="space-y-4">
          {/* AI Configuration Tab */}
          {activeTab === 'ai' && (
            <>
              <div>
                <label className="font-semibold block mb-2">Pilih Model AI</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1">
                    <input 
                      type="radio" 
                      name="model" 
                      value="gemini" 
                      checked={settings.model === 'gemini'} 
                      onChange={() => handleChangeModel('gemini')} 
                    />
                    <span className="ml-2">Gemini AI</span>
                  </label>
                  <label className="flex items-center gap-1">
                    <input 
                      type="radio" 
                      name="model" 
                      value="deepseek" 
                      checked={settings.model === 'deepseek'} 
                      onChange={() => handleChangeModel('deepseek')} 
                    />
                    <span className="ml-2">Deepseek AI</span>
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Info:</strong> Konfigurasi API key dan URL telah diatur secara internal untuk keamanan.
                </p>
              </div>

              {testResult && (
                <div className={`p-3 rounded-lg ${testResult.includes('Berhasil') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  <p className="text-sm">{testResult}</p>
                </div>
              )}
            </>
          )}

          {/* GitHub Actions Tab */}
          {activeTab === 'github' && (
            <>
              <div className="bg-yellow-50 p-3 rounded-lg mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>GitHub Actions:</strong> Otomatisasi CI/CD untuk deployment aplikasi.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={settings.githubActions?.enabled} 
                    onChange={(e) => handleGitHubActionsChange('enabled', e.target.checked)}
                    className="rounded"
                  />
                  <span className="font-medium">Aktifkan GitHub Actions</span>
                </label>

                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={settings.githubActions?.autoDeploy} 
                    onChange={(e) => handleGitHubActionsChange('autoDeploy', e.target.checked)}
                    disabled={!settings.githubActions?.enabled}
                    className="rounded"
                  />
                  <span className="font-medium">Auto Deploy ke Production</span>
                </label>

                <label className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={settings.githubActions?.testOnPush} 
                    onChange={(e) => handleGitHubActionsChange('testOnPush', e.target.checked)}
                    disabled={!settings.githubActions?.enabled}
                    className="rounded"
                  />
                  <span className="font-medium">Run Tests pada setiap Push</span>
                </label>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600">
                  <strong>Status:</strong> {settings.githubActions?.enabled ? 'Aktif' : 'Nonaktif'}
                  {settings.githubActions?.enabled && (
                    <>
                      <br />
                      • Auto Deploy: {settings.githubActions?.autoDeploy ? 'Ya' : 'Tidak'}
                      <br />
                      • Test on Push: {settings.githubActions?.testOnPush ? 'Ya' : 'Tidak'}
                    </>
                  )}
                </p>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
              Tutup
            </button>
            {activeTab === 'ai' && (
              <button 
                onClick={handleTest} 
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50" 
                disabled={testing}
              >
                {testing ? 'Menguji...' : 'Test Koneksi'}
              </button>
            )}
            <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded">
              Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal; 