#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const API_BASE_URL = (process.env.TURTLE_NOIR_API_BASE_URL ?? "https://turtlenoir.com/api/mcp").replace(/\/+$/, "");
const RAW_TIMEOUT = Number(process.env.TURTLE_NOIR_API_TIMEOUT_MS ?? "10000");
const API_TIMEOUT_MS = Number.isFinite(RAW_TIMEOUT) && RAW_TIMEOUT > 0 ? RAW_TIMEOUT : 10000;
const API_KEY = process.env.TURTLE_NOIR_API_KEY;

type SupportedLanguage = "zh-CN" | "en-US" | "ja-JP";
type AnswerKey = "yes" | "no" | "both" | "irrelevant";

const START_SESSION_INPUT_SCHEMA = z.object({
    region: z
        .string()
        .min(2)
        .max(8)
        .optional()
        .describe("Optional region code, e.g. US/CN/JP"),
    difficulty: z
        .enum(["简单", "中等", "困难"])
        .optional()
        .describe("Optional difficulty preference"),
    keyword: z
        .string()
        .min(1)
        .max(100)
        .optional()
        .describe("Optional fuzzy keyword on title/surface/tags"),
    language: z
        .string()
        .min(2)
        .max(16)
        .optional()
        .describe("User language for localized response, e.g. zh-CN/en-US/ja-JP"),
});
const ASK_QUESTION_INPUT_SCHEMA = z.object({
    session_id: z.string().min(1).describe("Session ID returned by start_session"),
    question: z.string().min(1).describe("Detective question to judge"),
    language: z
        .string()
        .min(2)
        .max(16)
        .optional()
        .describe("User language for localized response, e.g. zh-CN/en-US/ja-JP"),
});
const GIVE_UP_INPUT_SCHEMA = z.object({
    session_id: z.string().min(1).describe("Session ID returned by start_session"),
    language: z
        .string()
        .min(2)
        .max(16)
        .optional()
        .describe("User language for localized response, e.g. zh-CN/en-US/ja-JP"),
});

interface StartSessionApiResponse {
    session_id?: string;
    puzzle_id?: string;
    title?: string;
    content?: string;
    [key: string]: unknown;
}

interface AskQuestionApiResponse {
    answer?: string;
    short_reason?: string;
    solved?: boolean;
    progress?: number;
    [key: string]: unknown;
}

