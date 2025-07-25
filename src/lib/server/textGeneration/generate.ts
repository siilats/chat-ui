import { config } from "$lib/server/config";
import type { ToolResult, Tool } from "$lib/types/Tool";
import {
	MessageReasoningUpdateType,
	MessageUpdateType,
	type MessageUpdate,
} from "$lib/types/MessageUpdate";
import { AbortedGenerations } from "../abortedGenerations";
import type { TextGenerationContext } from "./types";
import type { EndpointMessage } from "../endpoints/endpoints";
import { generateFromDefaultEndpoint } from "../generateFromDefaultEndpoint";
import { generateSummaryOfReasoning } from "./reasoning";
import { logger } from "../logger";

type GenerateContext = Omit<TextGenerationContext, "messages"> & { messages: EndpointMessage[] };

export async function* generate(
	{ model, endpoint, conv, messages, assistant, isContinue, promptedAt }: GenerateContext,
	toolResults: ToolResult[],
	preprompt?: string,
	tools?: Tool[]
): AsyncIterable<MessageUpdate> {
	// reasoning mode is false by default
	let reasoning = false;
	const reasoningBuffer = "";
	let buffer = "";
	let lastReasoningUpdate = new Date();
	let status = "";
	const startTime = new Date();
	let lastProcessedBeginTokenIndex = -1; // Track the last processed begin token position
	if (
		model.reasoning &&
		// if the beginToken is an empty string, the model starts in reasoning mode
		(model.reasoning.type === "regex" ||
			model.reasoning.type === "summarize" ||
			(model.reasoning.type === "tokens" && model.reasoning.beginToken === ""))
	) {
		// if the model has reasoning in regex or summarize mode, it starts in reasoning mode
		// and we extract the answer from the reasoning
		reasoning = true;
		yield {
			type: MessageUpdateType.Reasoning,
			subtype: MessageReasoningUpdateType.Status,
			status: "Started reasoning...",
		};
	}

	for await (const output of await endpoint({
		messages,
		preprompt,
		continueMessage: isContinue,
		generateSettings: assistant?.generateSettings,
		tools,
		toolResults,
		isMultimodal: model.multimodal,
		conversationId: conv._id,
	})) {
		// text generation completed
		if (output.generated_text) {
			let interrupted =
				!output.token.special && !model.parameters.stop?.includes(output.token.text);

			let text = output.generated_text.trimEnd();
			for (const stopToken of model.parameters.stop ?? []) {
				if (!text.endsWith(stopToken)) continue;

				interrupted = false;
				text = text.slice(0, text.length - stopToken.length);
			}

			let finalAnswer = text;
			if (model.reasoning && model.reasoning.type === "regex") {
				const regex = new RegExp(model.reasoning.regex);
				finalAnswer = regex.exec(reasoningBuffer)?.[1] ?? text;
			} else if (model.reasoning && model.reasoning.type === "summarize") {
				yield {
					type: MessageUpdateType.Reasoning,
					subtype: MessageReasoningUpdateType.Status,
					status: "Summarizing reasoning...",
				};
				try {
					const summary = yield* generateFromDefaultEndpoint({
						messages: [
							{
								from: "user",
								content: `Question: ${
									messages[messages.length - 1].content
								}\n\nReasoning: ${reasoningBuffer}`,
							},
						],
						preprompt: `Your task is to summarize concisely all your reasoning steps and then give the final answer. Keep it short, one short paragraph at most. If the reasoning steps explicitly include a code solution, make sure to include it in your answer.

If the user is just having a casual conversation that doesn't require explanations, answer directly without explaining your steps, otherwise make sure to summarize step by step, make sure to skip dead-ends in your reasoning and removing excess detail.

Do not use prefixes such as Response: or Answer: when answering to the user.`,
						generateSettings: {
							max_new_tokens: 1024,
						},
					});
					finalAnswer = summary;
					yield {
						type: MessageUpdateType.Reasoning,
						subtype: MessageReasoningUpdateType.Status,
						status: `Done in ${Math.round((new Date().getTime() - startTime.getTime()) / 1000)}s.`,
					};
				} catch (e) {
					finalAnswer = text;
					logger.error(e);
				}
			} else if (model.reasoning && model.reasoning.type === "tokens") {
				// make sure to remove the content of the reasoning buffer from
				// the final answer to avoid duplication

				// if the beginToken is an empty string, we don't need to remove anything
				const beginIndex = model.reasoning.beginToken
					? buffer.indexOf(model.reasoning.beginToken)
					: 0;
				const endIndex = buffer.lastIndexOf(model.reasoning.endToken);

				if (beginIndex !== -1 && endIndex !== -1) {
					// Remove the reasoning section (including tokens) from final answer
					finalAnswer =
						text.slice(0, beginIndex) + text.slice(endIndex + model.reasoning.endToken.length);
				}
			}

			yield {
				type: MessageUpdateType.FinalAnswer,
				text: finalAnswer,
				interrupted,
				webSources: output.webSources,
			};
			continue;
		}

		buffer += output.token.text;

		if (model.reasoning && model.reasoning.type === "tokens") {
			const currentBeginTokenIndex = buffer.indexOf(model.reasoning.beginToken);

			if (
				!reasoning &&
				currentBeginTokenIndex !== -1 &&
				currentBeginTokenIndex > lastProcessedBeginTokenIndex &&
				buffer.indexOf(model.reasoning.endToken) === -1
			) {
				reasoning = true;
				lastProcessedBeginTokenIndex = currentBeginTokenIndex;
				const beginTokenIndex = buffer.indexOf(model.reasoning.beginToken);
				const textBuffer = buffer.slice(beginTokenIndex + model.reasoning.beginToken.length);
				yield {
					type: MessageUpdateType.Reasoning,
					subtype: MessageReasoningUpdateType.Status,
					status: "Started reasoning...",
				};
				yield {
					type: MessageUpdateType.Reasoning,
					subtype: MessageReasoningUpdateType.Back,
					content: buffer.length - buffer.lastIndexOf(model.reasoning.beginToken),
				};
				yield {
					type: MessageUpdateType.Reasoning,
					subtype: MessageReasoningUpdateType.Stream,
					token: textBuffer,
				};

				continue;
			}
			if (reasoning && buffer.indexOf(model.reasoning.endToken) !== -1) {
				reasoning = false;
				const endTokenIndex = buffer.lastIndexOf(model.reasoning.endToken);
				const textBuffer = buffer.slice(endTokenIndex + model.reasoning.endToken.length);
				yield {
					type: MessageUpdateType.Reasoning,
					subtype: MessageReasoningUpdateType.Status,
					status: `Done in ${Math.round((new Date().getTime() - startTime.getTime()) / 1000)}s.`,
				};
				yield {
					type: MessageUpdateType.Reasoning,
					subtype: MessageReasoningUpdateType.Back,
					reasoning: buffer.length - buffer.lastIndexOf(model.reasoning.endToken),
				};
				yield {
					type: MessageUpdateType.Stream,
					token: textBuffer,
				};
				continue;
			}
		}
		// ignore special tokens
		if (output.token.special) continue;

		// pass down normal token
		if (reasoning) {
			// yield status update if it has changed
			if (status !== "") {
				yield {
					type: MessageUpdateType.Reasoning,
					subtype: MessageReasoningUpdateType.Status,
					status,
				};
				status = "";
			}

			// create a new status every 5 seconds
			if (
				config.REASONING_SUMMARY === "true" &&
				new Date().getTime() - lastReasoningUpdate.getTime() > 4000
			) {
				lastReasoningUpdate = new Date();
				try {
					generateSummaryOfReasoning(reasoningBuffer).then((summary) => {
						status = summary;
					});
				} catch (e) {
					logger.error(e);
				}
			}
			yield {
				type: MessageUpdateType.Reasoning,
				subtype: MessageReasoningUpdateType.Stream,
				token: output.token.text,
			};
		} else {
			yield { type: MessageUpdateType.Stream, token: output.token.text };
		}

		// abort check
		const date = AbortedGenerations.getInstance().getAbortTime(conv._id.toString());

		if (date && date > promptedAt) {
			logger.info(`Aborting generation for conversation ${conv._id}`);
			break;
		}

		// no output check
		if (!output) break;
	}
}
