import {
  Action,
  IAgentRuntime,
  Memory,
  HandlerCallback,
  State,
  elizaLogger,
} from "@elizaos/core";
import { AttestationService } from "../services/attestationService.js";

export const autonomousModeAction: Action = {
  name: "AUTONOMOUS_MODE",
  similes: [
    "start auto mode",
    "stop auto mode",
    "auto attest",
    "autonomous attestation",
  ],
  description: "Control autonomous attestation mode",

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || "";
    return text.includes("auto") || text.includes("autonomous");
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: any,
    callback?: HandlerCallback,
  ) => {
    try {
      const text = message.content?.text?.toLowerCase() || "";

      // Get singleton instance
      const attestationService = AttestationService.getInstance(runtime);
      if (!attestationService) {
        await callback?.({
          text: "❌ AttestationService not initialized. Please restart the agent.",
          content: {},
        });
        return;
      }

      // Handle commands
      if (text.includes("start")) {
        await attestationService.startAutonomous();
        await callback?.({
          text: `🤖 Autonomous attestation mode started!
          
• Monitoring all markets continuously
• Minimum confidence: ${(attestationService.getStatus().minConfidence * 100).toFixed(0)}%
• Check interval: ${attestationService.getStatus().interval / 1000} seconds
• Batch size: ${attestationService.getStatus().batchSize} markets per cycle

I'll analyze markets and create attestations automatically.`,
          content: {},
        });
        return;
      }

      if (text.includes("stop")) {
        await attestationService.stop();
        await callback?.({
          text: "🛑 Autonomous attestation mode stopped",
          content: {},
        });
        return;
      }

      if (text.includes("status") || text.includes("dashboard")) {
        const status = attestationService.getStatus();
        const history = attestationService.getHistory(5);

        const response = `📊 **Autonomous Mode Dashboard**

**Status:** ${status.isRunning ? "🟢 Running" : "🔴 Stopped"}
**Enabled:** ${status.enabled ? "Yes" : "No"}
**Configuration:**
• Interval: ${status.interval / 1000} seconds
• Min Confidence: ${(status.minConfidence * 100).toFixed(0)}%
• Batch Size: ${status.batchSize} markets

**Statistics:**
• Total Attestations: ${status.attestationCount}
• Last Cycle: ${status.lastCycle ? new Date(status.lastCycle).toLocaleString() : "Never"}

**Recent Attestations:**
${history.map((h) => `• Market #${h.marketId} - ${h.timestamp}`).join("\n") || "No attestations yet"}`;

        await callback?.({
          text: response,
          content: { status, history },
        });
        return;
      }

      // Default help
      await callback?.({
        text: `**Autonomous Mode Commands:**
• \`start auto mode\` - Begin autonomous attestation
• \`stop auto mode\` - Stop autonomous attestation  
• \`show dashboard\` - View current status and history`,
        content: {},
      });
      return;
    } catch (error) {
      elizaLogger.error("Error in autonomousModeAction:", error);
      await callback?.({
        text: `Error: ${error.message}`,
        content: {},
      });
      return;
    }
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: { text: "start auto mode" },
      },
      {
        name: "{{agent}}",
        content: { text: "Starting autonomous attestation mode..." },
      },
    ],
    [
      {
        name: "{{user1}}",
        content: { text: "show dashboard" },
      },
      {
        name: "{{agent}}",
        content: { text: "Here's the current autonomous mode status..." },
      },
    ],
  ],
};
