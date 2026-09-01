#!/usr/bin/env node
// Export Question collection to Gemini fine-tune JSONL
// Usage: node --loader tsx scripts/prepare-gemini.mjs
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

const outPath = path.resolve('training/gemini-finetune.jsonl');

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('Set MONGO_URI in backend/.env first');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const { Question } = await import('../src/models/Question.js');
  const qs = await Question.find({ status: 'ready' }).limit(200).lean();
  if (qs.length === 0) {
    console.warn('No ready questions found — using the 3 example lines already in training/gemini-finetune.jsonl');
    await mongoose.disconnect();
    return;
  }
  const lines = qs.map((q) =>
    JSON.stringify({
      input_text: `topic: ${q.topic}, difficulty: ${q.difficulty}, count:1`,
      output_text: JSON.stringify([
        {
          text: q.text,
          options: q.options,
          correctIndex: q.correctIndex,
          explanation: q.explanation || '',
          topic: q.topic,
          difficulty: q.difficulty,
        },
      ]),
    }),
  );
  fs.writeFileSync(outPath, lines.join('\n') + '\n');
  console.log(`Wrote ${lines.length} lines to ${outPath}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
