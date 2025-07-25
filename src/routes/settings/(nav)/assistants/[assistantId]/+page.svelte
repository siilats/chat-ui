<script lang="ts">
	import { enhance } from "$app/forms";
	import { base } from "$app/paths";
	import { page } from "$app/state";
	import { goto, invalidateAll } from "$app/navigation";

	import { useSettingsStore } from "$lib/stores/settings";
	import type { PageData } from "./$types";

	import CarbonPen from "~icons/carbon/pen";
	import CarbonTrash from "~icons/carbon/trash-can";
	import CarbonCopy from "~icons/carbon/copy-file";
	import CarbonFlag from "~icons/carbon/flag";
	import CarbonLink from "~icons/carbon/link";
	import CarbonChat from "~icons/carbon/chat";
	import CarbonStar from "~icons/carbon/star";
	import CarbonTools from "~icons/carbon/tools";
	import CarbonLock from "~icons/carbon/locked";

	import CopyToClipBoardBtn from "$lib/components/CopyToClipBoardBtn.svelte";
	import ReportModal from "./ReportModal.svelte";
	import IconInternet from "$lib/components/icons/IconInternet.svelte";
	import ToolBadge from "$lib/components/ToolBadge.svelte";
	import { ReviewStatus } from "$lib/types/Review";
	import { error } from "$lib/stores/errors";
	import { usePublicConfig } from "$lib/utils/PublicConfig.svelte";

	const publicConfig = usePublicConfig();

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let assistant = $derived(
		data.assistants.find((el) => el._id.toString() === page.params.assistantId)
	);

	const settings = useSettingsStore();

	const prefix =
		publicConfig.PUBLIC_SHARE_PREFIX || `${publicConfig.PUBLIC_ORIGIN || page.url.origin}${base}`;

	let shareUrl = $derived(`${prefix}/assistant/${assistant?._id}`);

	let displayReportModal = $state(false);

	let hasRag = $derived(
		assistant?.rag?.allowAllDomains ||
			!!assistant?.rag?.allowedDomains?.length ||
			!!assistant?.rag?.allowedLinks?.length ||
			!!assistant?.dynamicPrompt
	);

	let prepromptTags = $derived(assistant?.preprompt?.split(/(\{\{[^{}]*\}\})/) ?? []);

	function setFeatured(status: ReviewStatus) {
		fetch(`${base}/api/assistant/${assistant?._id}/review`, {
			method: "PATCH",
			body: JSON.stringify({ status }),
		}).then((r) => {
			if (r.ok) {
				invalidateAll();
			} else {
				console.error(r);
				$error = r.statusText;
			}
		});
	}
</script>

