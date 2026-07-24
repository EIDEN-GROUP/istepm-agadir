import OpenAI from "openai";
import { getEnv } from "@/config/env";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const env = getEnv();
    client = new OpenAI({
      baseURL: env.AI_BASE_URL || "https://integrate.api.nvidia.com/v1",
      apiKey: env.AI_API_KEY,
    });
  }
  return client;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ProposedAction {
  toolCallId: string;
  actionName: string;
  params: Record<string, unknown>;
  reasoning: string;
}

export interface AnalyzeResult {
  reasoning: string;
  proposedActions: ProposedAction[];
}

export async function analyzeIntent(
  messages: ChatMessage[],
  toolDefinitions: ReturnType<typeof import("./actions").getToolDefinitions>,
): Promise<AnalyzeResult> {
  const env = getEnv();
  const openai = getClient();

  const systemPrompt = `Tu es un assistant IA spécialisé dans la gestion scolaire (ISTPM). Tu aides les administrateurs à gérer les étudiants, formateurs, examens, bulletins, stages, paiements, séances et autres entités du système.

Règles importantes :
1. Réponds TOUJOURS en français.
2. Analyse la demande de l'utilisateur et sélectionne les actions appropriées.
3. Pour les actions de LECTURE (GET), tu peux les exécuter directement sans confirmation.
4. Pour les actions d'ÉCRITURE (POST, PUT, DELETE), tu dois proposer l'action mais demander confirmation avant d'exécuter.
5. Si l'utilisateur demande une action qui nécessite plus d'informations, pose des questions précises.
6. Pour les recherches, utilise les filtres appropriés (filiere, niveau, statut, etc.).
7. Sois précis dans les paramètres - utilise les bons noms de champs.
8. Explique ton raisonnement de façon claire et concise.

Format de réponse : Explique ce que tu proposes de faire, puis pour chaque action, fournis les paramètres nécessaires.`;

  const apiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  const response = await openai.chat.completions.create({
    model: env.AI_MODEL || "nvidia/qwen-qwen3.5-397b-a17b",
    messages: apiMessages,
    tools: toolDefinitions as OpenAI.Chat.ChatCompletionTool[],
    tool_choice: "auto",
    temperature: 0.1,
    max_tokens: 4096,
  });

  const choice = response.choices[0];
  const assistantContent = choice.message.content || "";
  const toolCalls = choice.message.tool_calls || [];

  const reasoning = assistantContent;
  const proposedActions: ProposedAction[] = [];
  for (const tc of toolCalls) {
    if (tc.type === "function") {
      proposedActions.push({
        toolCallId: tc.id,
        actionName: tc.function.name,
        params: JSON.parse(tc.function.arguments),
        reasoning: `Action proposée: ${tc.function.name}`,
      });
    }
  }

  return { reasoning, proposedActions };
}
