import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;
let lastUsedKey: string | null = null;

function getAIInstance(): GoogleGenAI {
  const currentKey = getResolvedApiKey();
  if (!aiInstance || currentKey !== lastUsedKey) {
    aiInstance = new GoogleGenAI({ apiKey: currentKey });
    lastUsedKey = currentKey;
  }
  return aiInstance;
}

function getResolvedApiKey(): string {
  if (typeof window === 'undefined') return "";

  // 1. Try localStorage (manual override/cache)
  const manualKey = localStorage.getItem('STAKEWISE_CUSTOM_GEMINI_KEY');
  if (manualKey && manualKey.trim().length > 20) return manualKey.trim();
  
  // 2. Check for dynamic platform injection (window globals)
  const win = window as any;
  if (win.GEMINI_API_KEY && win.GEMINI_API_KEY.length > 10) return win.GEMINI_API_KEY;
  if (win.API_KEY && win.API_KEY.length > 10) return win.API_KEY;

  // 3. Check for process.env (mapped at build time or provided by runtime shim)
  const getEnv = (name: string) => {
    try {
      // Use globalThis to bypass Vite's static "process.env" replacement
      const g = globalThis as any;
      if (g.process?.env && g.process.env[name]) return g.process.env[name];
      // Fallback to the standard reference which might be defined at build-time
      return (process.env as any)[name];
    } catch { return undefined; }
  };

  const geminiKey = getEnv('GEMINI_API_KEY');
  const platformKey = getEnv('API_KEY');

  const isValid = (k: any) => k && typeof k === 'string' && k.length > 10 && !k.includes('process.env') && !k.includes('MY_GEMINI_API_KEY');

  if (isValid(geminiKey)) return geminiKey;
  if (isValid(platformKey)) return platformKey;
  
  // 4. Vite Environment Variables
  const viteKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (isValid(viteKey)) return viteKey;

  return "";
}

export async function hasApiKeySelected(): Promise<boolean> {
  const key = getResolvedApiKey();
  if (key !== "") return true;

  // Check the platform helper if available
  if (typeof window !== 'undefined' && (window as any).aistudio?.hasSelectedApiKey) {
    return await (window as any).aistudio.hasSelectedApiKey();
  }
  return false;
}

export async function openApiKeySelector() {
  if (typeof window !== 'undefined' && (window as any).aistudio?.openSelectKey) {
    await (window as any).aistudio.openSelectKey();
    // After selection, the page should ideally have the key in process.env.API_KEY on next reload
    // or sometimes it's available immediately via a proxy. 
    // We force a check by refreshing the instance.
    aiInstance = null; 
  }
}

export interface ExtractedBet {
  sport: string;
  league?: string;
  event: string;
  market: string; // Combined market and selection
  selection: string; // Keep for legacy compatibility but AI should put info in market
  odds: number;
  stake: number;
  date?: string; // ISO format or descriptive
  isLive?: boolean;
  betId?: string;
  bookmaker?: string;
  status?: 'pending' | 'won' | 'lost' | 'void' | 'cashout' | 'half_win' | 'half_loss';
  cashoutValue?: number;
}

export interface BetOutcome {
  status: 'won' | 'lost' | 'void' | 'pending';
  reason: string;
}

export interface AIInsight {
  title: string;
  content: string;
  type: 'positive' | 'negative' | 'neutral';
}

export async function checkBetResult(
    event: string, 
    market: string, 
    selection: string, 
    date: string
): Promise<BetOutcome> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `Consulte os resultados reais na internet para determinar o status desta aposta.
  Evento: ${event}
  Data prevista: ${date}
  Mercado: ${market}
  Seleção: ${selection}

  Instruções:
  1. Use a pesquisa do Google para encontrar o placar, estatísticas detalhadas e súmula do jogo.
  2. Esta IA deve ser capaz de validar mercados complexos como:
     - Cartões (Amarelos/Vermelhos, para jogadores específicos ou times).
     - Escanteios (Cantos totais, por tempo ou para um time específico).
     - Faltas e finalizações (Estatísticas de performance de jogadores).
     - Resultados por tempo (1º Tempo / 2º Tempo).
  3. Determine se a aposta foi 'won' (vencida), 'lost' (perdida) ou 'void' (anulada/reembolsada).
  4. Se o evento ainda não terminou ou os dados estatísticos específicos (ex: número exato de cantos) não forem encontrados de forma clara, retorne 'pending'.
  5. Seja extremamente rigoroso. Se não tiver certeza absoluta baseada nos dados da internet, retorne 'pending'.

  Responda obrigatoriamente em JSON.`;

  const response = await getAIInstance().models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { 
            type: Type.STRING, 
            enum: ['won', 'lost', 'void', 'pending'],
            description: "O status final da aposta após verificar o resultado real."
          },
          reason: { 
            type: Type.STRING, 
            description: "Breve explicação do porquê desse status (ex: 'Real Madrid venceu por 2-1')" 
          }
        },
        required: ["status", "reason"],
      },
    },
  });

  try {
    return JSON.parse(response.text || "{}") as BetOutcome;
  } catch (error) {
    console.error("Erro ao verificar resultado com Gemini:", error);
    return { status: 'pending', reason: "Erro ao processar resposta da IA" };
  }
}

