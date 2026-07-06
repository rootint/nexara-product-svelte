<script>
	import { dashboardStore } from '$lib/stores/dashboard';
	import * as m from '$lib/paraglide/messages.js';

	let code = '';
	let isSubmitting = false;
	let errorMessage = '';
	let successMessage = '';
	let redeemed = false;

	$: isButtonDisabled = isSubmitting || redeemed || code.trim() === '';

	// Format the credited amount with its currency (matches the balance card).
	function formatAmount(amount, currency) {
		if (currency === 'EUR') {
			return `€${amount.toLocaleString('en-GB', {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			})}`;
		}
		return `${amount.toLocaleString('ru-RU', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		})} ₽`;
	}

	async function handleApply() {
		if (isButtonDisabled) return;

		isSubmitting = true;
		errorMessage = '';
		successMessage = '';

		try {
			const result = await dashboardStore.applyPromocode(code.trim());
			successMessage = m.promocode_success({
				amount: formatAmount(result.amount, result.currency)
			});
			// A 200 means the balance was already credited — submitting is the
			// redemption, so lock the form to avoid a pointless second try (409).
			redeemed = true;
			code = '';
		} catch (error) {
			errorMessage = error?.message || m.promocode_invalid_input();
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="card referral-card">
	<p class="card-title">{m.promocode_title()}</p>
	<p>{m.promocode_body()}</p>
	<form on:submit|preventDefault={handleApply} class="promo-form">
		<input
			type="text"
			bind:value={code}
			placeholder={m.promocode_placeholder()}
			disabled={redeemed || isSubmitting}
			on:input={() => {
				errorMessage = '';
			}}
		/>
		<button type="submit" class="apply-btn {isButtonDisabled ? 'disabled' : ''}">
			<p class="apply-btn-text">{m.promocode_button()}</p>
		</button>
	</form>
	{#if errorMessage}
		<p class="promo-error">{errorMessage}</p>
	{/if}
	{#if successMessage}
		<p class="promo-success">{successMessage}</p>
	{/if}
</div>

<style>
	.card {
		background-color: rgba(250, 250, 250, 0.01);
		backdrop-filter: blur(16px);
		border-radius: 12px;
		padding: 24px;
		display: flex;
		flex-direction: column;
	}

	.card-title {
		color: rgba(250, 250, 250, 0.5) !important;
		margin-bottom: 24px;
	}

	.referral-card p {
		color: rgba(250, 250, 250, 1);
	}

	.promo-form {
		width: 100%;
		display: flex;
		gap: 24px;
		margin-top: 24px;
	}

	.promo-form input {
		border: 1px solid rgba(250, 250, 250, 0.11);
		border-radius: 12px;
		padding: 16px 24px;
		background-color: rgba(250, 250, 250, 0.03);
		font-size: 16px;
		outline: none;
		flex-grow: 1;
		min-width: 0;
	}

	.promo-form input:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.apply-btn {
		border-radius: 12px;
		padding: 16px 24px;
		background-color: rgb(250, 250, 250);
		font-size: 16px;
		cursor: pointer;
		outline: none;
		min-width: 0;
		border: none;
		flex-shrink: 0;
	}

	.apply-btn.disabled {
		background-color: rgba(250, 250, 250, 0.2);
		cursor: not-allowed;
	}

	.apply-btn-text {
		color: #111 !important;
		font-size: 16px;
		font-weight: 500;
	}

	.promo-error {
		margin-top: 12px;
		font-size: 14px;
		color: #ff6b6b !important;
	}

	.promo-success {
		margin-top: 12px;
		font-size: 14px;
		color: #4caf82 !important;
	}
</style>
