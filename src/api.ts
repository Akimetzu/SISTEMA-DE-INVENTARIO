let activeToken: string | null = null;
let clientIp: string | null = null;

// Attempt to fetch public IP on app startup with a timeout trigger
try {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);
  
  fetch('https://api.ipify.org?format=json', { signal: controller.signal })
    .then(r => r.json())
    .then(data => {
      clearTimeout(timeoutId);
      if (data && data.ip) {
        clientIp = data.ip;
        try {
          localStorage.setItem('cached_client_ip', data.ip);
        } catch (err) {}
      }
    })
    .catch(() => {
      clearTimeout(timeoutId);
      try {
        clientIp = localStorage.getItem('cached_client_ip');
      } catch (err) {}
    });
} catch (e) {}

export const setAuthToken = (token: string | null) => {
  activeToken = token;
};

export const getAuthToken = () => {
  return activeToken;
};

export const API_URL = '/api';

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const token = activeToken;
  const ip = clientIp || (() => {
    try {
      return localStorage.getItem('cached_client_ip');
    } catch (e) {
      return null;
    }
  })();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(ip ? { 'X-Client-IP': ip } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
  }

  return response.json();
};
