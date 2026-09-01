# Gemini Fine-tune — Training Folder

This folder contains everything needed to train Gemini for BrainArena question generation.

## Files
- `gemini-finetune.jsonl` — **training data** (50–200 lines). Each line is one example:
  ```json
  {"input_text":"topic: <topic>, difficulty: <easy|medium|hard>, count:1","output_text":"[{\"text\":\"...\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"correctIndex\":0,\"explanation\":\"...\",\"topic\":\"...\",\"difficulty\":\"...\"}]"}
  ```
  The 3 lines here are examples — replace/extend with your own questions. To auto-generate from your DB, run `npm run prepare:gemini` (see `backend/scripts/prepare-gemini.mjs`).

- `../scripts/prepare-gemini.mjs` — exports your `Question` collection to this JSONL format. Edit the query if you want only certain topics.

## How to train (Option B — Gemini)

1. **Prepare data:** Ensure `gemini-finetune.jsonl` has 50+ lines. Validate each line is valid JSON.
   ```powershell
   Get-Content backend/training/gemini-finetune.jsonl | ForEach-Object { $_ | ConvertFrom-Json | Out-Null; Write-Host ok }
   ```

2. **Upload & tune:**
   - AI Studio: https://aistudio.google.com → Tuned models → Create → upload `gemini-finetune.jsonl` → base `gemini-1.5-flash-001` → Tune.
   - Or Vertex AI: `gsutil cp gemini-finetune.jsonl gs://YOUR_BUCKET/` then `gcloud ai tuned-models create ...`

3. **Get model id:** `tunedModels/your-model-xxx`

4. **Configure backend:**
   ```
   # backend/.env and Render Environment
   AI_PROVIDER=gemini
   GEMINI_API_KEY=YOUR_KEY
   GEMINI_TUNED_MODEL=tunedModels/your-model-xxx
   ```

5. **Backend already patched** (`src/services/ai.service.ts` + `src/config/env.ts`) to use `GEMINI_TUNED_MODEL` if set, else falls back to `gemini-1.5-flash`.

## Notes
- Keep training data in this style if you want "different" generation (e.g. Tamil, case-study, image-based) — just change the examples to that style.
- The tuned model lives in Google Cloud, not in this repo. Only the JSONL stays here.
- Never commit real API keys. `backend/.env` is gitignored.
