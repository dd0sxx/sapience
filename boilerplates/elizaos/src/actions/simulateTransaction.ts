import { Action, IAgentRuntime, Memory, HandlerCallback, State } from '@elizaos/core';
import { createPublicClient, http, decodeErrorResult } from 'viem';

export const simulateTransactionAction: Action = {
  name: 'SIMULATE_TRANSACTION',
  description: 'Simulate an EVM transaction against a public RPC (read-only)',
  similes: ['simulate tx', 'dry run transaction'],

  validate: async () => true,

  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: any,
    callback?: HandlerCallback
  ) => {
    try {
      const text = message.content?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}$/);
      if (!jsonMatch) {
        await callback?.({
          text: 'Provide JSON: {"rpc":"https://...","chainId":42161,"tx":{"to":"0x...","data":"0x...","value":"0x0"}}',
          content: {},
        });
        return;
      }
      const payload = JSON.parse(jsonMatch[0]);
      const rpc = payload.rpc as string;
      const chainId = payload.chainId as number;
      const tx = payload.tx as { to: `0x${string}`; data?: `0x${string}`; value?: string };

      const client = createPublicClient({ transport: http(rpc) });
      const result = await client.call({
        to: tx.to,
        data: tx.data,
        value: tx.value ? BigInt(tx.value) : undefined,
      } as any);

      await callback?.({ text: 'Simulation OK', content: { result, chainId } });
    } catch (err: any) {
      try {
        const decoded = err?.data ? decodeErrorResult(err.data) : undefined;
        await callback?.({ text: 'Simulation failed', content: { error: err?.message, decoded } });
      } catch (_e) {
        await callback?.({ text: 'Simulation failed', content: { error: err?.message } });
      }
    }
  },
};

export default simulateTransactionAction;


