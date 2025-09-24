const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5174';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status} ${res.statusText}: ${text}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return null;
}

export const api = {
  // Chickens
  listChickens: () => request('/chickens'),
  addChicken: (data) => request('/chickens', { method: 'POST', body: JSON.stringify(data) }),
  updateChicken: (id, data) => request(`/chickens/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteChicken: (id) => request(`/chickens/${id}`, { method: 'DELETE' }),

  // Feed logs
  listFeedLogs: (chickenId) => request(`/chickens/${chickenId}/feed-logs`),
  addFeedLog: (chickenId, data) => request(`/chickens/${chickenId}/feed-logs`, { method: 'POST', body: JSON.stringify(data) }),
  updateFeedLog: (chickenId, logId, data) => request(`/chickens/${chickenId}/feed-logs/${logId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteFeedLog: (chickenId, logId) => request(`/chickens/${chickenId}/feed-logs/${logId}`, { method: 'DELETE' }),

  // Tags
  getAllTags: () => request('/tags'),
};
