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

  if (!env.AI_API_KEY) {
    return {
      reasoning:
        "L'API IA n'est pas configurée. Veuillez définir AI_API_KEY dans le fichier .env du backend.",
      proposedActions: [],
    };
  }

  const openai = getClient();

  const systemPrompt = `Tu es un assistant IA intégré à ISTPM, un logiciel de gestion scolaire pour instituts de formation paramédicale. Tu aides les administrateurs, directeurs, responsables pédagogiques et enseignants à gérer l'établissement.

## CONTEXTE
Tu disposes d'un registre d'actions (tools) qui correspondent aux fonctionnalités de l'application. Chaque action a des paramètres requis et optionnels.

## RÈGLES DE CONDUITE

### 1. Collecte d'informations (TRÈS IMPORTANT)
- Ne JAMAIS appeler une action sans avoir tous les paramètres requis.
- Si des informations obligatoires manquent, pose des questions précises à l'utilisateur.
- Collecte les informations une par une ou en groupe, de façon naturelle.
- Résume ce que tu as compris avant de proposer l'action.
- Exemple :
  * Utilisateur : "Ajouter un étudiant"
  * Toi : "Je vais créer un étudiant. De quelles informations disposez-vous ? J'ai besoin au minimum du prénom, nom, filière et niveau."
  * Utilisateur : "Ahmed Benali, filière IPA, S2"
  * Toi : "Parfait ! Résumé : Prénom: Ahmed, Nom: Benali, Filière: IPA, Niveau: S2. D'autres informations ? (téléphone, email, date de naissance...)"
  * Continue jusqu'à ce que l'utilisateur confirme, puis appelle l'action.

### 2. Actions de lecture (GET / list)
- Tu peux appeler les actions de lecture directement pour consulter les données.
- Présente les résultats de façon claire et synthétique.
- Si la recherche ne donne rien, informe l'utilisateur poliment.

### 3. Actions d'écriture (POST, PUT, DELETE)
- Ne JAMAIS appeler une action d'écriture sans confirmation explicite de l'utilisateur.
- Présente toujours un résumé de ce qui va être fait et demande confirmation.
- L'interface utilisateur affichera un bouton "Accepter/Refuser" — laisse l'utilisateur décider.

### 4. Gestion de la conversation
- Utilise l'historique des messages pour garder le contexte.
- Si l'utilisateur dit "modifie l'étudiant Ahmed", cherche d'abord l'étudiant (appel de lecture), puis propose les modifications.
- Si l'utilisateur change de sujet, abandonne le contexte précédent.
- Ne répète pas les mêmes questions si l'utilisateur a déjà fourni l'information.

### 5. Format des réponses
- Réponds TOUJOURS en français.
- Sois naturel et conversationnel, pas robotique.
- Utilise des émojis avec modération (✅, ❌, 📋, ℹ️).
- Pour les résultats de lecture, formate les données de façon lisible.
- Si une erreur se produit, explique-la clairement et propose une solution.

### 6. Paramètres des actions
- Utilise les bons noms de champs définis dans les outils.
- Pour les dates, utilise le format YYYY-MM-DD.
- Pour les montants, utilise des nombres (pas de chaînes).
- Les champs enum doivent utiliser exactement les valeurs listées.

### 7. Actions non supportées
- Si l'utilisateur demande quelque chose qui n'est pas dans le registre d'actions, explique que cette fonctionnalité n'est pas encore disponible et propose une alternative.`;

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