{#if displayReportModal}
	<ReportModal
		on:close={() => (displayReportModal = false)}
		reportUrl={`${base}/api/assistant/${assistant?._id}/report`}
	/>
{/if}
<div class="flex h-full flex-col gap-2">
	<div class="flex flex-col sm:flex-row sm:gap-6">
		<div class="mb-4 flex justify-center sm:mb-0">
			{#if assistant?.avatar}
				<img
					src={`${base}/settings/assistants/${assistant?._id}/avatar.jpg?hash=${assistant?.avatar}`}
					alt="Avatar"
					class="size-16 flex-none rounded-full object-cover sm:size-24"
				/>
			{:else}
				<div
					class="flex size-16 flex-none items-center justify-center rounded-full bg-gray-300 text-4xl font-semibold uppercase text-gray-500 sm:size-24"
				>
					{assistant?.name[0]}
				</div>
			{/if}
		</div>

		<div class="flex-1">
			<div class="flex flex-wrap items-center gap-2">
				<h1 class="break-words text-xl font-semibold">
					{assistant?.name}
				</h1>

				{#if hasRag}
					<span
						class="inline-grid size-5 place-items-center rounded-full bg-blue-500/10"
						title="This assistant uses the websearch."
					>
						<IconInternet classNames="text-sm text-blue-600" />
					</span>
				{/if}
				<span class="rounded-full border px-2 py-0.5 text-sm leading-none text-gray-500"
					>public</span
				>
			</div>

			{#if assistant?.description}
				<p class="mb-2 line-clamp-2 text-sm text-gray-500">
					{assistant.description}
				</p>
			{/if}

			<p class="text-sm text-gray-500">
				Model: <span class="font-semibold"> {assistant?.modelId} </span>
				<span class="text-gray-300">•</span> Created by
				<a class="underline" href="{base}/assistants?user={assistant?.createdByName}">
					{assistant?.createdByName}
				</a>
			</p>
			<div
				class="flex flex-wrap items-center gap-x-4 gap-y-2 whitespace-nowrap text-sm text-gray-500 hover:*:text-gray-800 max-sm:justify-center"
			>
				<div class="w-full sm:w-auto">
					<button
						class="mx-auto my-2 flex w-min items-center justify-center rounded-full bg-black px-3 py-1 text-base !text-white"
						name="Activate model"
						onclick={(e) => {
							e.stopPropagation();
							settings.instantSet({
								activeModel: page.params.assistantId,
							});
							goto(`${base}/`);
						}}
					>
						<CarbonChat class="mr-1.5 text-sm" />
						Uus Vestlus
					</button>
				</div>
				{#if assistant?.createdByMe}
					<a href="{base}/settings/assistants/{assistant?._id}/edit" class="underline"
						><CarbonPen class="mr-1.5 inline text-xs" />Edit
					</a>
					<form
						onsubmit={() => {
							fetch(`${base}/api/assistant/${assistant?._id}`, {
								method: "DELETE",
							}).then((r) => {
								if (r.ok) {
									goto(`${base}/settings/assistants`, { invalidateAll: true });
								} else {
									console.error(r);
									$error = r.statusText;
								}
							});
						}}
					>
						<button
							type="submit"
							class="flex items-center underline"
							onclick={(event) => {
								if (!confirm("Are you sure you want to delete this assistant?")) {
									event.preventDefault();
								}
							}}
						>
							<CarbonTrash class="mr-1.5 inline text-xs" />Delete
						</button>
					</form>
				{:else}
					<form
						onsubmit={() => {
							fetch(`${base}/api/assistant/${assistant?._id}/subscribe`, {
								method: "DELETE",
							}).then((r) => {
								if (r.ok) {
									goto(`${base}/settings/assistants`, { invalidateAll: true });
								} else {
									console.error(r);
									$error = r.statusText;
								}
							});
						}}
					>
						<button type="submit" class="underline">
							<CarbonTrash class="mr-1.5 inline text-xs" />Remove</button
						>
					</form>
					<form method="POST" action="?/edit" use:enhance class="hidden">
						<button type="submit" class="underline">
							<CarbonCopy class="mr-1.5 inline text-xs" />Duplicate</button
						>
					</form>
					{#if !assistant?.reported}
						<button
							type="button"
							onclick={() => {
								displayReportModal = true;
							}}
							class="underline"
						>
							<CarbonFlag class="mr-1.5 inline text-xs" />Report
						</button>
					{:else}
						<button type="button" disabled class="text-gray-700">
							<CarbonFlag class="mr-1.5 inline text-xs" />Reported</button
						>
					{/if}
				{/if}
				{#if data?.isAdmin}
					<span class="rounded-full border px-2 py-0.5 text-sm leading-none text-gray-500"
						>{assistant?.review?.toLocaleUpperCase()}</span
					>

					{#if !assistant?.createdByMe}
						<form
							onsubmit={() => {
								fetch(`${base}/api/assistant/${assistant?._id}`, {
									method: "DELETE",
								}).then((r) => {
									if (r.ok) {
										goto(`${base}/settings/assistants`, { invalidateAll: true });
									} else {
										console.error(r);
										$error = r.statusText;
									}
								});
							}}
						>
							<button
								type="submit"
								class="flex items-center text-red-600 underline"
								onclick={(event) => {
									if (!confirm("Are you sure you want to delete this assistant?")) {
										event.preventDefault();
									}
								}}
							>
								<CarbonTrash class="mr-1.5 inline text-xs" />Delete
							</button>
						</form>
					{/if}
					{#if assistant?.review === ReviewStatus.PRIVATE}
						<form onsubmit={() => setFeatured(ReviewStatus.APPROVED)}>
							<button type="submit" class="flex items-center text-green-600 underline">
								<CarbonStar class="mr-1.5 inline text-xs" />Force feature</button
							>
						</form>
					{/if}
					{#if assistant?.review === ReviewStatus.PENDING}
						<form onsubmit={() => setFeatured(ReviewStatus.APPROVED)}>
							<button type="submit" class="flex items-center text-green-600 underline">
								<CarbonStar class="mr-1.5 inline text-xs" />Approve</button
							>
						</form>
						<form onsubmit={() => setFeatured(ReviewStatus.DENIED)}>
							<button type="submit" class="flex items-center text-red-600">
								<span class="mr-1.5 font-light no-underline">X</span>
								<span class="underline">Deny</span>
							</button>
						</form>
					{/if}
					{#if assistant?.review === ReviewStatus.APPROVED || assistant?.review === ReviewStatus.DENIED}
						<form onsubmit={() => setFeatured(ReviewStatus.PRIVATE)}>
							<button type="submit" class="flex items-center text-red-600 underline">
								<CarbonLock class="mr-1.5 inline text-xs " />Reset review</button
							>
						</form>
					{/if}
				{/if}
				{#if assistant?.createdByMe && assistant?.review === ReviewStatus.PRIVATE}
					<form
						onsubmit={() => {
							const confirmed = confirm(
								"Are you sure you want to request this assistant to be featured? Make sure you have tried the assistant and that it works as expected. "
							);

							if (!confirmed) {
								return;
							}

							setFeatured(ReviewStatus.PENDING);
						}}
					>
						<button type="submit" class="flex items-center underline">
							<CarbonStar class="mr-1.5 inline text-xs" />Request to be featured</button
						>
					</form>
				{/if}
			</div>
		</div>
	</div>

	<div>
		<h2 class="text-lg font-semibold">Direct URL</h2>

		<p class="pb-2 text-sm text-gray-500">Share this link for people to use your assistant.</p>

		<div
			class="flex flex-row gap-2 rounded-lg border-2 border-gray-200 bg-gray-100 py-2 pl-3 pr-1.5"
		>
			<input disabled class="flex-1 truncate bg-inherit" value={shareUrl} />
			<CopyToClipBoardBtn
				value={shareUrl}
				classNames="!border-none !shadow-none !py-0 !px-1 !rounded-md"
			>
				<div class="flex items-center gap-1.5 text-gray-500 hover:underline">
					<CarbonLink />Copy
				</div>
			</CopyToClipBoardBtn>
		</div>
	</div>

	<!-- two columns for big screen, single column for small screen -->
	<div class="mb-12 mt-3">
		<h2 class="mb-2 inline font-semibold">System Instructions</h2>
		<div
			id="System Instructions"
			class="overlow-y-auto mt-2 box-border h-fit max-h-[240px] w-full overflow-y-auto whitespace-pre-line rounded-lg border-2 border-gray-200 bg-gray-100 p-2 disabled:cursor-not-allowed 2xl:max-h-[310px]"
		>
			{#if assistant?.dynamicPrompt}
				{#each prepromptTags as tag}
					{#if (tag.startsWith("{{") && tag.endsWith("}}") && (tag.includes("get=") || tag.includes("post=") || tag.includes("url="))) || tag.includes("today")}
						{@const url = tag.match(/(?:get|post|url)=(.*?)}}/)?.[1] ?? ""}
						<a
							target="_blank"
							href={url.startsWith("http") ? url : `//${url}`}
							class="break-words rounded-lg bg-blue-100 px-1 py-0.5 text-blue-800 hover:underline"
						>
							{tag}</a
						>
					{:else}
						{tag}
					{/if}
				{/each}
			{:else}
				{assistant?.preprompt}
			{/if}
		</div>

		{#if assistant?.tools?.length}
			<div class="mt-4">
				<div class="mb-1 flex items-center gap-1">
					<span
						class="inline-grid size-5 place-items-center rounded-full bg-purple-500/10"
						title="This assistant uses the websearch."
					>
						<CarbonTools class="text-xs text-purple-600" />
					</span>
					<h2 class="font-semibold">Tools</h2>
				</div>
				<p class="w-full text-sm text-gray-500">
					This Assistant has access to the following tools:
				</p>
				<ul class="mr-2 mt-2 flex flex-wrap gap-2.5 text-sm text-gray-800">
					{#each assistant.tools as tool}
						<ToolBadge toolId={tool} />
					{/each}
				</ul>
			</div>
		{/if}
		{#if hasRag}
			<div class="mt-4">
				<div class="mb-1 flex items-center gap-1">
					<span
						class="inline-grid size-5 place-items-center rounded-full bg-blue-500/10"
						title="This assistant uses the websearch."
					>
						<IconInternet classNames="text-sm text-blue-600" />
					</span>
					<h2 class=" font-semibold">Internet Access</h2>
				</div>
				{#if assistant?.rag?.allowAllDomains}
					<p class="text-sm text-gray-500">
						This Assistant uses Web Search to find information on Internet.
					</p>
				{:else if !!assistant?.rag?.allowedDomains && assistant?.rag?.allowedDomains.length}
					<p class="pb-4 text-sm text-gray-500">
						This Assistant can use Web Search on the following domains:
					</p>
					<ul class="mr-2 flex flex-wrap gap-2.5 text-sm text-gray-800">
						{#each assistant?.rag?.allowedDomains as domain}
							<li
								class="break-all rounded-lg border border-gray-200 bg-gray-100 px-2 py-0.5 leading-tight decoration-gray-400"
							>
								<a target="_blank" class="underline" href={domain}>{domain}</a>
							</li>
						{/each}
					</ul>
				{:else if !!assistant?.rag?.allowedLinks && assistant?.rag?.allowedLinks.length}
					<p class="pb-4 text-sm text-gray-500">This Assistant can browse the following links:</p>
					<ul class="mr-2 flex flex-wrap gap-2.5 text-sm text-gray-800">
						{#each assistant?.rag?.allowedLinks as link}
							<li
								class="break-all rounded-lg border border-gray-200 bg-gray-100 px-2 py-0.5 leading-tight decoration-gray-400"
							>
								<a target="_blank" class="underline" href={link}>{link}</a>
							</li>
						{/each}
					</ul>
				{/if}
				{#if assistant?.dynamicPrompt}
					<p class="text-sm text-gray-500">
						This Assistant has dynamic prompts enabled and can make requests to external services.
					</p>
				{/if}
			</div>
		{/if}
	</div>
</div>
