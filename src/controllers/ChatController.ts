import { Request, Response } from 'express';
import Groq from "groq-sdk";

type ChatRequest = Request & {
  user?: {
    id?: string;
    role?: string;
    email?: string;
  };
};

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
  console.warn('Warning: GROQ_API_KEY is not set in environment variables. Chatbot queries will fail.');
}

const groq = new Groq({
  apiKey: apiKey || 'dummy_key',
});

export const chatHandler = async (req: ChatRequest, res: Response): Promise<void> => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ message: 'Messages array required' });
      return;
    }

    if (!process.env.GROQ_API_KEY) {
      res.status(503).json({
        message: 'Chat service unavailable: Groq API key is not configured.'
      });
      return;
    }

    const userSummary = req.user ? JSON.stringify(req.user) : 'guest';

    const systemPrompt = `You are GreenLoop Assistant for the GreenLoop platform in Bangladesh.
- Answer the user's question directly and accurately.
- Do not add unrelated details, filler, or generic project explanations.
- If the user asks about the project, be specific and concise.
- If you cannot answer, say you cannot answer.

Project context: GreenLoop is a Node/Express + Neon Postgres (Drizzle ORM) backend with React frontend, role-based auth, and an AI chatbot interface.

User context: ${userSummary}`;

    const sanitizedMessages = messages.map((message: any) => ({
      role: message.role,
      content: message.content,
    }));

    const fullMessages = [{ role: 'system', content: systemPrompt }, ...sanitizedMessages];

    try {
      const completion = await groq.chat.completions.create({
        model: "groq/compound",
        messages: fullMessages as any,
      });
      const reply = completion.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
      const reasoning_details = completion.usage;
      res.json({ reply, reasoning_details });
      return;
    } catch (innerError: any) {
      const status = innerError?.status;
      const message = innerError?.message || String(innerError);

      if (status === 429 || innerError?.name === 'APIConnectionTimeoutError' || innerError?.type === 'APIConnectionTimeoutError') {
        res.status(503).json({
          message: 'Chat service unavailable: Groq is temporarily unavailable. Please try again later.',
          error: process.env.NODE_ENV === 'development' ? message : undefined,
        });
        return;
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