export async function extractBetFromImage(base64Image: string, mimeType: string = "image/png"): Promise<ExtractedBet> {
  const apiKey = getResolvedApiKey();
  if (!apiKey || apiKey === "") {
    throw new Error("API Key v1.4.1 não detectada. Por favor, utilize a 'Entrada Manual' na aba Configurações.");
  }

  const model = "gemini-3-flash-preview";
  
  const currentYear = new Date().getFullYear();
  const todayISO = new Date().toISOString().split('T')[0];
  const prompt = `Analise este print de aposta esportiva e extraia minuciosamente todos os dados disponíveis. 
  
  DADOS REQUERIDOS:
  1. Esporte: (ex: Futebol, Basquete)
  2. Competição/Liga: (ex: Premier League, NBA)
  3. Evento: (ex: Real Madrid x Barcelona)
  4. Mercado e Seleção (UNIFICADOS): Combine o mercado e a escolha específica em um único campo chamado 'market'. 
     Exemplo: Se o mercado é 'Ambas Marcam' e a seleção é 'Sim', retorne 'Ambas Marcam: Sim'.
     Exemplo: Se é 'Resultado Final' e a seleção é 'Real Madrid', retorne 'Vencedor: Real Madrid'.
     IMPORTANTE: Coloque todos os detalhes técnicos da aposta (linhas de handicap, over/under, etc) neste campo 'market'.
  5. Odds: O valor da cotação
  6. Stake: O valor apostado (em números)
  7. ID da Aposta: Referência ou ID da transação
  8. Casa de Aposta: Identifique a marca (ex: Bet365, Betano)
  
  STATUS E RESULTADO (LEITURA REFINADA E EXTREMA PRECISÃO):
  Verifique minuciosamente se a aposta já foi FINALIZADA/RESOLVIDA. Não ignore nenhum detalhe visual.
  
  PROCEDIMENTO DE ANALISE:
  1. CORES: 
     - VERDE/AZUL ESCURO: Geralmente indica 'won' (Vencida).
     - VERMELHO/ROSA/LARANJA ESCURO: Geralmente indica 'lost' (Perdida).
     - CINZA/AMARELO: Pode ser 'pending' (Pendente) ou 'void' (Anulada).
  2. ÍCONES: 
     - Check/Visto (✓): Indica acerto ('won').
     - X: Indica erro ('lost').
     - Moeda/Saco de Dinheiro: Indica 'cashout'.
     - Seta de retorno: Indica 'void' (Anulada).
  3. TERMOS CHAVE:
     - 'WON', 'GANHA', 'VENCIDA', 'PAGA', 'SETTLED', 'SUCCESSFUL': Status 'won'.
     - 'LOST', 'PERDIDA', 'ERROU', 'UNSUCCESSFUL': Status 'lost'.
     - 'VOID', 'ANULADA', 'REEMBOLSADA', 'CANCELADA', 'RETURNED': Status 'void'.
     - 'HALF WON', 'GANHA METADE', 'MEIO GREEN': Status 'half_win'.
     - 'HALF LOST', 'PERDIDA METADE', 'MEIO RED': Status 'half_loss'.
     - 'CASHOUT', 'ENCERRADA', 'PAGO ANTECIPADO': Status 'cashout'.
     - 'PENDING', 'EM ABERTO', 'ATIVA', 'LIVE', 'AO VIVO', 'AGUARDANDO': Status 'pending'.
  
  Categorize o 'status' RIGOROSAMENTE como um destes:
  - 'won', 'lost', 'void', 'half_win', 'half_loss', 'cashout', 'pending'.
  
  DATA E HORÁRIO DO EVENTO:
  1. Identifique a DATA e o HORÁRIO exatos do evento no print. 
  2. Se faltar o ano, use ${currentYear}. 
  3. Formate OBRIGATORIAMENTE em ISO 8601 (YYYY-MM-DDTHH:mm:ss). 
  4. Se houver apenas o horário, assuma a data de hoje (${todayISO}).
  5. Identifique se é uma "Entrada Ao Vivo" (isLive). Se o print mostrar o evento em andamento, o tempo de jogo, ou se não houver um horário futuro claro, defina isLive como true.
  
  REGRAS DE EXTRAÇÃO:
  - Seja extremamente fiel ao que está escrito.
  - Se não houver clareza sobre o resultado, prefira 'pending' para não induzir o usuário ao erro.
  
  Responda obrigatoriamente no formato JSON estruturado seguindo o schema.`;

  const maxRetries = 3;
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await getAIInstance().models.generateContent({
        model,
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image.split(",")[1] || base64Image,
              },
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sport: { type: Type.STRING, description: "Esporte" },
              league: { type: Type.STRING, description: "Liga" },
              event: { type: Type.STRING, description: "Nome do evento" },
              market: { type: Type.STRING, description: "Mercado e Seleção unificados (ex: Ambas Marcam: Sim)" },
              selection: { type: Type.STRING, description: "Repita o valor do market aqui" },
              odds: { type: Type.NUMBER, description: "Valor da odd" },
              stake: { type: Type.NUMBER, description: "Valor do investimento" },
              date: { type: Type.STRING, description: "Data ISO 8601" },
              isLive: { type: Type.BOOLEAN, description: "Entrada ao vivo" },
              betId: { type: Type.STRING, description: "ID da aposta" },
              bookmaker: { type: Type.STRING, description: "Casa de aposta" },
              status: { 
                type: Type.STRING, 
                enum: ['pending', 'won', 'lost', 'void', 'cashout', 'half_win', 'half_loss'],
                description: "Status atual da aposta detectado no print"
              },
              cashoutValue: { type: Type.NUMBER, description: "Valor recebido em caso de cashout" },
            },
            required: ["sport", "event", "market", "selection", "odds", "stake", "isLive", "status"],
          },
        },
      });

      const data = JSON.parse(response.text || "{}");
      return data as ExtractedBet;
    } catch (error: any) {
      lastError = error;
      const errorMsg = error.message || "";
      const isQuotaError = errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("limit");
      const isInternalError = errorMsg.includes("500") || errorMsg.includes("Internal error");
      const isAuthError = errorMsg.includes("403") || errorMsg.includes("API_KEY") || errorMsg.includes("PERMISSION_DENIED") || errorMsg.includes("400");
      
      console.warn(`Tentativa ${attempt + 1}/${maxRetries + 1} de extração falhou:`, errorMsg);
      
      if (isQuotaError && attempt === maxRetries) {
        throw new Error("Limite de requisições excedido. Se você usa uma chave gratuita, aguarde 60 segundos antes de tentar novamente ou verifique se sua chave tem créditos.");
      }

      if (isAuthError && attempt === maxRetries) {
        throw new Error(`Erro de chave de IA: O sistema de compartilhamento precisa ser re-validado. Tente abrir o link novamente.`);
      }

      if (attempt < maxRetries) {
        const waitTime = (isQuotaError || isInternalError) ? 3000 * (attempt + 1) : 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  console.error("Erro ao processar imagem após retentativas:", lastError);
  throw new Error(`Servidor de IA instável (${lastError?.message?.substring(0, 30)}).`);
}

export async function getAIInsights(bets: any[]): Promise<AIInsight[]> {
  const model = "gemini-3-flash-preview"; 
  
  const betsSummary = bets.map(b => ({
    sport: b.sport,
    market: b.market,
    odds: b.odds,
    stake: b.stake,
    status: b.status,
    profit: b.profit,
    date: b.date
  }));

  const prompt = `Você é um analista especialista em apostas esportivas. Analise o histórico de apostas do usuário e forneça 3 insights valiosos para melhorar sua rentabilidade.
  Foque em padrões de Win Rate por Odds, mercados mais lucrativos, impacto de acumuladas (se houver) e gestão de banca.
  
  Dados do Usuário:
  ${JSON.stringify(betsSummary)}

  Instruções:
  - Seja direto e técnico (ex: "Você tem 80% de win rate em Odds entre 1.5 e 1.8").
  - Identifique vazamentos de dinheiro (ex: "Perde dinheiro em acumuladas").
  - Forneça recomendações práticas.
  - Responda em Português.
  - Formato JSON obrigatório.`;

  const response = await getAIInstance().models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          insights: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['positive', 'negative', 'neutral'] }
              },
              required: ["title", "content", "type"]
            }
          }
        },
        required: ["insights"]
      }
    }
  });

  try {
    const result = JSON.parse(response.text || '{"insights": []}');
    return result.insights;
  } catch (error) {
    console.error("Erro ao gerar insights:", error);
    return [];
  }
}
