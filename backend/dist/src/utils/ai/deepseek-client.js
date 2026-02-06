"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepseekClient = exports.DeepSeekClient = void 0;
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
class DeepSeekClient {
    constructor() {
        this.baseUrl = "https://api.deepseek.com/v1";
        this.apiKey = process.env.DEEPSEEK_API_KEY || "";
        if (!this.apiKey) {
            console_1.logger.error("DEEPSEEK", "API key is not set");
        }
    }
    async generateText(prompt, options = {}) {
        if (!this.apiKey) {
            throw (0, error_1.createError)({ statusCode: 500, message: "DeepSeek API key is not set" });
        }
        const { model = "deepseek-chat", temperature = 0.7, max_tokens = 1000, top_p = 0.95, } = options;
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
                }
                catch (jsonError) {
                    errorBody = await response.text();
                }
                throw (0, error_1.createError)({
                    statusCode: 500,
                    message: `DeepSeek API error: ${(errorBody && (errorBody.message || errorBody)) ||
                        response.statusText}`
                });
            }
            const data = await response.json();
            return data.choices[0].message.content;
        }
        catch (error) {
            console_1.logger.error("DEEPSEEK", "Error generating text", error);
            throw error;
        }
    }
    async generateFAQ(topic, context) {
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
        }
        catch (e) {
            console_1.logger.error("DEEPSEEK", "Failed to parse response as JSON", e);
            return {
                question: topic,
                answer: response,
                tags: [],
            };
        }
    }
    async improveFAQ(question, currentAnswer) {
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
    async answerQuestion(question, existingFAQs) {
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
    async suggestTags(question, answer) {
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
        }
        catch (e) {
            console_1.logger.error("DEEPSEEK", "Failed to parse tags response as JSON", e);
            const tagMatches = response.match(/"([^"]+)"/g);
            return tagMatches ? tagMatches.map((tag) => tag.replace(/"/g, "")) : [];
        }
    }
    async summarizeFAQ(content) {
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
exports.DeepSeekClient = DeepSeekClient;
exports.deepseekClient = new DeepSeekClient();
