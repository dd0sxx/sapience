import { Service, type IAgentRuntime, elizaLogger } from "@elizaos/core";

type McpJsonRpcRequest = {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: Record<string, any>;
};

type McpJsonRpcResponse<T = any> = {
  jsonrpc: "2.0";
  id: number | string | null;
  result?: T;
  error?: { code: number; message: string; data?: any };
};

export type CallToolResult = {
  isError?: boolean;
  content?: Array<{ type: string; text?: string } & Record<string, any>>;
};

export class SapienceService extends Service {
  static serviceType = "sapience";
  capabilityDescription =
    "Access Sapience MCP tools and resources over HTTP transport";

  private initialized = false;
  private nextId = 1;
  private serverNameToUrl: Map<string, string> = new Map();
  private serverNameToSessionId: Map<string, string> = new Map();

  constructor(runtime?: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<Service> {
    const service = new SapienceService(runtime);
    await service.initializeFromRuntime();
    return service;
  }

  async stop(): Promise<void> {
    try {
      for (const [name, sessionId] of this.serverNameToSessionId.entries()) {
        const url = this.serverNameToUrl.get(name);
        if (!url) continue;
        await fetch(`${this.getMcpEndpoint(url)}`, {
          method: "DELETE",
          headers: { "mcp-session-id": sessionId },
        }).catch(() => {});
      }
    } catch (_e) {
      // best effort
    } finally {
      this.initialized = false;
      this.serverNameToSessionId.clear();
    }
  }

  private async initializeFromRuntime(): Promise<void> {
    if (this.initialized) return;
    try {
      const settings = (this.runtime?.character?.settings as any) || {};
      const servers: Record<string, { type?: string; url: string }> = settings
        ?.sapience?.servers || {
        sapience: { type: "http", url: "https://api.sapience.xyz" },
      };

      for (const [name, def] of Object.entries(servers)) {
        if (!def?.url) continue;
        const baseUrl = def.url.replace(/\/$/, "");
        this.serverNameToUrl.set(name, baseUrl);
      }

      // Lazily create sessions on first use
      this.initialized = true;
      elizaLogger.info("[SapienceService] Initialized endpoints", {
        servers: Array.from(this.serverNameToUrl.keys()),
      } as any);
    } catch (error) {
      elizaLogger.error("[SapienceService] Failed to initialize", error);
      throw error;
    }
  }

  private async ensureSession(serverName: string): Promise<string> {
    const existing = this.serverNameToSessionId.get(serverName);
    if (existing) return existing;

    const url = this.serverNameToUrl.get(serverName);
    if (!url)
      throw new Error(`[SapienceService] Unknown server: ${serverName}`);

    const req: McpJsonRpcRequest = {
      jsonrpc: "2.0",
      id: this.nextId++,
      method: "initialize",
      params: {
        protocolVersion: "2025-03-26",
        capabilities: {},
        clientInfo: { name: "elizaos", version: "1.0.0" },
      },
    };

    const res = await fetch(`${this.getMcpEndpoint(url)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Server requires client to accept both JSON and SSE
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `[SapienceService] Failed to initialize MCP session (${res.status}): ${text}`,
      );
    }

    const sessionId = res.headers.get("mcp-session-id");
    if (!sessionId)
      throw new Error("[SapienceService] Missing mcp-session-id header");
    this.serverNameToSessionId.set(serverName, sessionId);
    return sessionId;
  }

  private getMcpEndpoint(baseUrl: string): string {
    const normalized = baseUrl.replace(/\/$/, "");
    return normalized.endsWith("/mcp") ? normalized : `${normalized}/mcp`;
  }

  async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, any>,
  ): Promise<CallToolResult> {
    await this.initializeFromRuntime();
    const url = this.serverNameToUrl.get(serverName);
    if (!url)
      throw new Error(`[SapienceService] Unknown server: ${serverName}`);
    const sessionId = await this.ensureSession(serverName);

    const req: McpJsonRpcRequest = {
      jsonrpc: "2.0",
      id: this.nextId++,
      method: "tools/call",
      params: { name: toolName, arguments: args || {} },
    };

    const res = await fetch(`${this.getMcpEndpoint(url)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "mcp-session-id": sessionId,
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(req),
    });

    const json = (await res
      .json()
      .catch(() => ({}))) as McpJsonRpcResponse<CallToolResult>;
    if (!res.ok || json.error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: json.error?.message || `HTTP ${res.status}`,
          },
        ],
      };
    }
    return (json.result as CallToolResult) || { content: [] };
  }

  async readResource(
    serverName: string,
    uri: string,
  ): Promise<{ isError?: boolean; content?: Array<any> }> {
    await this.initializeFromRuntime();
    const url = this.serverNameToUrl.get(serverName);
    if (!url)
      throw new Error(`[SapienceService] Unknown server: ${serverName}`);
    const sessionId = await this.ensureSession(serverName);

    const req: McpJsonRpcRequest = {
      jsonrpc: "2.0",
      id: this.nextId++,
      method: "resources/read",
      params: { uri },
    };

    const res = await fetch(`${this.getMcpEndpoint(url)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "mcp-session-id": sessionId,
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify(req),
    });

    const json = (await res
      .json()
      .catch(() => ({}))) as McpJsonRpcResponse<any>;
    if (!res.ok || json.error) {
      return {
        isError: true,
        content: [
          {
            type: "text",
            text: json.error?.message || `HTTP ${res.status}`,
          },
        ],
      };
    }
    return (json.result as any) || { content: [] };
  }
}
