<script lang="ts">
	import Logo from "$lib/components/icons/Logo.svelte";
	import { createEventDispatcher } from "svelte";
	import IconGear from "~icons/bi/gear-fill";
	import AnnouncementBanner from "../AnnouncementBanner.svelte";
	import type { Model } from "$lib/types/Model";
	import ModelCardMetadata from "../ModelCardMetadata.svelte";
	import { base } from "$app/paths";
	import JSON5 from "json5";
	import { usePublicConfig } from "$lib/utils/PublicConfig.svelte";

	const publicConfig = usePublicConfig();

	interface Props {
		currentModel: Model;
	}

	let { currentModel }: Props = $props();

	const dispatch = createEventDispatcher<{ message: string }>();
</script>

<div class="my-auto flex flex-col">
		<div class="mb-3 flex flex-col gap-1 items-center text-2xl font-semibold">
			<Logo classNames="mr-1 flex-none size-[46.66px]" />
			<span class="text-2xl font-[700] text-[#306FC7] text-[25.3px] font-nunito">{publicConfig.PUBLIC_APP_NAME}</span>
			<!-- <div
				class="ml-3 flex h-6 items-center rounded-lg border border-gray-100 bg-gray-50 px-2 text-base text-gray-400 dark:border-gray-700/60 dark:bg-gray-800"
			>
				v{publicConfig.PUBLIC_VERSION}
			</div> -->
			<p class="text-[18px] font-sans text-center text-[#757575] dark:text-[#575757]">
				{publicConfig.PUBLIC_APP_DESCRIPTION ||
					"Making the community's best AI chat models available to everyone."}
			</p>
		</div>
	<div class="lg:col-span-2 lg:pl-24">
		{#each JSON5.parse(publicConfig.PUBLIC_ANNOUNCEMENT_BANNERS || "[]") as banner}
			<AnnouncementBanner classNames="mb-4" title={banner.title}>
				<a
					target={banner.external ? "_blank" : "_self"}
					href={banner.linkHref}
					class="mr-2 flex items-center underline hover:no-underline">{banner.linkTitle}</a
				>
			</AnnouncementBanner>
		{/each}
		<!-- <div class="overflow-hidden rounded-xl border dark:border-gray-800">
			<div class="flex p-3">
				<div>
					<div class="text-sm text-gray-600 dark:text-gray-400">Praegune mudel</div>
					<div class="flex items-center gap-1.5 font-semibold max-sm:text-smd">
						{#if currentModel.logoUrl}
							<img
								class=" overflown aspect-square size-4 rounded border dark:border-gray-700"
								src={currentModel.logoUrl}
								alt=""
							/>
						{:else}
							<div
								class="size-4 rounded border border-transparent bg-gray-300 dark:bg-gray-800"
							></div>
						{/if}
						{currentModel.displayName}
					</div>
				</div>
				<a
					href="{base}/settings/{currentModel.id}"
					aria-label="Settings"
					class="btn ml-auto flex h-7 w-7 self-start rounded-full bg-gray-100 p-1 text-xs hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-600"
					><IconGear /></a
				>
			</div>
			<ModelCardMetadata variant="dark" model={currentModel} />
		</div> -->
	</div>
	{#if currentModel.promptExamples}
		<div class="lg:col-span-3 lg:mt-6">
			<div
				class="flex flex-col md:flex-row max-h-60 gap-2 overflow-x-auto pb-2 text-center scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 lg:grid lg:grid-cols-3 lg:overflow-y-auto lg:text-left"
			>
				{#each currentModel.promptExamples as example}
					<button
						type="button"
						class="flex-shrink-0 rounded-xl bg-gray-50 p-2.5 text-sm text-gray-600 hover:bg-gray-100  dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 sm:p-3 lg:w-full xl:p-3.5 xl:text-base"
						onclick={() => dispatch("message", example.prompt)}
					>
						{example.title}
					</button>
				{/each}
			</div>
		</div>
	{/if}
	<div class="flex flex-col items-center w-full py-2">
		<div class="mb-3 flex items-center text-2xl font-semibold">
			<span class="text-[24px] font-[700] text-[#306FC7] font-nunito">Tasuta rakendused</span>
		</div>
		<p class="text-[18px] font-sans text-center font-[600] text-[#757575] dark:text-[#575757]">
			Neil kolmel rakendusel on tasuta limiidid, mis lähtestatakse iga kuu ja töötavad suurepäraselt eesti keeles.
		</p>
	</div>
	<div class="w-full flex items-center justify-center py-2">
		<div class="w-full max-w-[400px] flex items-center justify-around">
			<div class="flex flex-col items-center gap-1">
				<div class="size-[77px] rounded-full bg-[#508DEF1A] flex items-center justify-center">
					<img src="{publicConfig.assetPath}/icons/chatgpt.svg" alt="ChatGPT" class="size-[37.44px]">
				</div>
				<div class="text-[18px] font-sans text-center font-[600] text-[#757575] dark:text-[#575757]">
					ChatGPT
				</div>
			</div>
			<div class="flex flex-col items-center gap-1">
				<div class="size-[77px] rounded-full bg-[#508DEF1A] flex items-center justify-center">
					<img src="{publicConfig.assetPath}/icons/deepseek.svg" alt="DeepSeek" class="size-[37.44px]">
				</div>
				<div class="text-[18px] font-sans text-center font-[600] text-[#757575] dark:text-[#575757]">
					deepseek
				</div>
			</div>
			<div class="flex flex-col items-center gap-1">
				<div class="size-[77px] rounded-full bg-[#508DEF1A] flex items-center justify-center">
					<img src="{publicConfig.assetPath}/icons/gemini.svg" alt="Gemini" class="size-[37.44px]">
				</div>
				<div class="text-[18px] font-sans text-center font-[600] text-[#757575] dark:text-[#575757]">
					Gemini
				</div>
			</div>
		</div>
	</div>
	<div class="h-40 sm:h-24"></div>
</div>
