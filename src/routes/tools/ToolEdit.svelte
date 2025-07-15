<script lang="ts">
	import {
		ToolOutputComponents,
		type CommunityToolEditable,
		type ToolInput,
	} from "$lib/types/Tool";
	import { createEventDispatcher, onMount } from "svelte";
	import { browser } from "$app/environment";
	import ToolLogo from "$lib/components/ToolLogo.svelte";
	import { colors, icons } from "$lib/utils/tools";
	import { goto } from "$app/navigation";
	import { base } from "$app/paths";
	import ToolInputComponent from "./ToolInputComponent.svelte";
	import { error as errorStore } from "$lib/stores/errors";

	import CarbonInformation from "~icons/carbon/information";
	import { page } from "$app/state";
	import { handleResponse, useAPIClient } from "$lib/APIClient";

	interface Props {
		tool?: CommunityToolEditable | undefined;
		readonly?: boolean;
	}

	let errors = $state<{ field: string; message: string }[]>([]);
	let { tool = undefined, readonly = false }: Props = $props();

	function getError(field: string) {
		return errors.find((error) => error.field === field)?.message ?? "";
	}

	let APIloading = $state(false);
	let formLoading = $state(false);

	const client = useAPIClient();

	const dispatch = createEventDispatcher<{ close: void }>();

	onMount(async () => {
		await updateConfig();
	});

	let spaceUrl = $state(tool?.baseUrl ?? "");

	let editableTool: CommunityToolEditable = $state(
		tool ?? {
			displayName: "",
			description: "",
			// random color & icon for new tools
			color: colors[Math.floor(Math.random() * colors.length)],
			icon: icons[Math.floor(Math.random() * icons.length)],
			baseUrl: "",
			endpoint: "",
			name: "",
			inputs: [],
			outputComponent: null,
			outputComponentIdx: 0,
			showOutput: true,
		}
	);

	$effect(() => {
		editableTool.baseUrl && (spaceUrl = editableTool.baseUrl);
	});

	async function updateConfig() {
		if (!browser || !editableTool.baseUrl || !editableTool.endpoint) {
			return;
		}

		APIloading = true;

		const api = await client["spaces-config"]
			.get({
				query: {
					space: editableTool.baseUrl,
				},
			})
			.then(handleResponse);

		const newInputs = api.named_endpoints[editableTool.endpoint].parameters.map((param, idx) => {
			if (tool?.inputs[idx]?.name === param.parameter_name) {
				// if the tool has the same name, we use the tool's type
				return {
					...tool?.inputs[idx],
				} satisfies ToolInput;
			}

			const type = parseValidInputType(param.python_type.type);

			if (param.parameter_has_default && param.python_type.type !== "filepath") {
				// optional if it has a default
				return {
					name: param.parameter_name,
					description: param.description,
					paramType: "optional" as const,
					default: param.parameter_default,
					...(type === "file" ? { mimeTypes: "*/*", type } : { type }),
				};
			} else {
				// required if it doesn't have a default
				return {
					name: param.parameter_name,
					description: param.description,
					paramType: "required" as const,
					...(type === "file" ? { mimeTypes: "*/*", type } : { type }),
				};
			}
		});

		editableTool.inputs = newInputs;

		// outout components
		const parsedOutputComponent = ToolOutputComponents.safeParse(
			api.named_endpoints[editableTool.endpoint].returns?.[0]?.component ?? null
		);

		if (parsedOutputComponent.success) {
			editableTool.outputComponent = "0;" + parsedOutputComponent.data;
		} else {
			errors = [
				{
					field: "outputComponent",
					message: `Invalid output component. Type ${
						api.named_endpoints[editableTool.endpoint].returns?.[0]?.component
					} is not yet supported. Feel free to report this issue so we can add support for it.`,
				},
			];
			editableTool.outputComponent = null;
		}

		APIloading = false;
	}

	async function onEndpointChange(e: Event) {
		const target = e.target as HTMLInputElement;
		editableTool.endpoint = target.value;
		editableTool.name = target.value.replace(/\//g, "");

		await updateConfig();
	}

	function parseValidInputType(type: string) {
		switch (type) {
			case "str":
			case "int":
			case "float":
			case "bool":
				return type;
			case "filepath":
				return "file" as const;
			default:
				return "str";
		}
	}

	let formSubmittable = $derived(
		editableTool.name && editableTool.baseUrl && editableTool.outputComponent
	);
</script>

<form
	class="relative flex h-full flex-col overflow-y-auto p-4 md:p-8"
	onsubmit={async (e) => {
		e.preventDefault();
		formLoading = true;
		errors = [];

		try {
			const body = JSON.stringify(editableTool);
			let response: Response;

			if (page.params.toolId) {
				response = await fetch(`${base}/api/tools/${page.params.toolId}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body,
				});
			} else {
				response = await fetch(`${base}/api/tools`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body,
				});
			}

			if (response.ok) {
				const { toolId } = await response.json();
				goto(`${base}/tools/${toolId}`, { invalidateAll: true });
			} else if (response.status === 400) {
				const data = await response.json();
				errors = data.errors;
			} else {
				$errorStore = response.statusText;
			}
		} catch (e) {
			$errorStore = (e as Error).message;
		} finally {
			formLoading = false;
		}
	}}
>
	{#if tool}
		<h2 class="text-xl font-semibold">
			{readonly ? "Vaata" : "Muuda"} tööriistu: {tool.displayName}
		</h2>
		{#if !readonly}
			<p class="mb-6 text-sm text-gray-500">
				Muutmine olemasolevat tööriistu levitab muudetud andmeid kõigile kasutajatele.
			</p>
		{/if}
	{:else}
		<h2 class="text-xl font-semibold">Loo uus tööriist</h2>
		<p class="mb-6 text-sm text-gray-500">
			Loo oma tööriistu ja jaga seda. Kõik tööriistad on <span
				class="rounded-full border px-2 py-0.5 leading-none">avalikud</span
			>
		</p>
	{/if}

	<div class="grid h-full w-full flex-1 grid-cols-2 gap-6 text-sm max-sm:grid-cols-1">
		<div class="col-span-1 flex flex-col gap-4">
			<div class="flex flex-col gap-4">
				<label>
					<div class="mb-1 font-semibold">Tööriistu nimi</div>
					<input
						type="text"
						name="displayName"
						disabled={readonly}
						class="w-full rounded-lg border-2 border-gray-200 bg-gray-100 p-2"
						placeholder="Piltide generaator"
						bind:value={editableTool.displayName}
					/>
					<p class="text-xs text-red-500">{getError("displayName")}</p>
				</label>

				<div class="flex flex-row gap-4">
					<div>
						{#key editableTool.color + editableTool.icon}
							<ToolLogo color={editableTool.color} icon={editableTool.icon} />
						{/key}
					</div>

					<label class="flex-grow">
						<div class="mb-1 font-semibold">Ikoon</div>

						<select
							name="icon"
							disabled={readonly}
							class="w-full rounded-lg border-2 border-gray-200 bg-gray-100 p-2"
							bind:value={editableTool.icon}
						>
							{#each icons as icon}
								<option value={icon}>{icon}</option>
							{/each}
						</select>
						<p class="text-xs text-red-500">{getError("icon")}</p>
					</label>

					<label class="flex-grow">
						<div class="mb-1 font-semibold">Värvimisem</div>
						<select
							name="color"
							disabled={readonly}
							class="w-full rounded-lg border-2 border-gray-200 bg-gray-100 p-2"
							bind:value={editableTool.color}
						>
							{#each colors as color}
								<option value={color}>{color}</option>
							{/each}
						</select>
						<p class="text-xs text-red-500">{getError("color")}</p>
					</label>
				</div>

				<label>
					<div class=" font-semibold">Tool Description</div>
					<p class="mb-1 text-sm text-gray-500">
						Selle kirjelduse kasutab mudel, kui tööriistu valib. Kirjelda, mis tööriist teie tööriist
						teeb ja kui seda kasutada.
					</p>
					<textarea
						name="description"
						disabled={readonly}
						class="w-full rounded-lg border-2 border-gray-200 bg-gray-100 p-2"
						placeholder="See tööriist võimaldab teil luua pildi SDXL abil."
						bind:value={editableTool.description}
					></textarea>
					<p class="text-xs text-red-500">{getError("description")}</p>
				</label>

				<label>
					<div class="mb-1 font-semibold">Hugging Face Space URL</div>
					<p class="mb-1 text-sm text-gray-500">
						Speciifitseerige, kust tööriist on hostitud. <a
							href="https://huggingface.co/spaces"
							target="_blank"
							class="underline">Siit leiate trendivahendeid</a
						>.
					</p>
					<input
						type="text"
						name="spaceUrl"
						disabled={readonly}
						class="w-full rounded-lg border-2 border-gray-200 bg-gray-100 p-2"
						placeholder="ByteDance/Hyper-SDXL-1Step-T2I"
						bind:value={editableTool.baseUrl}
					/>
					<p class="text-xs text-red-500">{getError("spaceUrl")}</p>
				</label>
				<p class="text-justify text-gray-800">
					Tööriistad võimaldavad mudelitele kasutada tööriistude kaudu tööriistade kaudu. Tööriistade
					peab kasutama Hugging Face Gradio Spaces, kuna me käsitsi käsitleme sisendit ja väljundit.
					Kasutage ZeroGPU Spaces, kui tööriist on GPU intensiivne.
					<a
						href="https://www.gradio.app/guides/sharing-your-app#api-page"
						class="underline">Gradio API</a
					>
				</p>
			</div>
		</div>
		<div class="col-span-1 flex flex-col gap-4">
			<div class="flex flex-col gap-2">
				<h3 class="mb-1 font-semibold">Funktsioonid</h3>
				{#if editableTool.baseUrl}
					<p class="text-sm text-gray-500">Vali funktsioonid, mida saab tööriistas kasutada.</p>
				{:else}
					<p class="text-sm text-gray-500">Alusta, kui specefiseerige Hugging Face Space URL.</p>
				{/if}

				{#if editableTool.baseUrl}
					{#await client["spaces-config"].get({ query: { space: spaceUrl } }).then(handleResponse)}
						<p class="text-sm text-gray-500">Laadimine...</p>
					{:then api}
						<div class="flex flex-row flex-wrap gap-4">
							{#each Object.keys(api["named_endpoints"] ?? {}) as name}
								<label class="rounded-lg bg-gray-200 p-2">
									<input
										type="radio"
										disabled={readonly}
										oninput={onEndpointChange}
										bind:group={editableTool.endpoint}
										value={name}
										name="endpoint"
									/>
									<span
										class="font-mono text-gray-800"
										class:font-semibold={editableTool.endpoint === name}>{name}</span
									>
								</label>
							{/each}
						</div>

						{#if editableTool.endpoint && api["named_endpoints"][editableTool.endpoint] && !APIloading}
							{@const endpoint = api["named_endpoints"][editableTool.endpoint]}
							<div class="flex flex-col gap-2">
								<div class="flex flex-col gap-2 rounded-lg border border-gray-200 p-2">
									<div class="flex items-center gap-1 border-b border-gray-200 p-1 pb-2">
										<span class="flex-grow font-mono text-smd font-semibold"
											>{editableTool.endpoint}</span
										>

										<label class="ml-auto">
											<span
												class="group relative flex w-max items-center justify-center text-sm font-semibold text-gray-700"
											>
												AI Funktsiooni nimi
												<CarbonInformation class="m-1 align-middle text-xs text-purple-500" />
												<div
													class="pointer-events-none absolute -top-16 right-0 w-max rounded-md bg-gray-100 p-2 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-800"
												>
													<p class="max-w-sm text-sm font-normal text-gray-800 dark:text-gray-200">
														See on funktsiooni nimi, mida mudel kasutab, kui tööriistu valib.
														Kinnitage, et see kirjeldab tööriistu hästi, on lühike ja unikaalne.
													</p>
												</div>
											</span>
											<input
												class="h-fit rounded-lg border-2 border-gray-200 bg-gray-100 p-1"
												type="text"
												name="name"
												disabled={readonly}
												bind:value={editableTool.name}
											/>
										</label>
									</div>

									<div>
										<h3 class="text-lg font-semibold">Parameetrid</h3>
										<p class="mb-2 text-sm text-gray-500">
											Vali parameetrid, mida saab tööriistasse edastada.
										</p>
									</div>

									<p class="text-xs text-red-500">
										{getError("inputs")}
									</p>

									{#each editableTool.inputs as input, inputIdx}
										{@const parameter = endpoint.parameters.find(
											(parameter) => parameter.parameter_name === input.name
										)}

										<div class="flex items-center gap-1">
											<div class="inline w-full">
												<span class="font-mono text-sm">{input.name}</span>
												<span
													class="inline-block max-w-lg truncate rounded-lg bg-orange-50 p-1 text-sm text-orange-800"
													>{parameter?.python_type.type}</span
												>
												{#if parameter?.description}
													<p class="text-sm text-gray-500">
														{parameter.description}
													</p>
												{/if}
												<div class="flex w-fit justify-start gap-2">
													<label class="ml-auto">
														<input
															type="radio"
															name="{input.name}-parameter-type"
															value="required"
															disabled={readonly}
															bind:group={editableTool.inputs[inputIdx].paramType}
														/>
														<span class="text-sm text-gray-500">Nõutav</span>
													</label>
													<label class="ml-auto">
														<input
															type="radio"
															name="{input.name}-parameter-type"
															value="optional"
															disabled={readonly || parameter?.python_type.type === "filepath"}
															bind:group={editableTool.inputs[inputIdx].paramType}
														/>
														<span class="text-sm text-gray-500">Valikuline</span>
													</label>
													<label class="ml-auto">
														<input
															type="radio"
															name="{input.name}-parameter-type"
															value="fixed"
															disabled={readonly || parameter?.python_type.type === "filepath"}
															bind:group={editableTool.inputs[inputIdx].paramType}
														/>
														<span class="text-sm text-gray-500">Fikseeritud</span>
													</label>
												</div>
											</div>
										</div>
										<!-- for required we need a description, for optional we need a default value and for fixed we need a value -->
										{#if input.paramType === "required" || input.paramType === "optional"}
											<label class="flex flex-row gap-2">
												<div class="mb-1 font-semibold">
													Kirjeldus
													<p class="text-xs font-normal text-gray-500">
														Kasutatakse mudeli küsimisel, kui see on tööriistu nõutav.
														Kinnitage, et see kirjeldus on selge ja küllalt lühike.
													</p>
												</div>
												<textarea
													name="{input.name}-description"
													class="w-full rounded-lg border-2 border-gray-200 bg-gray-100 p-2"
													placeholder="See on tööriistu kirjeldus."
													bind:value={input.description}
													disabled={readonly}
												></textarea>
											</label>
										{/if}
										{#if input.paramType === "optional" || input.paramType === "fixed"}
											{@const isOptional = input.paramType === "optional"}
											<div class="flex flex-row gap-2">
												<div class="mb-1 flex-grow font-semibold">
													{isOptional ? "Vaikimisi väärtus" : "Väärtus"}
													<p class="text-xs font-normal text-gray-500">
														{#if isOptional}
															Tööriist kasutab seda väärtust vaikimisi, kuid mudel võib määrata teise.
														{:else}
															Tööriist kasutab seda väärtust ja see ei saa muutuda.
														{/if}
													</p>
												</div>
												{#if input.paramType === "optional"}
													<ToolInputComponent
														type={parameter?.python_type.type ?? "str"}
														disabled={readonly}
														bind:value={input.default}
													/>
												{:else}
													<ToolInputComponent
														type={parameter?.python_type.type ?? "str"}
														disabled={readonly}
														bind:value={input.value}
													/>
												{/if}
											</div>
										{/if}
										{#if input.type === "file"}
											<label class="flex flex-row gap-2">
												<div class="mb-1 font-semibold">
													MIME tüübid
													<p class="text-xs font-normal text-gray-500">
														See sisend on fail. Määrake, millised MIME tüübid on lubatud.
													</p>
												</div>
												<select
													name="{input.name}-mimeTypes"
													class="h-fit w-full rounded-lg border-2 border-gray-200 bg-gray-100 p-2"
													bind:value={input.mimeTypes}
													disabled={readonly}
												>
													<option value="image/*">image/*</option>
													<option value="audio/*">audio/*</option>
													<option value="video/*">video/*</option>
													<option value="application/pdf">application/pdf</option>
													<option value="text/csv">text/csv</option>
													<option value="*/*">*/*</option>
												</select></label
											>
										{/if}
										<!-- divider -->
										<div
											class="flex w-full flex-row flex-nowrap gap-2 border-b border-gray-200 pt-2"
										></div>
									{/each}

									<div class="flex flex-col gap-4">
										<div>
											<h3 class="text-lg font-semibold">Väljundvõimalused</h3>
											<p class="mb-2 text-sm text-gray-500">
												Vali, mis väärtus tööriist tagastab ja kuidas.
											</p>
										</div>

										<label class="flex flex-col gap-2" for="showOutput">
											<div class="mb-1 font-semibold">
												Väljundkomponent
												<p class="text-xs font-normal text-gray-500">
													Vali gradio väljundkomponent, mille väljund kasutatakse tööriistas.
												</p>
											</div>
											{#if editableTool.outputComponent}
												{#if api.named_endpoints[editableTool.endpoint].returns.length > 1}
													<div class="flex flex-row gap-4">
														{#each api.named_endpoints[editableTool.endpoint].returns as { component }, idx}
															<label class="text-gray-800">
																<input
																	type="radio"
																	disabled={readonly ||
																		!ToolOutputComponents.safeParse(component).success}
																	bind:group={editableTool.outputComponent}
																	value={idx + ";" + component.toLowerCase()}
																	name="outputComponent"
																/>
																<span
																	class="font-mono"
																	class:text-gray-400={!ToolOutputComponents.safeParse(component)
																		.success}
																	class:font-semibold={editableTool?.outputComponent?.split(
																		";"
																	)[1] === component}>{component.toLowerCase()}-{idx}</span
																>
															</label>
														{/each}
													</div>
												{:else}
													<div>
														<input disabled checked type="radio" />
														<span class="font-mono text-gray-800"
															>{editableTool.outputComponent.split(";")[1]}</span
														>
													</div>
												{/if}
											{/if}
											<p class="text-xs text-red-500">
												{getError("outputComponent")}
											</p>
										</label>

										<label class="flex flex-row gap-2" for="showOutput">
											<div class="mb-1 font-semibold">
												Kuva väljund kasutajale otse
												<p class="text-xs font-normal text-gray-500">
													Mõned tööriistad tagastavad pika konteksti, mida ei tohiks kasutajale otse näidata.
												</p>
											</div>
											<input
												type="checkbox"
												name="showOutput"
												bind:checked={editableTool.showOutput}
												class="peer rounded-lg border-2 border-gray-200 bg-gray-100 p-1"
											/>
											<p class="text-xs text-red-500">
												{getError("showOutput")}
											</p>
										</label>
									</div>
								</div>
							</div>
						{:else if APIloading}
							<p class="text-sm text-gray-500">Laadimine...</p>
						{:else if !api["named_endpoints"]}
							<p class="font-medium text-red-800">
								Siin tööriistas ei leitud funktsioone. Proovi teist tööriistu.
							</p>
						{/if}
					{:catch rejected}
						<p class="text-sm text-gray-500">{JSON.parse(rejected.message).value}</p>
					{/await}
				{/if}
			</div>
			<div class="relative bottom-0 mb-4 mt-auto flex w-full flex-row justify-end gap-2">
				<button
					type="button"
					class="mt-4 w-fit rounded-full bg-gray-200 px-4 py-2 font-semibold text-gray-700"
					onclick={() => dispatch("close")}
				>
					Loobu
				</button>
				{#if !readonly}
					<button
						type="submit"
						disabled={formLoading || !formSubmittable}
						class="mt-4 w-fit rounded-full bg-black px-4 py-2 font-semibold"
						class:text-white={!formLoading && formSubmittable}
						class:text-gray-300={formLoading || !formSubmittable}
						class:bg-gray-400={formLoading || !formSubmittable}
					>
						{formLoading ? "Salvestamine..." : "Salvesta"}
					</button>
				{/if}
			</div>
		</div>
	</div>
</form>
