<script lang="ts">
	import { base } from "$app/paths";
	import { page } from "$app/state";
	import { createEventDispatcher } from "svelte";

	import CarbonCheckmark from "~icons/carbon/checkmark";
	import CarbonTrashCan from "~icons/carbon/trash-can";
	import CarbonClose from "~icons/carbon/close";
	import CarbonEdit from "~icons/carbon/edit";
	import type { ConvSidebar } from "$lib/types/ConvSidebar";

	interface Props {
		conv: ConvSidebar;
		readOnly?: true;
		showDescription?: boolean;
		description?: string;
		searchInput?: string;
	}

	let { conv, readOnly, showDescription, description, searchInput }: Props = $props();

	let confirmDelete = $state(false);

	const dispatch = createEventDispatcher<{
		deleteConversation: string;
		editConversationTitle: { id: string; title: string };
	}>();
</script>

<a
	data-sveltekit-noscroll
	onmouseleave={() => {
		confirmDelete = false;
	}}
	href="{base}/conversation/{conv.id}"
	class="group flex h-10 flex-none items-center gap-1.5 rounded-lg pl-2.5 pr-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700
		{conv.id === page.params.id ? 'bg-gray-100 dark:bg-gray-700' : ''} 
		{showDescription ? 'sm:h-[3.5rem]' : 'sm:h-[2.35rem]'}
	"
>
	<div class="my-2 flex flex-1 flex-col items-start truncate">
		<span>
			{#if confirmDelete}
				<span class="mr-1 font-semibold"> Kustuta </span>
			{/if}
			{#if conv.avatarUrl}
				{#await conv.avatarUrl then avatarUrl}
					{#if avatarUrl}
						<img
							src="{base}{avatarUrl}"
							alt="Assistant avatar"
							class="mr-1.5 inline size-4 flex-none rounded-full object-cover"
						/>
					{/if}
				{/await}
				{conv.title.replace(/\p{Emoji}/gu, "")}
			{:else if conv.assistantId}
				<div
					class="mr-1.5 flex size-4 flex-none items-center justify-center rounded-full bg-gray-300 text-xs font-bold uppercase text-gray-500"
				></div>
				{conv.title.replace(/\p{Emoji}/gu, "")}
			{:else}
				{conv.title}
			{/if}
		</span>
		{#if showDescription && description && searchInput}
			<p class="ml-7 text-sm text-gray-500">
				{#each description.split(searchInput) as segment, i}{segment}{#if i < description.split(searchInput).length - 1}<strong
							>{searchInput}</strong
						>{/if}
				{/each}
			</p>
		{/if}
	</div>

	{#if !readOnly}
		{#if confirmDelete}
			<button
				type="button"
				class="flex h-5 w-5 items-center justify-center rounded md:hidden md:group-hover:flex"
				title="Cancel delete action"
				onclick={(e) => {
					e.preventDefault();
					confirmDelete = false;
				}}
			>
				<CarbonClose class="text-xs text-gray-400 hover:text-gray-500 dark:hover:text-gray-300" />
			</button>
			<button
				type="button"
				class="flex h-5 w-5 items-center justify-center rounded md:hidden md:group-hover:flex"
				title="Confirm delete action"
				onclick={(e) => {
					e.preventDefault();
					confirmDelete = false;
					dispatch("deleteConversation", conv.id.toString());
				}}
			>
				<CarbonCheckmark
					class="text-xs text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
				/>
			</button>
		{:else}
			<button
				type="button"
				class="flex h-5 w-5 items-center justify-center rounded md:hidden md:group-hover:flex"
				title="Edit conversation title"
				onclick={(e) => {
					e.preventDefault();
					const newTitle = prompt("Muuda selle vestluse pealkirja:", conv.title);
					if (!newTitle) return;
					dispatch("editConversationTitle", { id: conv.id.toString(), title: newTitle });
				}}
			>
				<CarbonEdit class="text-xs text-gray-400 hover:text-gray-500 dark:hover:text-gray-300" />
			</button>

			<button
				type="button"
				class="flex h-5 w-5 items-center justify-center rounded md:hidden md:group-hover:flex"
				title="Delete conversation"
				onclick={(event) => {
					event.preventDefault();
					if (event.shiftKey) {
						dispatch("deleteConversation", conv.id.toString());
					} else {
						confirmDelete = true;
					}
				}}
			>
				<CarbonTrashCan
					class="text-xs text-gray-400  hover:text-gray-500 dark:hover:text-gray-300"
				/>
			</button>
		{/if}
	{/if}
</a>
