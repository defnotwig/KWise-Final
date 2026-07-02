const defaultEnv = {
  NODE_ENV: import.meta.env.MODE,
  REACT_APP_API_URL: import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL,
  REACT_APP_SERVER_URL: import.meta.env.VITE_SERVER_URL || import.meta.env.REACT_APP_SERVER_URL,
  REACT_APP_BACKEND_PORT: import.meta.env.VITE_BACKEND_PORT || import.meta.env.REACT_APP_BACKEND_PORT
};

if (!globalThis.process) {
  globalThis.process = { env: defaultEnv };
} else if (!globalThis.process.env) {
  globalThis.process.env = defaultEnv;
} else {
  globalThis.process.env = {
    ...defaultEnv,
    ...globalThis.process.env
  };
}
