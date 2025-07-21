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
		user?: { email?: string; name?: string; username?: string } | undefined;
	}

	let { currentModel, user }: Props = $props();

	const dispatch = createEventDispatcher<{ message: string }>();
	let email = $state(user?.email || "");
	let phone = $state("");
	let kordamine = $state("");
	let isSubmitting = $state(false);
	let submitMessage = $state("");
	let submitError = $state("");
	const options = ["1 kord", "2 korda", "3 korda", "4 korda", "5 korda"];

	async function handleSubmit() {
		// Reset messages
		submitMessage = "";
		submitError = "";

		// Validate form
		if (!email || !phone || !kordamine) {
			submitError = "Palun täida kõik väljad";
			return;
		}

		isSubmitting = true;

		try {
			const response = await fetch("/api/waitlist", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email,
					phone,
					repetition: kordamine,
				}),
			});

			const data = await response.json();

			if (response.ok) {
				submitMessage = "Täname! Oled edukalt ootejärjekorda lisatud.";
				// Reset form
				email = "";
				phone = "";
				kordamine = "";
			} else {
				submitError = data.error || "Viga andmete salvestamisel";
			}
		} catch (error) {
			submitError = "Viga andmete saatmisel. Palun proovi uuesti.";
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="my-auto flex flex-col">
	<div class="mb-3 flex flex-col items-center gap-1 text-2xl font-semibold">
		<Logo classNames="mr-1 flex-none size-[46.66px]" />
		<span class="font-nunito text-2xl text-[25.3px] font-[700] text-[#306FC7]"
			>{publicConfig.PUBLIC_APP_NAME}</span
		>
		<!-- <div
				class="ml-3 flex h-6 items-center rounded-lg border border-gray-100 bg-gray-50 px-2 text-base text-gray-400 dark:border-gray-700/60 dark:bg-gray-800"
			>
				v{publicConfig.PUBLIC_VERSION}
			</div> -->
		<p class="text-center font-sans text-[18px] text-[#757575] dark:text-[#575757]">
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
				class="flex max-h-60 flex-col gap-2 overflow-x-auto pb-2 text-center scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 md:flex-row lg:grid lg:grid-cols-3 lg:overflow-y-auto lg:text-left"
			>
				{#each currentModel.promptExamples as example}
					<button
						type="button"
						class="flex-shrink-0 rounded-xl bg-gray-50 p-2.5 text-sm text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 sm:p-3 lg:w-full xl:p-3.5 xl:text-base"
						onclick={() => dispatch("message", example.prompt)}
					>
						{example.title}
					</button>
				{/each}
			</div>
		</div>
	{/if}
	<div class="flex w-full flex-col items-center py-2">
		<div class="mb-3 flex items-center text-2xl font-semibold">
			<span class="font-nunito text-[24px] font-[700] text-[#306FC7]">Tasuta rakendused</span>
		</div>
		<p class="text-center font-sans text-[18px] font-[600] text-[#757575] dark:text-[#575757]">
			Neil kolmel rakendusel on tasuta limiidid, mis lähtestatakse iga kuu ja töötavad suurepäraselt
			eesti keeles.
		</p>
	</div>
	<div class="flex w-full items-center justify-center py-2">
		<div class="flex w-full max-w-[400px] items-center justify-around">
			<div class="flex flex-col items-center gap-1">
				<div class="flex size-[77px] items-center justify-center rounded-full bg-[#508DEF1A]">
					<img
						src="{publicConfig.assetPath}/icons/chatgpt.svg"
						alt="ChatGPT"
						class="size-[37.44px]"
					/>
				</div>
				<div
					class="text-center font-sans text-[18px] font-[600] text-[#757575] dark:text-[#575757]"
				>
					ChatGPT
				</div>
			</div>
			<div class="flex flex-col items-center gap-1">
				<div class="flex size-[77px] items-center justify-center rounded-full bg-[#508DEF1A]">
					<img
						src="{publicConfig.assetPath}/icons/deepseek.svg"
						alt="DeepSeek"
						class="size-[37.44px]"
					/>
				</div>
				<div
					class="text-center font-sans text-[18px] font-[600] text-[#757575] dark:text-[#575757]"
				>
					deepseek
				</div>
			</div>
			<div class="flex flex-col items-center gap-1">
				<div class="flex size-[77px] items-center justify-center rounded-full bg-[#508DEF1A]">
					<img
						src="{publicConfig.assetPath}/icons/gemini.svg"
						alt="Gemini"
						class="size-[37.44px]"
					/>
				</div>
				<div
					class="text-center font-sans text-[18px] font-[600] text-[#757575] dark:text-[#575757]"
				>
					Gemini
				</div>
			</div>
		</div>
	</div>

	<div class="mt-8 flex flex-col rounded-xl bg-white p-4 shadow-md dark:bg-gray-800 dark:shadow-lg">
		<div class="flex flex-col items-center rounded-2xl">
			<h1 class="text-center text-2xl font-bold text-blue-600 dark:text-blue-400">
				Jagatud ChatGPT <br /> PRO Konto
			</h1>
			<p class="w-md text-center font-medium text-gray-600 dark:text-gray-300">
				Sisesta oma andmed ja saa kutse
			</p>
		</div>

		<div class="mt-3 flex flex-col items-center">
			<div class="mx-auto w-full max-w-md space-y-5">
				<!-- Email -->
				<div>
					<label
						class="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-200"
						for="email-input"
					>
						Meil<span class="text-red-500 dark:text-red-400">*</span>
					</label>
					<input
						type="email"
						id="email-input"
						bind:value={email}
						placeholder="nina@email.com"
						class="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:ring-blue-500"
					/>
				</div>

				<!-- Phone -->
				<div>
					<label
						class="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-200"
						for="phone-input"
					>
						Telefoninumber<span class="text-red-500 dark:text-red-400">*</span>
					</label>
					<input
						type="tel"
						id="phone-input"
						bind:value={phone}
						placeholder="324 123 4567"
						class="w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:ring-blue-500"
					/>
				</div>
			</div>

			<p class="mt-4 text-sm font-medium text-gray-600 dark:text-gray-300">
				Annan nöusoleku, et minu e-posti aadressi ja telefoninumbrit kasutatkase, et saata mulle
				meeldetuletusi hääletamise kohta. Millise sagedusega soovid meeldetuletusi saada?
			</p>
			<div class="mx-auto mt-5 w-full max-w-md space-y-6">
				<!-- Dropdown Field -->
				<div>
					<label
						class="mb-1 block text-sm font-semibold text-gray-700 dark:text-gray-200"
						for="kordamine-input"
					>
						kordamine<span class="text-red-500 dark:text-red-400">*</span>
					</label>
					<div class="relative">
						<select
							bind:value={kordamine}
							class="w-full appearance-none rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-blue-500"
							id="kordamine-input"
						>
							<option disabled selected value="">Select</option>
							{#each options as option}
								<option>{option}</option>
							{/each}
						</select>
						<div class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
							<svg
								class="h-4 w-4 text-gray-500 dark:text-gray-400"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								viewBox="0 0 24 24"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
							</svg>
						</div>
					</div>
				</div>

				<!-- Submit Button -->
				<button
					type="button"
					onclick={handleSubmit}
					disabled={isSubmitting}
					class="flex w-full items-center justify-center gap-2 rounded-md bg-[#306FC7] py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700 dark:disabled:opacity-50"
				>
					{isSubmitting ? "Saadan..." : "Esita"}
					<svg
						class="h-5 w-5"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						viewBox="0 0 24 24"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
					</svg>
				</button>

				<!-- Success/Error Messages -->
				{#if submitMessage}
					<div
						class="mt-3 rounded-md border border-green-400 bg-green-100 p-3 text-green-700 dark:border-green-500 dark:bg-green-900/50 dark:text-green-300"
					>
						{submitMessage}
					</div>
				{/if}

				{#if submitError}
					<div
						class="mt-3 rounded-md border border-red-400 bg-red-100 p-3 text-red-700 dark:border-red-500 dark:bg-red-900/50 dark:text-red-300"
					>
						{submitError}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<div class="h-40"></div>
</div>
