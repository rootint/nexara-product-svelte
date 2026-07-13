<script>
	import { onMount } from 'svelte';
	import { dashboardStore } from '$lib/stores/dashboard';
	import * as m from '$lib/paraglide/messages.js';
	import { languageTag } from '$lib/paraglide/runtime.js';
	import { Copy, Check } from 'lucide-svelte';

	const PAGE_SIZE = 50;

	let items = [];
	let cursor = null; // next_cursor from the last response
	let hasMore = false;
	let currency = null;

	let isLoading = true; // first page
	let isLoadingMore = false; // subsequent pages
	let error = null;
	let copiedId = null;

	$: locale = languageTag() === 'ru' ? 'ru-RU' : 'en-GB';
	// Render timestamps in the viewer's own timezone.
	const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

	async function loadFirstPage() {
		isLoading = true;
		error = null;
		try {
			const data = await dashboardStore.getUsage({ limit: PAGE_SIZE });
			items = data.items ?? [];
			cursor = data.next_cursor ?? null;
			hasMore = Boolean(data.has_more);
			currency = data.currency ?? null;
		} catch (err) {
			error = err.message;
		} finally {
			isLoading = false;
		}
	}

	async function loadMore() {
		if (isLoadingMore || !hasMore || cursor == null) return;
		isLoadingMore = true;
		error = null;
		try {
			const data = await dashboardStore.getUsage({ limit: PAGE_SIZE, cursor });
			items = [...items, ...(data.items ?? [])];
			cursor = data.next_cursor ?? null;
			hasMore = Boolean(data.has_more);
			// currency is fixed per user; keep the first non-null we saw.
			if (currency == null) currency = data.currency ?? null;
		} catch (err) {
			error = err.message;
		} finally {
			isLoadingMore = false;
		}
	}

	onMount(loadFirstPage);

	// --- formatting helpers ---

	function formatTime(iso) {
		if (!iso) return '—';
		const d = new Date(iso);
		if (isNaN(d.getTime())) return '—';
		return d.toLocaleString(locale, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			timeZone: userTimeZone
		});
	}

	function formatDuration(seconds) {
		if (seconds == null) return '—';
		if (seconds < 60) return `${seconds.toFixed(1)} s`;
		const mins = Math.floor(seconds / 60);
		const secs = Math.round(seconds % 60);
		return `${mins} m ${secs} s`;
	}

	function formatBytes(bytes) {
		if (bytes == null) return '—';
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	}

	function formatCost(cost) {
		// null cost is legit for legacy rows — render em dash, never 0.
		if (cost == null) return '—';
		const formatted = cost.toLocaleString(currency === 'RUB' ? 'ru-RU' : 'en-GB', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 4
		});
		if (currency === 'RUB') return `${formatted} ₽`;
		if (currency === 'EUR') return `€${formatted}`;
		return formatted; // currency null → show the number bare
	}

	function formatLanguage(language) {
		return language ? language.toUpperCase() : '—';
	}

	function formatProfanityFilter(value) {
		if (value == null) return '—';
		return value ? m.usage_on() : m.usage_off();
	}

	function formatTokens(n) {
		if (n == null) return '—';
		return n.toLocaleString(locale);
	}

	function keyLabel(apiKey) {
		if (!apiKey) return '—';
		// Backend fills api_key.name with "Key #<id>" for never-named keys —
		// show a neutral "Unnamed" instead of leaking the internal id.
		const rawName = apiKey.name ?? '';
		const name = !rawName || /^Key #\d+$/.test(rawName) ? m.usage_key_unnamed() : rawName;
		return apiKey.deleted ? `${name} (${m.usage_key_deleted()})` : name;
	}

	async function copyRequestId(id) {
		if (!id) return;
		try {
			await navigator.clipboard.writeText(id);
			copiedId = id;
			setTimeout(() => {
				if (copiedId === id) copiedId = null;
			}, 1500);
		} catch (err) {
			console.error('Failed to copy request id', err);
		}
	}
</script>

<svelte:head>
	<title>Nexara — {m.usage_page_title()}</title>
	<meta name="description" content="Nexara" />
</svelte:head>

