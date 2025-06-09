# Ingest Data using Ragie CLI

## Prerequisites

- Sign up for a [Ragie.ai account](https://www.ragie.ai/).
- Install [ragie-cli](https://docs.ragie.ai/docs/ragie-cli) on your development machine. 

## Configure RAG environment

```bash
export RAGIE_API_KEY=<YOUR_RAGIE_API_KEY>
```

## Ingest documents

```
ragie import files data/paul_graham_essay.txt
```

## Install packages

```
npm install
```

## Generate LLM responses

```
 node index.mjs generate --query="What does Chamath think about Davos?"
```