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

async function retrieveChunks({ query }) {
    
}

async function generateResponse({ query }) {
    
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