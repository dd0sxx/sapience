import { Service, type IAgentRuntime, elizaLogger } from "@elizaos/core";
import type { McpClient } from "@sapience/sdk";
import { loadCreateMcpClient } from "../utils/sdk.js";

export type CallToolResult = {
  isError?: boolean;
  content?: Array<{ type: string; text?: string } & Record<string, any>>;
};

export class SapienceService extends Service {
  static serviceType = "sapience";
  capabilityDescription =
    "Access Sapience MCP tools and resources over HTTP transport";

  private initialized = false;
  private serverNameToUrl: Map<string, string> = new Map();
  private clients: Map<string, McpClient> = new Map();

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
      for (const client of this.clients.values()) {
        await client.close().catch(() => {});
      }
    } finally {
      this.initialized = false;
      this.clients.clear();
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

      // Lazily create clients on first use
      this.initialized = true;
      elizaLogger.info("[SapienceService] Initialized endpoints", {
        servers: Array.from(this.serverNameToUrl.keys()),
      } as any);
    } catch (error) {
      elizaLogger.error("[SapienceService] Failed to initialize", error);
      throw error;
    }
  }

  private async ensureClient(serverName: string): Promise<McpClient> {
    const existing = this.clients.get(serverName);
    if (existing) return existing;
    const url = this.serverNameToUrl.get(serverName);
    if (!url)
      throw new Error(`[SapienceService] Unknown server: ${serverName}`);
    const createMcpClient = await loadCreateMcpClient();
    const client = createMcpClient({ baseUrl: url });
    this.clients.set(serverName, client);
    return client;
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
    const client = await this.ensureClient(serverName);
    try {
      const result = await client.callTool<CallToolResult>(
        toolName,
        args || {},
      );
      return result || { content: [] };
    } catch (e: any) {
      return { isError: true, content: [{ type: "text", text: e?.message }] };
    }
  }

  async readResource(
    serverName: string,
    uri: string,
  ): Promise<{ isError?: boolean; content?: Array<any> }> {
    await this.initializeFromRuntime();
    const url = this.serverNameToUrl.get(serverName);
    if (!url)
      throw new Error(`[SapienceService] Unknown server: ${serverName}`);
    const client = await this.ensureClient(serverName);
    try {
      const result = await client.readResource<any>(uri);
      return result || { content: [] };
    } catch (e: any) {
      return { isError: true, content: [{ type: "text", text: e?.message }] };
    }
  }
}