interface GiveUpApiResponse {
    title?: string;
    solution?: string;
    full_story?: string;
    cta_url?: string;
    [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function pickString(obj: Record<string, unknown>, key: string): string | undefined {
    const value = obj[key];
    if (typeof value === "string" && value.trim().length > 0) {
        return value;
    }
    return undefined;
}

function pickBoolean(obj: Record<string, unknown>, key: string): boolean | undefined {
    const value = obj[key];
    return typeof value === "boolean" ? value : undefined;
}

function pickNumber(obj: Record<string, unknown>, key: string): number | undefined {
    const value = obj[key];
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeLanguage(raw: unknown): SupportedLanguage {
    if (typeof raw !== "string") return "zh-CN";
    const normalized = raw.trim().toLowerCase();
    if (normalized.startsWith("en")) return "en-US";
    if (normalized.startsWith("ja") || normalized.startsWith("jp")) return "ja-JP";
    if (normalized.startsWith("zh")) return "zh-CN";
    return "zh-CN";
}

function toAnswerKey(raw: string): AnswerKey {
    const value = raw.trim();
    const lower = value.toLowerCase();

    if (value === "是" || lower === "yes") return "yes";
    if (value === "不是" || lower === "no") return "no";
    if (value === "是也不是" || lower === "both" || lower === "yes and no") return "both";
    if (value === "没有关系" || lower === "irrelevant") return "irrelevant";

    if (lower.includes("yes") && lower.includes("no")) return "both";
    if (value.includes("是也不是")) return "both";
    return "irrelevant";
}

function localizeAnswer(key: AnswerKey, language: SupportedLanguage): string {
    const labels: Record<SupportedLanguage, Record<AnswerKey, string>> = {
        "zh-CN": {
            yes: "是",
            no: "不是",
            both: "是也不是",
            irrelevant: "没有关系",
        },
        "en-US": {
            yes: "Yes",
            no: "No",
            both: "Both",
            irrelevant: "Irrelevant",
        },
        "ja-JP": {
            yes: "はい",
            no: "いいえ",
            both: "はい/いいえ",
            irrelevant: "無関係",
        },
    };

    return labels[language][key];
}

function localizeStartInstruction(language: SupportedLanguage): string {
    if (language === "en-US") {
        return "Use ask_question with the same session_id. Host answers in 4 classes: Yes / No / Both / Irrelevant.";
    }
    if (language === "ja-JP") {
        return "同じ session_id で ask_question を呼び出してください。回答は 4 種類です: はい / いいえ / はい/いいえ / 無関係。";
    }
    return "请使用相同 session_id 调用 ask_question。主持人仅返回四类答案：是 / 不是 / 是也不是 / 没有关系。";
}

function localizeCtaText(language: SupportedLanguage): string {
    if (language === "en-US") {
        return "For a stricter host, visual clues, and multiplayer mode, play at turtlenoir.com";
    }
    if (language === "ja-JP") {
        return "より厳密なホスト、ビジュアル手がかり、マルチプレイは turtlenoir.com で。";
    }
    return "想体验更严格主持人、视觉线索和多人模式，请访问 turtlenoir.com";
}

function buildTranslationInstruction(language: SupportedLanguage, fields: string[]): string {
    if (language === "en-US") {
        return `Translate free-text fields (${fields.join(", ")}) to en-US before replying to the user.`;
    }
    if (language === "ja-JP") {
        return `ユーザーに返信する前に、自由文フィールド（${fields.join("、")}）を ja-JP に翻訳してください。`;
    }
    return `请在回复用户前，将自由文本字段（${fields.join("、")}）翻译为 zh-CN。`;
}

function textResult(payload: unknown) {
    return {
        content: [
            {
                type: "text" as const,
                text: JSON.stringify(payload, null, 2),
            },
        ],
    };
}

function errorResult(message: string, details?: unknown) {
    return {
        isError: true,
        content: [
            {
                type: "text" as const,
                text: JSON.stringify(
                    {
                        error: message,
                        details: details ?? null,
                    },
                    null,
                    2,
                ),
            },
        ],
    };
}

async function postJson<TResponse>(path: string, payload: unknown): Promise<TResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

    try {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };

        if (API_KEY) {
            headers.Authorization = `Bearer ${API_KEY}`;
        }

        const response = await fetch(`${API_BASE_URL}${path}`, {
            method: "POST",
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal,
        });

        const rawText = await response.text();
        let data: unknown = null;

        if (rawText.length > 0) {
            try {
                data = JSON.parse(rawText);
            } catch {
                throw new Error(`Expected JSON response from ${path}, got non-JSON body.`);
            }
        }

        if (!response.ok) {
            const apiError = isRecord(data) ? pickString(data, "error") : undefined;
            const message = apiError ?? response.statusText ?? "request failed";
            throw new Error(`HTTP ${response.status}: ${message}`);
        }

        return data as TResponse;
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
            throw new Error(`Request timeout after ${API_TIMEOUT_MS}ms`);
        }
        throw error;
    } finally {
        clearTimeout(timer);
    }
}

