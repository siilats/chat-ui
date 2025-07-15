<script lang="ts">
	import CarbonTrashCan from "~icons/carbon/trash-can";
	import CarbonArrowUpRight from "~icons/carbon/arrow-up-right";

	import { useSettingsStore } from "$lib/stores/settings";
	import Switch from "$lib/components/Switch.svelte";

	import { goto } from "$app/navigation";
	import { error } from "$lib/stores/errors";
	import { base } from "$app/paths";
	import { page } from "$app/state";
	import { usePublicConfig } from "$lib/utils/PublicConfig.svelte";
	import { useAPIClient } from "$lib/APIClient";

	const publicConfig = usePublicConfig();
	let settings = useSettingsStore();

	const client = useAPIClient();
</script>

<div class="flex w-full flex-col gap-5">
	<h2 class="text-center text-xl font-semibold text-gray-800 md:text-left">Rakenduse seaded</h2>
	{#if !!publicConfig.PUBLIC_COMMIT_SHA}
		<div class="flex flex-col items-start justify-between text-xl font-semibold text-gray-800">
			<a
				href={`https://github.com/huggingface/chat-ui/commit/${publicConfig.PUBLIC_COMMIT_SHA}`}
				target="_blank"
				rel="noreferrer"
				class="text-sm font-light text-gray-500"
			>
				Viimane juurutamine <span class="gap-2 font-mono"
					>{publicConfig.PUBLIC_COMMIT_SHA.slice(0, 7)}</span
				>
			</a>
		</div>
	{/if}
	{#if page.data.isAdmin}
		<p class="text-red-500">Sa oled administraator.</p>
	{/if}
	<div class="flex h-full max-w-2xl flex-col gap-2 max-sm:pt-0">
		{#if publicConfig.PUBLIC_APP_DATA_SHARING === "1"}
			<label class="flex items-center">
				<Switch
					name="shareConversationsWithModelAuthors"
					bind:checked={$settings.shareConversationsWithModelAuthors}
				/>
				<div class="inline cursor-pointer select-none items-center gap-2 pl-2">
					Jaga vestlusi mudeli autoritega
				</div>
			</label>

			<p class="text-sm text-gray-500">
				Andmete jagamine aitab parandada treeningandmeid ja muuta avatud mudeleid aja jooksul
				paremaks.
			</p>
		{/if}
		<label class="mt-6 flex items-center">
			<Switch name="hideEmojiOnSidebar" bind:checked={$settings.hideEmojiOnSidebar} />
			<div class="inline cursor-pointer select-none items-center gap-2 pl-2 font-semibold">
				Peida emotikoonid vestluse teemades
				<p class="text-sm font-normal text-gray-500">
					Emotikoonid on vaikimisi näha vasakul, lubage see, et need oleksid peidetud.
				</p>
			</div>
		</label>

		<label class="mt-6 flex items-center">
			<Switch name="disableStream" bind:checked={$settings.disableStream} />
			<div class="inline cursor-pointer select-none items-center gap-2 pl-2 font-semibold">
				Keelata streamimine
			</div>
		</label>

		<label class="mt-6 flex items-center">
			<Switch name="directPaste" bind:checked={$settings.directPaste} />
			<div class="inline cursor-pointer select-none items-center gap-2 pl-2 font-semibold">
				Paste teksti otse vestlusse
				<p class="text-sm font-normal text-gray-500">
					Vaikimisi, kui kopeeritakse pikka teksti, käsitletakse seda lihttekstina. Lubage see, et
					teksit kopeeritakse otse vestlusse.
				</p>
			</div>
		</label>

		<div class="mt-12 flex flex-col gap-3">
			<a
				href="https://huggingface.co/spaces/huggingchat/chat-ui/discussions"
				target="_blank"
				rel="noreferrer"
				class="flex items-center underline decoration-gray-300 underline-offset-2 hover:decoration-gray-700"
				><CarbonArrowUpRight class="mr-1.5 shrink-0 text-sm " /> Jaga oma tagasisidet HuggingChat</a
			>
			{#if publicConfig.isHuggingChat}
				<a
					href="{base}/privacy"
					class="flex items-center underline decoration-gray-300 underline-offset-2 hover:decoration-gray-700"
					><CarbonArrowUpRight class="mr-1.5 shrink-0 text-sm " /> Teave ja privaatsus </a
				>
			{/if}
			<button
				onclick={async (e) => {
					e.preventDefault();

					confirm("Kas oled kindel, et soovid kõiki vestlusid kustutada?") &&
						client.conversations
							.delete()
							.then(async () => {
								await goto(`${base}/`, { invalidateAll: true });
							})
							.catch((err) => {
								console.error(err);
								$error = err.message;
							});
				}}
				type="submit"
				class="flex items-center underline decoration-gray-300 underline-offset-2 hover:decoration-gray-700"
				><CarbonTrashCan class="mr-2 inline text-sm text-red-500" />Kustuta kõik vestlused</button
			>
		</div>
	</div>
</div>
