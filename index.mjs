import { Ragie } from "ragie";
import OpenAI from "openai";

const apiKey = process.env.RAGIE_API_KEY;

if (!apiKey) {
    console.error("Error: RAGIE_API_KEY environment variable not set.");
    process.exit(1);
}

const ragie = new Ragie({
    auth: apiKey
});

const [, , operation, ...rawArgs] = process.argv;

function parseArgs(args) {
    const params = {};
    for (let i = 0; i < args.length; i++) {
        const eqMatch = args[i].match(/^--([^=]+)=(.*)$/);
        if (eqMatch) {
            params[eqMatch[1]] = eqMatch[2];
        } else if (args[i].startsWith('--')) {
            const key = args[i].slice(2);
            const value = args[i + 1];
            if (value && !value.startsWith('--')) {
                params[key] = value;
                i++;
            } else {
                params[key] = true;
            }
        }
    }
    return params;
}

const params = parseArgs(rawArgs);

if (!operation) {
    console.log("Usage:");
    console.log("  node index.js retrieve-chunks --query=<query>");
    console.log("  node index.js generate --query=<query>");
    process.exit(1);
}

async function retrieveChunks({ query }) {
    if (!query) {
        console.error("Error: --query is required for retrieve-chunks operation.");
        process.exit(1);
    }
    const response = await ragie.retrievals.retrieve({
        partition: "speech_to_search",
        query
    });
    return response;
}

async function generate({ query }) {
    const openAiApiKey = process.env.OPENAI_API_KEY;
    if (!openAiApiKey) {
        console.error("Error: OPENAI_API_KEY environment variable not set.");
        process.exit(1);
    }
    if (!query) {
        console.error("Error: --query is required for generate operation.");
        process.exit(1);
    }
    try {
        const response = await retrieveChunks({ query });

        const chunkText = (response.scoredChunks || response.scored_chunks || []).map((chunk) => chunk.text);
        const systemPrompt = `These are very important to follow:

You are "Ragie AI", a professional but friendly AI chatbot working as an assitant to the user.

Your current task is to help the user based on all of the information available to you shown below.
Answer informally, directly, and concisely without a heading or greeting but include everything relevant.
Use richtext Markdown when appropriate including **bold**, *italic*, paragraphs, and lists when helpful.
If using LaTeX, use double $$ as delimiter instead of single $. Use $$...$$ instead of parentheses.
Organize information into multiple sections or points when appropriate.
Don't include raw item IDs or other raw fields from the source.
Don't use XML or other markup unless requested by the user.

Here is all of the information available to answer the user:
===
${chunkText}
===

If the user asked for a search and there are no results, make sure to let the user know that you couldn't find anything,
and what they might be able to do to find the information they need.

END SYSTEM INSTRUCTIONS`;

        const openai = new OpenAI({ apiKey: openAiApiKey });

        try {
            const chatCompletion = await openai.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: query },
                ],
                model: "gpt-4o",
            });

            return chatCompletion.choices[0].message.content;
        } catch (error) {
            console.error("Failed to get completion from OpenAI:", error);
            process.exit(1);
        }
    } catch (error) {
        console.error("Failed to retrieve data from Ragie API:", error);
        process.exit(1);
    }
}

(async () => {
    if (operation === "retrieve-chunks") {
        const response = await retrieveChunks(params);
        console.log(response);
    } else if (operation === "generate") {
        const response = await generate(params);
        console.log(response);
    } else {
        console.error(`Unknown operation: ${operation}`);
        process.exit(1);
    }
})();