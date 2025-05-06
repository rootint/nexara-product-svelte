<script lang="ts">
	import { onMount } from 'svelte';
	import Card from './Card.svelte'; // Adjust path if necessary
	import { ChevronRight } from 'lucide-svelte';
	import * as m from '$lib/paraglide/messages.js'; // Import all message functions as m
    import { languageTag } from '$lib/paraglide/runtime.js';

	let showOnboarding = false;
	let currentStep = 0;

	// Reactive declaration for steps to ensure i18n updates
	$: steps = [
		{
			title: m.onboarding_step1_title(),
			content: m.onboarding_step1_content()
		},
		{
			title: m.onboarding_step2_title(),
			content: m.onboarding_step2_content()
		},
		{
			title: m.onboarding_step3_title(),
			content: m.onboarding_step3_content()
		},
		{
			title: m.onboarding_step4_title(),
			content: m.onboarding_step4_content()
		}
	];

	onMount(() => {
		const hasCompleted = localStorage.getItem('hasCompletedOnboarding');
		if (hasCompleted !== 'true') {
			showOnboarding = true;
		}
	});

	function nextStep() {
		if (currentStep < steps.length - 1) {
			currentStep++;
		} else {
			completeOnboarding();
		}
	}

	function prevStep() {
		if (currentStep > 0) {
			currentStep--;
		}
	}

	function completeOnboarding() {
		localStorage.setItem('hasCompletedOnboarding', 'true');
		showOnboarding = false;
	}
</script>

{#if showOnboarding}
	<div class="overlay">
		<Card>
			<h2>{steps[currentStep].title}</h2>
			<p>{steps[currentStep].content}</p>
			{#if currentStep === steps.length - 1}
				<a
					href={languageTag() === 'ru'
						? 'https://t.me/RND_RandoM'
						: 'https://discord.gg/wuj8dwQKrv'}>{m.onboarding_discord_link()}</a
				>
			{/if}
			<div class="navigation">
				{#if currentStep > 0}
					<button on:click={prevStep}>{m.onboarding_button_previous()}</button>
				{/if}
				<button on:click={nextStep}>
					{#if currentStep < steps.length - 1}
						{m.onboarding_button_next()}
						<ChevronRight color="#111" size={20} />
					{:else}
						{m.onboarding_button_start()}
					{/if}
				</button>
			</div>
			<div class="step-indicator">
				{m.onboarding_step_indicator({ currentStep: currentStep + 1, totalSteps: steps.length })}
			</div>
		</Card>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.7); /* Darkened background */
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000; /* Ensure it's on top */
	}

	h2 {
		font-size: 24px;
		margin-top: 0;
		margin-bottom: 16px;
	}

	p {
		margin-bottom: 0px;
		line-height: 140%;
	}

	.navigation {
		width: 100%;
		display: flex;
		justify-content: flex-end; /* Align buttons to the right */
		gap: 12px; /* Space between buttons */
		margin-top: 24px;
	}

	.step-indicator {
		margin-top: 16px;
		text-align: center;
		font-size: 0.9em;
		color: #666;
	}

	button {
		padding: 12px 16px;
		border-radius: 12px;
		font-size: 16px;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 4px;
	}

	button:last-child {
		/* Style the primary action button */
		background-color: #fafafa; /* Example primary color */
		color: #111;
		font-weight: 450;
	}

	button:first-child:not(:last-child) {
		/* Style the secondary/previous button */
		background-color: rgb(250, 250, 250, 0.05);
		font-size: 16px;
		border: 1px solid rgba(250, 250, 250, 0.11);
		color: #fafafa;
	}

	button:hover {
		opacity: 0.9;
	}
</style>
