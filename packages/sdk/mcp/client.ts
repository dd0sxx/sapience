export type JsonRpcRequest = {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, any>;
};

export type JsonRpcResponse<T = any> = {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: T;
  error?: { code: number; message: string; data?: any };
};

export type McpClient = {
  callTool<T = unknown>(name: string, args?: Record<string, any>): Promise<T>;
  readResource<T = unknown>(uri: string): Promise<T>;
  close(): Promise<void>;
};

export function createMcpClient(opts: {
  baseUrl: string;
  fetchImpl?: (input: any, init?: any) => Promise<Response>;
  headers?: Record<string, string>;
}): McpClient {
  const fetchFn = opts.fetchImpl ?? (globalThis.fetch as any);
  const baseUrl = opts.baseUrl.replace(/\/$/, '');
  const defaultHeaders = opts.headers ?? {};

  let nextId = 1;
  let sessionId: string | null = null;

  function getMcpEndpoint(): string {
    const normalized = baseUrl.replace(/\/$/, '');
    return normalized.endsWith('/mcp') ? normalized : `${normalized}/mcp`;
  }

  async function ensureSession(): Promise<string> {
    if (sessionId) return sessionId;

    const req: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: nextId++,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: '@sapience/sdk', version: '0.1.0' },
      },
    };

    const res = await fetchFn(`${getMcpEndpoint()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        ...defaultHeaders,
      },
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`MCP initialize failed (${res.status}): ${text}`);
    }

    const sid = res.headers.get('mcp-session-id');
    if (!sid) throw new Error('MCP initialize missing mcp-session-id');
    sessionId = sid;
    return sid;
  }

  return {
    async callTool<T = unknown>(name: string, args?: Record<string, any>): Promise<T> {
      await ensureSession();
      const req: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: nextId++,
        method: 'tools/call',
        params: { name, arguments: args || {} },
      };

      const res = await fetchFn(`${getMcpEndpoint()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'mcp-session-id': sessionId as string,
          ...defaultHeaders,
        },
        body: JSON.stringify(req),
      });

      const json = (await res.json().catch(() => ({}))) as JsonRpcResponse<T>;
      if (!res.ok || json.error) {
        const message = json.error?.message || `HTTP ${res.status}`;
        throw new Error(`MCP tool error: ${message}`);
      }
      return (json.result as T) ?? (undefined as any);
    },

    async readResource<T = unknown>(uri: string): Promise<T> {
      await ensureSession();
      const req: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: nextId++,
        method: 'resources/read',
        params: { uri },
      };

      const res = await fetchFn(`${getMcpEndpoint()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
          'mcp-session-id': sessionId as string,
          ...defaultHeaders,
        },
        body: JSON.stringify(req),
      });

      const json = (await res.json().catch(() => ({}))) as JsonRpcResponse<T>;
      if (!res.ok || json.error) {
        const message = json.error?.message || `HTTP ${res.status}`;
        throw new Error(`MCP resource error: ${message}`);
      }
      return (json.result as T) ?? (undefined as any);
    },

    async close(): Promise<void> {
      try {
        const sid = sessionId;
        if (!sid) return;
        await fetchFn(`${getMcpEndpoint()}`, {
          method: 'DELETE',
          headers: { 'mcp-session-id': sid, ...defaultHeaders },
        }).catch(() => {});
      } finally {
        sessionId = null;
      }
    },
  };
}


