import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || '';

export default function NotionSync({ dateStr, todos, schedule, onImport, canExport }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('loading'); // loading, connect, select-db, select-page, ready
  const [apiKey, setApiKey] = useState('');
  const [dbId, setDbId] = useState('');
  const [databases, setDatabases] = useState([]);
  const [pages, setPages] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [envAuto, setEnvAuto] = useState(false);

  const headers = useCallback(() => {
    const h = {};
    if (apiKey) h['X-Notion-Key'] = apiKey;
    if (dbId) h['X-Notion-DB'] = dbId;
    return h;
  }, [apiKey, dbId]);

  // 초기화: 환경변수 확인 → localStorage 확인
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API}/api/notion/env-status`);
        if (data.hasKey) {
          setEnvAuto(true);
          const saved = localStorage.getItem('notionDbId');
          if (saved) {
            setDbId(saved);
            setStep('ready');
          } else {
            setStep('select-db');
          }
          return;
        }
      } catch {}

      // localStorage 확인
      const savedKey = localStorage.getItem('notionApiKey');
      const savedDb = localStorage.getItem('notionDbId');
      if (savedKey && savedDb) {
        setApiKey(savedKey);
        setDbId(savedDb);
        setStep('ready');
      } else if (savedKey) {
        setApiKey(savedKey);
        setStep('select-db');
      } else {
        setStep('connect');
      }
    })();
  }, []);

  const handleConnect = async () => {
    if (!apiKey.trim()) return;
    setBusy(true);
    setError('');
    try {
      await axios.post(`${API}/api/notion/connect`, { apiKey: apiKey.trim() });
      localStorage.setItem('notionApiKey', apiKey.trim());
      setStep('select-db');
    } catch (err) {
      setError(err.response?.data?.error || '연결 실패');
    } finally {
      setBusy(false);
    }
  };

  const loadDatabases = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await axios.get(`${API}/api/notion/search-databases`, { headers: headers() });
      setDatabases(data.databases || []);
    } catch (err) {
      setError(err.response?.data?.error || 'DB 검색 실패');
    } finally {
      setBusy(false);
    }
  };

  const loadPages = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await axios.get(`${API}/api/notion/search-pages`, { headers: headers() });
      setPages(data.pages || []);
    } catch (err) {
      setError(err.response?.data?.error || '페이지 검색 실패');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (step === 'select-db') loadDatabases();
    if (step === 'select-page') loadPages();
  }, [step]);

  const selectDb = (id) => {
    setDbId(id);
    localStorage.setItem('notionDbId', id);
    setStep('ready');
    setMessage('Notion DB 연결 완료');
    setTimeout(() => setMessage(''), 2000);
  };

  const createDb = async (pageId) => {
    setBusy(true);
    setError('');
    try {
      const { data } = await axios.post(`${API}/api/notion/create-database`, { pageId }, { headers: headers() });
      if (data.databaseId) {
        selectDb(data.databaseId);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'DB 생성 실패');
    } finally {
      setBusy(false);
    }
  };

  const handleExport = async (mode = 'append') => {
    if (mode === 'replace' && !confirm('기존 Notion 데이터를 삭제하고 현재 데이터로 교체합니다. 계속하시겠습니까?')) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { data } = await axios.post(`${API}/api/notion/export`, {
        date: dateStr, todos, schedule, databaseId: dbId, mode,
      }, { headers: headers() });
      setMessage(data.message);
      if (data.errors?.length) {
        setError(data.errors.join(', '));
      }
    } catch (err) {
      setError(err.response?.data?.error || '내보내기 실패');
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (mode = 'append') => {
    if (mode === 'replace' && !confirm('로컬 데이터를 Notion 데이터로 교체합니다. 계속하시겠습니까?')) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { data } = await axios.post(`${API}/api/notion/import`, {
        date: dateStr, databaseId: dbId, mode,
      }, { headers: headers() });
      setMessage(data.message);
      if (onImport && data.success) {
        onImport(data);
      }
    } catch (err) {
      setError(err.response?.data?.error || '가져오기 실패');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = () => {
    localStorage.removeItem('notionApiKey');
    localStorage.removeItem('notionDbId');
    setApiKey('');
    setDbId('');
    setDatabases([]);
    setPages([]);
    setStep('connect');
    setMessage('');
    setError('');
    setEnvAuto(false);
  };

  if (step === 'loading') return null;

  return (
    <div className="section notion-sync">
      <div className="notion-header" onClick={() => setOpen(!open)}>
        <span className="section-title" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
          Notion 연동
        </span>
        <span className="notion-toggle">{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div className="notion-content">
          {error && <p className="notion-error">{error}</p>}
          {message && <p className="notion-message">{message}</p>}

          {step === 'connect' && (
            <div className="notion-form">
              <p className="notion-desc">Notion Integration API 키를 입력하세요.</p>
              <input
                className="notion-input"
                type="password"
                placeholder="ntn_xxxxx..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleConnect()}
              />
              <button className="btn btn-notion" onClick={handleConnect} disabled={busy || !apiKey.trim()}>
                {busy ? '확인중...' : '연결'}
              </button>
            </div>
          )}

          {step === 'select-db' && (
            <div className="notion-form">
              <p className="notion-desc">사용할 데이터베이스를 선택하거나 새로 만드세요.</p>
              {databases.length > 0 && (
                <div className="notion-db-list">
                  {databases.map(db => (
                    <button key={db.id} className="btn-notion-item" onClick={() => selectDb(db.id)}>
                      {db.title}
                    </button>
                  ))}
                </div>
              )}
              <button className="btn btn-notion-secondary" onClick={() => setStep('select-page')} disabled={busy}>
                새 DB 만들기
              </button>
              <button className="btn-notion-refresh" onClick={loadDatabases} disabled={busy}>
                {busy ? '검색중...' : '새로고침'}
              </button>
            </div>
          )}

          {step === 'select-page' && (
            <div className="notion-form">
              <p className="notion-desc">DB를 생성할 페이지를 선택하세요.</p>
              {pages.length > 0 ? (
                <div className="notion-db-list">
                  {pages.map(page => (
                    <button key={page.id} className="btn-notion-item" onClick={() => createDb(page.id)} disabled={busy}>
                      {page.title}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="notion-desc">페이지가 없습니다. Integration에 페이지를 공유해주세요.</p>
              )}
              <button className="btn btn-notion-secondary" onClick={() => setStep('select-db')} disabled={busy}>
                뒤로
              </button>
            </div>
          )}

          {step === 'ready' && (
            <div className="notion-actions">
              {!canExport && (
                <p className="notion-desc">모든 할일을 배정하면 내보내기가 활성화됩니다.</p>
              )}
              <div className="notion-btn-row">
                <button className="btn btn-notion" onClick={() => handleExport('append')} disabled={busy || !canExport}>
                  {busy ? '처리중...' : '내보내기'}
                </button>
                <button className="btn btn-notion" onClick={() => handleExport('replace')} disabled={busy || !canExport}>
                  {busy ? '처리중...' : '새로출력'}
                </button>
              </div>
              <div className="notion-btn-row">
                <button className="btn btn-notion-secondary" onClick={() => handleImport('append')} disabled={busy}>
                  {busy ? '처리중...' : '가져오기'}
                </button>
                <button className="btn btn-notion-secondary" onClick={() => handleImport('replace')} disabled={busy}>
                  {busy ? '처리중...' : '새로입력'}
                </button>
              </div>
              <button className="btn-notion-disconnect" onClick={disconnect}>
                {envAuto ? 'DB 변경' : '연결 해제'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
