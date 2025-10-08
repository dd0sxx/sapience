import {
  logger,
  type IAgentRuntime,
  type Project,
  type ProjectAgent,
} from "@elizaos/core";
import customActionsPlugin from "./plugin.ts";
import { character } from "./character.ts";
import { AttestationService } from "./services/attestationService.ts";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const initCharacter = async ({ runtime }: { runtime: IAgentRuntime }) => {
  logger.info("Initializing ElizaOS starter agent");
  logger.info({ name: character.name }, "Character:");
  logger.info({ plugins: character.plugins }, "Plugins:");

  // Log configuration
  const settings = runtime?.character?.settings as any;
  if (settings?.autonomousMode) {
    logger.info("Autonomous mode configuration:", {
      enabled: settings.autonomousMode.enabled,
      interval: settings.autonomousMode.interval,
      minConfidence: settings.autonomousMode.minConfidence,
      batchSize: settings.autonomousMode.batchSize,
    } as any);
  }

  // Initialize AttestationService - it will wait for Sapience plugin and auto-start if enabled
  new AttestationService(runtime);
  logger.info("🤖 AttestationService initialization started");
};

export const projectAgent: ProjectAgent = {
  character,
  init: async (runtime: IAgentRuntime) => await initCharacter({ runtime }),
  plugins: [customActionsPlugin],
};

const project: Project = {
  agents: [projectAgent],
};

export { character } from "./character.ts";

export default project;
