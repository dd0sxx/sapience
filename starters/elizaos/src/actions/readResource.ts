import { Action, IAgentRuntime, Memory, HandlerCallback, State } from '@elizaos/core';
import { SapienceService } from '../services/sapienceService.js';

export const readResourceAction: Action = {
  name: 'READ_RESOURCE',
  description: 'Read an MCP resource by URI from the Sapience server',
  similes: ['read resource', 'mcp read'],

  validate: async (runtime: IAgentRuntime) => {
    const svc = runtime.getService('sapience') as SapienceService;
    return !!svc;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: any,
    callback?: HandlerCallback
  ) => {
    const svc = runtime.getService('sapience') as SapienceService;
    if (!svc) {
      await callback?.({ text: 'Sapience service unavailable', content: {} });
      return;
    }

    const contentText = message.content?.text || '';
    const jsonMatch = contentText.match(/\{[\s\S]*\}$/);
    if (!jsonMatch) {
      await callback?.({
        text: 'Provide JSON: {"uri":"resource://..."}',
        content: {},
      });
      return;
    }
    const payload = JSON.parse(jsonMatch[0]);
    const uri = payload.uri as string;

    const res = await svc.readResource('sapience', uri);
    await callback?.({
      text: res?.content?.[0]?.text || 'OK',
      content: res,
    });
  },
};

export default readResourceAction;