<div class="main-container">
	<div class="card">
		<p class="card-title">{m.usage_page_title()}</p>

		{#if isLoading}
			<div class="state-box">
				<p>{m.usage_loading()}</p>
			</div>
		{:else if error && items.length === 0}
			<div class="state-box">
				<p class="error-text">{m.usage_error()}</p>
				<p class="error-detail">{error}</p>
			</div>
		{:else if items.length === 0}
			<div class="state-box">
				<p class="empty-title">{m.usage_empty()}</p>
				<p class="empty-hint">{m.usage_empty_hint()}</p>
			</div>
		{:else}
			<!-- Desktop table -->
			<div class="table-wrap">
				<table class="usage-table">
					<thead>
						<tr>
							<th>{m.usage_col_time()}</th>
							<th>{m.usage_col_task()}</th>
							<th>{m.usage_col_model()}</th>
							<th>{m.usage_col_language()}</th>
							<th class="num">{m.usage_col_duration()}</th>
							<th class="num">{m.usage_col_size()}</th>
							<th>{m.usage_col_profanity()}</th>
							<th>{m.usage_col_role_tagging()}</th>
							<th class="num">{m.usage_col_llm_in()}</th>
							<th class="num">{m.usage_col_llm_out()}</th>
							<th>{m.usage_col_key()}</th>
							<th class="num">{m.usage_col_cost()}</th>
							<th>{m.usage_col_request()}</th>
						</tr>
					</thead>
					<tbody>
						{#each items as item (item.request_id ?? `${item.timestamp}-${item.api_key?.id}`)}
							<tr>
								<td class="nowrap">{formatTime(item.timestamp)}</td>
								<td>{item.task ?? '—'}</td>
								<td>{item.model ?? '—'}</td>
								<td>{formatLanguage(item.language)}</td>
								<td class="num">{formatDuration(item.seconds)}</td>
								<td class="num">{formatBytes(item.bytes)}</td>
								<td>{formatProfanityFilter(item.profanity_filter)}</td>
								<td>{formatProfanityFilter(item.role_tagging)}</td>
								<td class="num">{formatTokens(item.llm_input_tokens)}</td>
								<td class="num">{formatTokens(item.llm_output_tokens)}</td>
								<td>
									<span class:deleted-key={item.api_key?.deleted}>{keyLabel(item.api_key)}</span>
								</td>
								<td class="num">{formatCost(item.cost)}</td>
								<td>
									{#if item.request_id}
										<button
											class="request-btn"
											title={m.usage_copy_request()}
											on:click={() => copyRequestId(item.request_id)}
										>
											<code>{item.request_id.slice(0, 8)}</code>
											{#if copiedId === item.request_id}
												<Check size={14} />
											{:else}
												<Copy size={14} />
											{/if}
										</button>
									{:else}
										—
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Mobile card fallback -->
			<div class="card-list">
				{#each items as item (item.request_id ?? `${item.timestamp}-${item.api_key?.id}-m`)}
					<div class="usage-row-card">
						<div class="row-card-top">
							<span class="row-task">{item.task ?? '—'}</span>
							<span class="row-cost">{formatCost(item.cost)}</span>
						</div>
						<div class="row-card-time">{formatTime(item.timestamp)}</div>
						<div class="row-card-grid">
							<div><span class="rc-label">{m.usage_col_model()}</span>{item.model ?? '—'}</div>
							<div>
								<span class="rc-label">{m.usage_col_language()}</span>{formatLanguage(item.language)}
							</div>
							<div>
								<span class="rc-label">{m.usage_col_duration()}</span>{formatDuration(item.seconds)}
							</div>
							<div><span class="rc-label">{m.usage_col_size()}</span>{formatBytes(item.bytes)}</div>
							<div>
								<span class="rc-label">{m.usage_col_profanity()}</span>{formatProfanityFilter(
									item.profanity_filter
								)}
							</div>
							<div>
								<span class="rc-label">{m.usage_col_role_tagging()}</span>{formatProfanityFilter(
									item.role_tagging
								)}
							</div>
							<div>
								<span class="rc-label">{m.usage_col_llm_in()}</span>{formatTokens(item.llm_input_tokens)}
							</div>
							<div>
								<span class="rc-label">{m.usage_col_llm_out()}</span>{formatTokens(item.llm_output_tokens)}
							</div>
							<div class="rc-full">
								<span class="rc-label">{m.usage_col_key()}</span>
								<span class:deleted-key={item.api_key?.deleted}>{keyLabel(item.api_key)}</span>
							</div>
						</div>
						{#if item.request_id}
							<button
								class="request-btn"
								title={m.usage_copy_request()}
								on:click={() => copyRequestId(item.request_id)}
							>
								<code>{item.request_id}</code>
								{#if copiedId === item.request_id}
									<Check size={14} />
								{:else}
									<Copy size={14} />
								{/if}
							</button>
						{/if}
					</div>
				{/each}
			</div>

			{#if error}
				<p class="error-detail load-error">{error}</p>
			{/if}

			{#if hasMore}
				<div class="load-more-row">
					<button class="load-more-btn" on:click={loadMore} disabled={isLoadingMore}>
						{isLoadingMore ? m.usage_loading() : m.usage_load_more()}
					</button>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.main-container {
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	.card-title {
		color: rgba(250, 250, 250, 0.5);
		margin: 0 0 24px 0;
	}

	.card {
		background-color: rgba(250, 250, 250, 0.01);
		backdrop-filter: blur(16px);
		border-radius: 12px;
		padding: 24px;
		display: flex;
		flex-direction: column;
	}

	.state-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		text-align: center;
		padding: 48px 16px;
		gap: 8px;
	}

	.error-text {
		color: rgba(255, 100, 100, 0.9);
		font-weight: 500;
		margin: 0;
	}

	.error-detail {
		color: rgba(250, 250, 250, 0.5);
		font-size: 14px;
		margin: 0;
	}

	.load-error {
		margin-top: 12px;
		color: rgba(255, 100, 100, 0.8);
	}

	.empty-title {
		font-size: 18px;
		font-weight: 500;
		margin: 0;
		color: rgba(250, 250, 250, 0.9);
	}

	.empty-hint {
		color: rgba(250, 250, 250, 0.5);
		font-size: 14px;
		margin: 0;
	}

	/* --- table --- */
	.table-wrap {
		width: 100%;
		overflow-x: auto;
	}

	.usage-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 14px;
	}

	.usage-table th {
		text-align: left;
		font-weight: 450;
		color: rgba(250, 250, 250, 0.5);
		padding: 0 16px 12px 16px;
		border-bottom: 1px solid rgba(250, 250, 250, 0.11);
		white-space: nowrap;
	}

	.usage-table td {
		padding: 14px 16px;
		border-bottom: 1px solid rgba(250, 250, 250, 0.06);
		color: rgba(250, 250, 250, 0.9);
		vertical-align: middle;
	}

	.usage-table tbody tr:last-child td {
		border-bottom: none;
	}

	.usage-table tbody tr:hover td {
		background-color: rgba(255, 255, 255, 0.02);
	}

	.usage-table th.num,
	.usage-table td.num {
		text-align: right;
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}

	.nowrap {
		white-space: nowrap;
	}

	.deleted-key {
		color: rgba(250, 250, 250, 0.5);
	}

	.request-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: rgba(255, 255, 255, 0.04);
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 8px;
		padding: 4px 8px;
		color: rgba(250, 250, 250, 0.7);
		cursor: pointer;
		font-family: inherit;
	}

	.request-btn:hover {
		background: rgba(255, 255, 255, 0.08);
		color: rgba(250, 250, 250, 1);
	}

	.request-btn code {
		font-family: 'Fira Code', monospace;
		font-size: 12px;
	}

	/* --- mobile card fallback --- */
	.card-list {
		display: none;
		flex-direction: column;
		gap: 12px;
	}

	.usage-row-card {
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 12px;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.row-card-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.row-task {
		font-weight: 500;
		color: rgba(250, 250, 250, 1);
	}

	.row-cost {
		font-variant-numeric: tabular-nums;
		color: rgba(250, 250, 250, 1);
	}

	.row-card-time {
		color: rgba(250, 250, 250, 0.5);
		font-size: 13px;
	}

	.row-card-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px 16px;
		font-size: 14px;
	}

	.row-card-grid .rc-full {
		grid-column: 1 / -1;
	}

	.rc-label {
		display: block;
		color: rgba(250, 250, 250, 0.4);
		font-size: 12px;
		margin-bottom: 2px;
	}

	.row-card-grid .deleted-key {
		color: rgba(250, 250, 250, 0.5);
	}

	.usage-row-card .request-btn {
		align-self: flex-start;
		max-width: 100%;
		overflow: hidden;
	}

	.usage-row-card .request-btn code {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* --- load more --- */
	.load-more-row {
		display: flex;
		justify-content: center;
		margin-top: 24px;
	}

	.load-more-btn {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.11);
		border-radius: 12px;
		padding: 12px 32px;
		color: rgba(250, 250, 250, 0.9);
		font-family: inherit;
		font-size: 15px;
		cursor: pointer;
	}

	.load-more-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.09);
	}

	.load-more-btn:disabled {
		opacity: 0.6;
		cursor: default;
	}

	@media (max-width: 900px) {
		.table-wrap {
			display: none;
		}

		.card-list {
			display: flex;
		}
	}
</style>
