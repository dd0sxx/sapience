import {
  Action,
  IAgentRuntime,
  Memory,
  HandlerCallback,
  State,
} from "@elizaos/core";
import { SapienceService } from "../services/sapienceService.js";

export const callToolAction: Action = {
  name: "CALL_TOOL",
  description: "Call an MCP tool on the Sapience server",
  similes: ["call tool", "mcp call"],

  validate: async (runtime: IAgentRuntime, _message: Memory) => {
    const svc = runtime.getService("sapience") as SapienceService;
    return !!svc;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: any,
    callback?: HandlerCallback,
  ) => {
    const svc = runtime.getService("sapience") as SapienceService;
    if (!svc) {
      await callback?.({ text: "Sapience service unavailable", content: {} });
      return;
    }

    const contentText = message.content?.text || "";
    // Expect a JSON payload after the action name
    const jsonMatch = contentText.match(/\{[\s\S]*\}$/);
    if (!jsonMatch) {
      await callback?.({
        text: 'Provide JSON: {"tool":"list_active_markets","args":{}}',
        content: {},
      });
      return;
    }
    const payload = JSON.parse(jsonMatch[0]);
    const tool = payload.tool as string;
    const args = (payload.args as Record<string, any>) || {};

    const res = await svc.callTool("sapience", tool, args);
    await callback?.({
      text: res?.content?.[0]?.text || "OK",
      content: res,
    });
  },
};

export default callToolAction;
