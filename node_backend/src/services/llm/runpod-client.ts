import axios, { AxiosError } from "axios";
import logger from "../../utils/logger";
import { RunpodPayload } from "./types";
import { normalizeRunpodOutput } from "./response-normalizer";
import { buildLlamaPrompt, buildPromptFromMessages } from "./prompt-builder";
import { requireEnv, sleep } from "./utils";

export class RunpodClient {
  private apiKey: string;
  private endpointId: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = requireEnv("RUNPOD_API_KEY");
    this.endpointId = requireEnv("RUNPOD_ENDPOINT_ID");
    this.baseUrl = `https://api.runpod.ai/v2/${this.endpointId}`;
  }

  async post(input: RunpodPayload, tries = 2): Promise<string> {
    const urlSync = `${this.baseUrl}/runsync`;
    const urlRun = `${this.baseUrl}/run`;

    const lastUserMsg =
      Array.isArray(input.messages) && input.messages.length
        ? [...input.messages].reverse().find((m) => m.role === "user")?.content?.trim() ?? ""
        : "";

    const systemMsg =
      Array.isArray(input.messages) && input.messages.length
        ? input.messages.find((m) => m.role === "system")?.content?.trim()
        : undefined;

    const llamaComposed =
      lastUserMsg
        ? buildLlamaPrompt(systemMsg, lastUserMsg)
        : undefined;

    const composedPrompt =
      input.prompt ??
      input.text ??
      input.inputs ??
      llamaComposed ??
      buildPromptFromMessages(input.messages);

    const sampling_params = {
      n: input.n ?? 1,
      best_of: input.best_of ?? 1,
      temperature: input.temperature ?? 0.35,
      top_p: input.top_p ?? 0.9,
      use_beam_search: input.use_beam_search ?? false,
      stop: input.stop ?? [],
      ignore_eos: false,
      max_tokens: (input.max_new_tokens ?? input.max_tokens ?? 600) as number,
      presence_penalty: 0.0,
      frequency_penalty: 0.0,
    };

    const payload: RunpodPayload = {
      ...input,
      prompt: input.prompt ?? composedPrompt ?? "",
      inputs: input.inputs ?? input.prompt ?? composedPrompt ?? "",
      max_tokens: input.max_tokens ?? input.max_new_tokens ?? 400,
      max_new_tokens: input.max_new_tokens ?? input.max_tokens ?? 400,
      sampling_params,
      stop: input.stop ?? ["</s>", "[/INST]"],
    };

    for (let attempt = 1; attempt <= tries; attempt++) {
      try {
        const safeLog = {
          ...payload,
          prompt: `[len=${(payload.prompt ?? "").length}]`,
          inputs: `[len=${(payload.inputs ?? "").length}]`,
          instruction: `[len=${(payload.instruction ?? "").length}]`,
          text: `[len=${(payload.text ?? "").length}]`,
          input: `[len=${String((payload as any).input ?? "").length}]`,
          input_text: `[len=${String((payload as any).input_text ?? "").length}]`,
          query: `[len=${String((payload as any).query ?? "").length}]`,
          question: `[len=${String((payload as any).question ?? "").length}]`,
          messages: payload.messages
            ? payload.messages.map((m) => ({ ...m, content: `[len=${m.content.length}]` }))
            : undefined,
        };
        logger.debug("[LLM] POST /runsync payload (safe):", safeLog);

        const { data } = await axios.post(
          urlSync,
          { input: payload },
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            timeout: 120_000,
          }
        );

        logger.debug("[LLM] /runsync response shape (top-level):", {
          delayTime: typeof data?.delayTime,
          executionTime: typeof data?.executionTime,
          id: typeof data?.id,
          output: typeof data?.output,
          status: typeof data?.status,
          workerId: typeof data?.workerId,
        });
        logger.debug("[LLM] /runsync output shape:", {
          input_tokens: typeof data?.output?.input_tokens,
          output_tokens: typeof data?.output?.output_tokens,
          text: Array.isArray(data?.output?.text)
            ? `array(len=${data.output.text.length})`
            : typeof data?.output?.text,
          result: typeof data?.output?.result,
          generated_text: typeof data?.output?.generated_text,
        });

        const arr = data?.output?.text;
        if (Array.isArray(arr) && arr.length && typeof arr[0] === "string" && arr[0].trim() !== "") {
          return arr.join("\n");
        }

        const normalized = normalizeRunpodOutput(data);
        logger.debug("[LLM] /runsync normalized output preview:", String(normalized).slice(0, 60));

        const isEmpty =
          normalized === "" ||
          normalized === "false" ||
          normalized === "null" ||
          typeof data?.output === "undefined" ||
          data?.output === false;

        if (isEmpty) {
          logger.warn("[LLM] /runsync empty-ish output; falling back to /run + /status polling");
          const polled = await this.runAndPoll(urlRun, payload);
          return polled;
        }

        return normalized;
      } catch (err: unknown) {
        const axErr = err as AxiosError;
        const msg = (axErr?.response?.data as any)?.error ?? axErr?.message ?? "Unknown Runpod error";
        logger.error(`Runpod /runsync error (attempt ${attempt}/${tries}):`, msg);

        if (
          attempt < tries &&
          (axErr.code === "ECONNRESET" ||
            axErr.code === "ECONNABORTED" ||
            axErr.message?.toLowerCase().includes("timeout") ||
            axErr.message?.toLowerCase().includes("network"))
        ) {
          await sleep(1000 * attempt);
          continue;
        }
        logger.warn("[LLM] Falling back to /run + /status after /runsync error");
        return await this.runAndPoll(urlRun, payload);
      }
    }
    throw new Error("LLM request failed");
  }

  private async runAndPoll(urlRun: string, payload: RunpodPayload): Promise<string> {
    const { data: runData } = await axios.post(
      urlRun,
      { input: payload },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 60_000,
      }
    );

    const jobId: string | undefined = runData?.id;
    if (!jobId) {
      logger.error("[LLM] /run did not return a job id.");
      throw new Error("Runpod /run failed to return job id");
    }

    const statusUrl = `${this.baseUrl}/status/${jobId}`;
    logger.debug("[LLM] Polling status:", { jobId });

    const started = Date.now();
    const timeoutMs = 180_000;
    while (Date.now() - started < timeoutMs) {
      const { data: st } = await axios.get(statusUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
        },
        timeout: 40_000,
      });

      const status = String(st?.status || "").toUpperCase();
      if (status === "COMPLETED") {
        const out = st?.output ?? {};

        if (Array.isArray(out?.text) && out.text.length) {
          const joined = out.text.filter((t: any) => typeof t === "string").join("\n").trim();
          if (joined) return joined;
        }

        const direct =
          out?.result ??
          out?.generated_text ??
          out?.output_text ??
          out?.response ??
          out?.answer ??
          (Array.isArray(out?.text) ? out.text.join("\n") : out?.text);
        const directStr = typeof direct === "string" ? direct : "";
        const normalized = normalizeRunpodOutput(directStr || st);
        logger.debug("[LLM] /status normalized output preview:", String(normalized).slice(0, 60));

        if (!normalized || normalized === "false" || normalized === "null") {
          logger.warn("[LLM] /status returned falsy output despite COMPLETED");
        }
        return normalized;
      }
      if (status === "FAILED" || status === "CANCELED") {
        logger.error("[LLM] Job failed/canceled", { status, jobId });
        throw new Error(`Runpod job ${status.toLowerCase()}`);
      }

      await sleep(1200);
    }

    logger.error("[LLM] /status polling timed out");
    throw new Error("Runpod polling timeout");
  }
}
