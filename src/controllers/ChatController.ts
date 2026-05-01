import { Request, Response } from 'express';
import OpenAI from 'openai';

type ChatRequest = Request & {
  user?: {
    id?: string;
    role?: string;
    email?: string;
  };
};

const apiKey = process.env.OPENROUTER_API;
const model = process.env.OPENROUTER_MODEL || 'minimax/minimax-m2.5:free';

if (!apiKey) {
  throw new Error('Missing OpenRouter API key. Set OPENROUTER_API in .env');
}

const openai = new OpenAI({
  apiKey,
  baseURL: 'https://openrouter.ai/api/v1',
});

const requestChatCompletion = async (client: OpenAI, modelName: string, messages: any[]) => {
  return client.chat.completions.create({
    model: modelName,
    messages,
    max_tokens: 400,
    temperature: 0.2,
  });
};

export const chatHandler = async (req: ChatRequest, res: Response) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Messages array required' });
    }

    const userSummary = req.user ? JSON.stringify(req.user) : 'guest';

    const systemPrompt = `You are GreenLoop Assistant for the GreenLoop platform in Bangladesh.
- Answer the user's question directly and accurately.
- Do not add unrelated details, filler, or generic project explanations.
- If the user asks about the project, be specific and concise.
- If you cannot answer, say you cannot answer.

Project context: GreenLoop is a Node/Express + MongoDB backend with React frontend, role-based auth, and an AI chatbot interface.

User context: ${userSummary}`;

    const sanitizedMessages = messages.map((message: any) => ({
      role: message.role,
      content: message.content,
    }));

    const fullMessages = [{ role: 'system', content: systemPrompt }, ...sanitizedMessages];

    try {
      const completion = await requestChatCompletion(openai, model, fullMessages);
      const reply = completion.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
      const reasoning_details = completion.usage;
      return res.json({ reply, reasoning_details });
    } catch (innerError: any) {
      const status = innerError?.status;
      const message = innerError?.message || String(innerError);

      if (status === 429 || innerError?.name === 'APIConnectionTimeoutError' || innerError?.type === 'APIConnectionTimeoutError') {
        return res.status(503).json({
          message: 'Chat service unavailable: OpenRouter is temporarily unavailable. Please try again later.',
          error: process.env.NODE_ENV === 'development' ? message : undefined,
        });
      }

      throw innerError;
    }
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({
      message: 'Chat service unavailable',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