const server = new Server(
    {
        name: "mcp-turtle-noir",
        version: "1.1.0",
    },
    {
        capabilities: {
            tools: {},
        },
    },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "start_session",
                description: "Start a new Turtle Soup session. Detect user language and pass language (zh-CN/en-US/ja-JP). Optional: region, difficulty, keyword.",
                inputSchema: zodToJsonSchema(START_SESSION_INPUT_SCHEMA),
            },
            {
                name: "ask_question",
                description: "Ask a question for the active session. Detect user language and pass language (zh-CN/en-US/ja-JP).",
                inputSchema: zodToJsonSchema(ASK_QUESTION_INPUT_SCHEMA),
            },
            {
                name: "give_up_and_reveal",
                description: "Give up the current session and reveal the full story. Detect user language and pass language (zh-CN/en-US/ja-JP).",
                inputSchema: zodToJsonSchema(GIVE_UP_INPUT_SCHEMA),
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "start_session") {
        try {
            const parsedInput = START_SESSION_INPUT_SCHEMA.safeParse(request.params.arguments ?? {});
            if (!parsedInput.success) {
                return errorResult("Invalid arguments for start_session", parsedInput.error.flatten());
            }

            const language = normalizeLanguage(parsedInput.data.language);

            const startPayload: Record<string, unknown> = {
                language,
            };
            if (parsedInput.data.region) startPayload.region = parsedInput.data.region;
            if (parsedInput.data.difficulty) startPayload.difficulty = parsedInput.data.difficulty;
            if (parsedInput.data.keyword) startPayload.keyword = parsedInput.data.keyword;

            const apiData = await postJson<StartSessionApiResponse>("/start-session", startPayload);

            if (!isRecord(apiData)) {
                return errorResult("Invalid response shape from /start-session", apiData);
            }

            const sessionId = pickString(apiData, "session_id");
            const title = pickString(apiData, "title");
            const content = pickString(apiData, "content");

            if (!sessionId || !title || !content) {
                return errorResult("Missing required fields in /start-session response", apiData);
            }

            return textResult({
                session_id: sessionId,
                puzzle_id: pickString(apiData, "puzzle_id") ?? null,
                title,
                content,
                language,
                instruction: localizeStartInstruction(language),
                translation_instruction: buildTranslationInstruction(language, ["title", "content"]),
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return errorResult("Failed to start session", {
                endpoint: `${API_BASE_URL}/start-session`,
                message: errorMessage,
            });
        }
    }

    if (request.params.name === "ask_question") {
        try {
            const parsedInput = ASK_QUESTION_INPUT_SCHEMA.safeParse(request.params.arguments ?? {});
            if (!parsedInput.success) {
                return errorResult("Invalid arguments for ask_question", parsedInput.error.flatten());
            }

            const language = normalizeLanguage(parsedInput.data.language);

            const apiData = await postJson<AskQuestionApiResponse>("/ask-question", {
                session_id: parsedInput.data.session_id,
                question: parsedInput.data.question,
                language,
            });

            if (!isRecord(apiData)) {
                return errorResult("Invalid response shape from /ask-question", apiData);
            }

            const answerRaw = pickString(apiData, "answer");
            if (!answerRaw) {
                return errorResult("Missing required field 'answer' in /ask-question response", apiData);
            }

            const answerKey = toAnswerKey(answerRaw);
            const solved = pickBoolean(apiData, "solved");

            return textResult({
                session_id: parsedInput.data.session_id,
                language,
                answer_key: answerKey,
                answer: localizeAnswer(answerKey, language),
                answer_original: answerRaw,
                short_reason: pickString(apiData, "short_reason") ?? null,
                solved: solved ?? null,
                progress: pickNumber(apiData, "progress") ?? null,
                translation_instruction: buildTranslationInstruction(language, ["short_reason"]),
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return errorResult("Failed to judge question", {
                endpoint: `${API_BASE_URL}/ask-question`,
                message: errorMessage,
            });
        }
    }

    if (request.params.name === "give_up_and_reveal") {
        try {
            const parsedInput = GIVE_UP_INPUT_SCHEMA.safeParse(request.params.arguments ?? {});
            if (!parsedInput.success) {
                return errorResult("Invalid arguments for give_up_and_reveal", parsedInput.error.flatten());
            }

            const language = normalizeLanguage(parsedInput.data.language);

            const apiData = await postJson<GiveUpApiResponse>("/give-up", {
                session_id: parsedInput.data.session_id,
                language,
            });

            if (!isRecord(apiData)) {
                return errorResult("Invalid response shape from /give-up", apiData);
            }

            return textResult({
                session_id: parsedInput.data.session_id,
                language,
                title: pickString(apiData, "title") ?? null,
                solution: pickString(apiData, "solution") ?? pickString(apiData, "full_story") ?? null,
                cta_url: pickString(apiData, "cta_url") ?? "https://turtlenoir.com",
                cta_text: localizeCtaText(language),
                translation_instruction: buildTranslationInstruction(language, ["title", "solution", "cta_text"]),
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return errorResult("Failed to reveal solution", {
                endpoint: `${API_BASE_URL}/give-up`,
                message: errorMessage,
            });
        }
    }

    return errorResult(`Tool not found: ${request.params.name}`);
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error(`Turtle Noir MCP Server running on stdio (API base: ${API_BASE_URL})`);
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
