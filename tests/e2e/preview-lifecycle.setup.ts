import { preview } from 'vite';

// Run Vite in the runner process: no npm/cmd descendants to taskkill on Windows.
export default async function setup() {
  const server = await preview({
    preview: { host: '127.0.0.1', port: 4187, strictPort: true },
  });
  return async () => {
    // Vite's type also permits HTTP/2; the HTTP/1-only helpers need narrowing.
    if ('closeIdleConnections' in server.httpServer) server.httpServer.closeIdleConnections();
    const closed = new Promise<void>((resolve, reject) => {
      server.httpServer.close(error => error ? reject(error) : resolve());
    });
    if ('closeAllConnections' in server.httpServer) server.httpServer.closeAllConnections();
    await closed;
  };
}
