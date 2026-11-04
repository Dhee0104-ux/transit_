export const getApiUrl = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const paramApi = params.get('apiUrl') || params.get('api');
    if (paramApi) return paramApi;
  } catch (_) {}

  const endpoint = import.meta.env.VITE_API_URL || '/otp/transmodel/v3';
  try {
    // the URL constructor will throw exception if endpoint is not a valid URL,
    // e.g. if it is a relative path
    new URL(endpoint);
    return endpoint;
  } catch (_) {
    return `${window.location.origin}${endpoint}`;
  }
};
