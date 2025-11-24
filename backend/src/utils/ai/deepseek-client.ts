/**
 * DeepSeek API client for generating AI responses
 */
export class DeepSeekClient {
  private apiKey: string;
  private baseUrl = "https://api.deepseek.com/v1";

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || "";
    if (!this.apiKey) {
      console.error("DeepSeek API key is not set");
    }
  }

  /**
   * Generate text using DeepSeek API
   */
  /**
   * Generate text using DeepSeek API
   */
  async generateText(
    prompt: string,
    options: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
    } = {}
  ): Promise<string> {
    // Early exit if API key is missing.
    if (!this.apiKey) {
      throw new Error("DeepSeek API key is not set");
    }

    const {
      model = "deepseek-chat",
      temperature = 0.7,
      max_tokens = 1000,
      top_p = 0.95,
    } = options;

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature,
          max_tokens,
          top_p,
        }),
      });

      if (!response.ok) {
        let errorBody;
        try {
          errorBody = await response.json();
        } catch (jsonError) {
          errorBody = await response.text();
        }
        throw new Error(
          `DeepSeek API error: ${
            (errorBody && (errorBody.message || errorBody)) ||
            response.statusText
          }`
        );
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Error generating text with DeepSeek:", error);
      throw error;
    }
  }

  /**
   * Generate FAQ content based on a topic
   */
  async generateFAQ(topic: string, context?: string) {
    const prompt = `
      Generate a comprehensive FAQ about "${topic}".
      ${context ? `Consider this context: ${context}` : ""}
      
      Format the response as a JSON object with the following structure:
      {
        "question": "The question text",
        "answer": "The detailed answer",
        "tags": ["tag1", "tag2"]
      }
    `;

    const response = await this.generateText(prompt, {
      temperature: 0.7,
      max_tokens: 1500,
    });

    try {
      return JSON.parse(response);
    } catch (e) {
      console.error("Failed to parse DeepSeek response as JSON:", e);
      return {
        question: topic,
        answer: response,
        tags: [],
      };
    }
  }

  /**
   * Improve an existing FAQ answer
   */
  async improveFAQ(question: string, currentAnswer: string) {
    const prompt = `
      Improve the following FAQ answer to make it more comprehensive, clear, and helpful:
      
      Question: ${question}
      Current Answer: ${currentAnswer}
      
      Provide only the improved answer text without any additional commentary.
    `;

    return await this.generateText(prompt, {
      temperature: 0.7,
      max_tokens: 1500,
    });
  }

  /**
   * Generate an answer to a user question based on existing FAQs
   */
  async answerQuestion(
    question: string,
    existingFAQs: Array<{ question: string; answer: string }>
  ) {
    const faqContext = existingFAQs
      .map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`)
      .join("\n\n");

    const prompt = `
      Based on the following existing FAQs:
      
      ${faqContext}
      
      Answer this user question: "${question}"
      
      If the question is not directly addressed in the existing FAQs, use the information provided to give the best possible answer.
      If you cannot answer the question based on the provided FAQs, respond with "I don't have enough information to answer this question."
    `;

    return await this.generateText(prompt, {
      temperature: 0.5,
      max_tokens: 1000,
    });
  }

  /**
   * Suggest tags for an FAQ
   */
  async suggestTags(question: string, answer: string) {
    const prompt = `
      Suggest 3-5 relevant tags for the following FAQ:
      
      Question: ${question}
      Answer: ${answer}
      
      Return only a JSON array of tag strings, for example: ["tag1", "tag2", "tag3"]
    `;

    const response = await this.generateText(prompt, {
      temperature: 0.5,
      max_tokens: 200,
    });

    try {
      return JSON.parse(response);
    } catch (e) {
      console.error("Failed to parse DeepSeek response as JSON:", e);
      // Extract tags using regex as fallback
      const tagMatches = response.match(/"([^"]+)"/g);
      return tagMatches ? tagMatches.map((tag) => tag.replace(/"/g, "")) : [];
    }
  }

  /**
   * Summarize FAQ content
   */
  async summarizeFAQ(content: string) {
    const prompt = `
      Summarize the following FAQ content in a concise paragraph:
      
      ${content}
      
      Keep the summary under 100 words.
    `;

    return await this.generateText(prompt, {
      temperature: 0.3,
      max_tokens: 200,
    });
  }
}

// Export singleton instance
export const deepseekClient = new DeepSeekClient();
