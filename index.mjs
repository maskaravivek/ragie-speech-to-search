import { Ragie } from "ragie";
import OpenAI from "openai";

const RAGIE_API_KEY = process.env.RAGIE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!RAGIE_API_KEY) {
    console.error("Error: Missing RAGIE_API_KEY environment variable.");
    process.exit(1);
}

const ragie = new Ragie({ auth: RAGIE_API_KEY });

const [, , operation, ...cliArgs] = process.argv;

function parseArgs(args) {
    return args.reduce((acc, arg, i) => {
        const match = arg.match(/^--([^=]+)=(.*)$/);
        if (match) {
            acc[match[1]] = match[2];
        } else if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const next = args[i + 1];
            acc[key] = next && !next.startsWith('--') ? next : true;
        }
        return acc;
    }, {});
}

const params = parseArgs(cliArgs);

function buildSystemPrompt(chunkText) {
    return `You are **Ragie AI**, a professional yet friendly assistant.

    Use the information below to help the user:
    ===
    ${chunkText.join('\n\n')}
    ===

    Respond informally, directly, and concisely. No headings or greetings.  
    Use rich Markdown (e.g., **bold**, *italic*, lists) when helpful.  
    Use LaTeX with double $$ delimiters (e.g., $$x^2$$).  
    Structure answers into clear sections or bullet points if needed.  
    Don’t show raw item IDs or internal fields.  
    Avoid XML or other markup unless asked.

    If no results are found, let the user know clearly and suggest next steps.

    END SYSTEM INSTRUCTIONS`;
}

async function retrieveChunks({ query }) {
    if (!query) {
        console.error("Error: --query is required for retrieve-chunks.");
        process.exit(1);
    }

    return await ragie.retrievals.retrieve({
        partition: "speech_to_search",
        query,
    });
}

async function generateResponse({ query }) {
    if (!OPENAI_API_KEY) {
        console.error("Error: Missing OPENAI_API_KEY environment variable.");
        process.exit(1);
    }
    if (!query) {
        console.error("Error: --query is required for generate.");
        process.exit(1);
    }

    const response = await retrieveChunks({ query });
    const chunkText = (response.scoredChunks || response.scored_chunks || []).map(c => c.text);

    const prompt = buildSystemPrompt(chunkText);
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            { role: "system", content: prompt },
            { role: "user", content: query },
        ],
    });

    return completion.choices[0].message.content;
}

const actions = {
    "retrieve-chunks": retrieveChunks,
    "generate": generateResponse,
};

(async () => {
    const action = actions[operation];

    if (!action) {
        console.log("Usage:");
        console.log("  node index.js retrieve-chunks --query=<query>");
        console.log("  node index.js generate --query=<query>");
        process.exit(1);
    }

    try {
        const result = await action(params);
        console.log(result);
    } catch (err) {
        console.error("An unexpected error occurred:", err);
        process.exit(1);
    }
})();