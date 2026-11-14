<script>
	import { onMount } from 'svelte';
	import { dashboardStore } from '$lib/stores/dashboard';
	import * as m from '$lib/paraglide/messages.js';
	import { languageTag } from '$lib/paraglide/runtime.js';
	import { Copy, Check, Download } from 'lucide-svelte';
	import UsageChart from '../../components/dashboard/UsageChart.svelte';

	const PAGE_SIZE = 50;
	const MAX_RANGE_DAYS = 366; // matches the backend cap
	const PRESETS = [7, 30, 90];
	// Categorical slots, dark steps, in fixed order — validated (CVD + contrast)
	// against the card surface. A key keeps its colour for the whole visit;
	// keys past the eighth fold into "Other".
	const SERIES_COLORS = [
		'#3987e5',
		'#d95926',
		'#199e70',
		'#c98500',
		'#d55181',
		'#008300',
		'#9085e9',
		'#e66767'
	];
	const OTHER_COLOR = '#6b6a66';
	const OTHER_ID = 'other';

	$: locale = languageTag() === 'ru' ? 'ru-RU' : 'en-GB';
	// Days are counted, and timestamps rendered, in the viewer's own timezone.
	const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

	// --- filters ---

	const today = isoDay(new Date());
	let dateFrom = addDays(today, -29);
	let dateTo = today;
	let apiKeyId = ''; // '' = all keys
	let metric = 'cost'; // 'cost' | 'minutes'

	$: activePreset =
		dateTo === today ? (PRESETS.find((n) => daysBetween(dateFrom, dateTo) === n) ?? null) : null;

	$: rangeError =
		!dateFrom || !dateTo || dateFrom > dateTo
			? m.usage_range_invalid()
			: daysBetween(dateFrom, dateTo) > MAX_RANGE_DAYS
				? m.usage_range_too_long()
				: null;

	$: filters = {
		dateFrom,
		dateTo,
		tz: userTimeZone,
		apiKeyId: apiKeyId === '' ? null : Number(apiKeyId)
	};

	function applyPreset(days) {
		dateTo = today;
		dateFrom = addDays(today, -(days - 1));
	}

	// --- data ---

	let mounted = false;
	let stats = null;
	let statsLoading = true;
	let statsError = null;

	let items = [];
	let cursor = null; // next_cursor from the last response
	let hasMore = false;
	let currency = null;
	let isLoading = true;
	let isLoadingMore = false;
	let error = null;
	let copiedId = null;

	let exporting = false;
	let exportError = null;

	// Every key seen in a stats response, so the picker keeps listing all of
	// them while one key is selected (the filtered response only has that one).
	let knownKeys = new Map();
	let colorByKey = new Map();

	// Responses can arrive out of order when filters change quickly; only the
	// latest request is allowed to write its result.
	let loadSeq = 0;
	let reloadTimer;

	$: if (mounted && !rangeError) scheduleReload(filters);

	function scheduleReload(f) {
		// Date inputs fire on every committed change; coalesce bursts so the
		// stats endpoint's rate limit isn't spent on intermediate values.
		clearTimeout(reloadTimer);
		reloadTimer = setTimeout(() => reload(f), 200);
	}

	async function reload(f) {
		const seq = ++loadSeq;
		statsLoading = true;
		isLoading = true;
		statsError = null;
		error = null;

		const [statsResult, usageResult] = await Promise.allSettled([
			dashboardStore.getUsageStats(f),
			dashboardStore.getUsage({ limit: PAGE_SIZE, ...f })
		]);
		if (seq !== loadSeq) return;

		if (statsResult.status === 'fulfilled') {
			applyStats(statsResult.value);
		} else {
			statsError = statsResult.reason?.message ?? String(statsResult.reason);
		}
		statsLoading = false;

		if (usageResult.status === 'fulfilled') {
			const data = usageResult.value;
			items = data.items ?? [];
			cursor = data.next_cursor ?? null;
			hasMore = Boolean(data.has_more);
			currency = data.currency ?? null;
		} else {
			items = [];
			hasMore = false;
			error = usageResult.reason?.message ?? String(usageResult.reason);
		}
		isLoading = false;
	}

	function applyStats(data) {
		stats = data;
		for (const k of data.keys) {
			knownKeys.set(k.id, { id: k.id, name: k.name, deleted: k.deleted });
		}
		knownKeys = knownKeys;

		// Biggest spender first gets the first free slot; once assigned, a key
		// keeps its colour across filter changes.
		const used = data.keys
			.filter((k) => k.calls > 0)
			.sort((a, b) => b.cost - a.cost || a.id - b.id);
		for (const k of used) {
			if (!colorByKey.has(k.id) && colorByKey.size < SERIES_COLORS.length) {
				colorByKey.set(k.id, SERIES_COLORS[colorByKey.size]);
			}
		}
		colorByKey = colorByKey;
	}

	async function loadMore() {
		if (isLoadingMore || !hasMore || cursor == null) return;
		const seq = loadSeq;
		isLoadingMore = true;
		error = null;
		try {
			const data = await dashboardStore.getUsage({ limit: PAGE_SIZE, cursor, ...filters });
			if (seq !== loadSeq) return; // filters changed meanwhile
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

	async function exportCsv() {
		if (exporting || rangeError) return;
		exporting = true;
		exportError = null;
		try {
			const { blob, filename } = await dashboardStore.exportUsageStats(filters);
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			link.remove();
			setTimeout(() => URL.revokeObjectURL(url), 0);
		} catch {
			exportError = m.usage_export_error();
		} finally {
			exporting = false;
		}
	}

	onMount(() => {
		mounted = true;
		return () => clearTimeout(reloadTimer);
	});

	// --- derived view data ---

	$: statsCurrency = stats?.currency ?? currency;
	$: usedKeys = stats ? stats.keys.filter((k) => k.calls > 0) : [];
	$: otherKeys = usedKeys.filter((k) => !colorByKey.has(k.id));
	$: series = [
		...usedKeys
			.filter((k) => colorByKey.has(k.id))
			.sort(
				(a, b) =>
					SERIES_COLORS.indexOf(colorByKey.get(a.id)) - SERIES_COLORS.indexOf(colorByKey.get(b.id))
			)
			.map((k) => ({
				id: k.id,
				label: keyLabel(k),
				color: colorByKey.get(k.id),
				total: k[metric]
			})),
		...(otherKeys.length
			? [
					{
						id: OTHER_ID,
						label: m.usage_chart_other({ count: otherKeys.length }),
						color: OTHER_COLOR,
						total: otherKeys.reduce((sum, k) => sum + k[metric], 0)
					}
				]
			: [])
	];
	$: seriesOf = (keyId) => (colorByKey.has(keyId) ? keyId : OTHER_ID);
	$: keyRows = [...usedKeys].sort((a, b) => b.cost - a.cost || b.minutes - a.minutes);

	// Active keys from the account plus every key seen in the stats (that adds
	// deleted keys with usage), sorted by id.
	$: keyOptions = mergeKeyOptions($dashboardStore.apiKeys, knownKeys);

	function mergeKeyOptions(accountKeys, seen) {
		const byId = new Map(seen);
		for (const k of accountKeys ?? []) {
			byId.set(k.id, { id: k.id, name: k.name, deleted: false, prefix: k.api_key?.slice(0, 7) });
		}
		return [...byId.values()].sort((a, b) => a.id - b.id);
	}

	// --- date helpers (local calendar days as 'YYYY-MM-DD') ---

	function isoDay(d) {
		const y = d.getFullYear();
		const mo = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${mo}-${day}`;
	}

	function addDays(iso, n) {
		const d = new Date(`${iso}T00:00:00`);
		d.setDate(d.getDate() + n);
		return isoDay(d);
	}

	// Inclusive day count. Parsed as UTC so a DST switch can't shave an hour.
	function daysBetween(from, to) {
		return (
			Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000) + 1
		);
	}

	// --- formatting helpers ---

	function formatDay(iso, options) {
		// The date string is already the local calendar day; format it as UTC so
		// the browser doesn't shift it by its own offset.
		return new Date(`${iso}T00:00:00Z`).toLocaleDateString(locale, { ...options, timeZone: 'UTC' });
	}

	const formatAxisDate = (iso) => formatDay(iso, { day: 'numeric', month: 'short' });
	const formatLongDate = (iso) =>
		formatDay(iso, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });

	function formatMoney(value, maxDigits = 4) {
		if (value == null) return '—';
		const formatted = value.toLocaleString(statsCurrency === 'RUB' ? 'ru-RU' : 'en-GB', {
			minimumFractionDigits: 2,
			maximumFractionDigits: maxDigits
		});
		if (statsCurrency === 'RUB') return `${formatted} ₽`;
		if (statsCurrency === 'EUR') return `€${formatted}`;
		return formatted; // currency null → show the number bare
	}

	function formatMinutes(value) {
		if (value == null) return '—';
		return m.usage_minutes_value({
			value: value.toLocaleString(locale, { maximumFractionDigits: value < 10 ? 2 : 1 })
		});
	}

	function formatCount(n) {
		return (n ?? 0).toLocaleString(locale);
	}

	$: formatMetric = metric === 'cost' ? (v) => formatMoney(v) : formatMinutes;
	$: formatTick = (v) =>
		v.toLocaleString(locale, { notation: 'compact', maximumFractionDigits: 2 });
	$: currencySymbol = statsCurrency === 'RUB' ? '₽' : statsCurrency === 'EUR' ? '€' : '';
	$: chartTitle =
		metric === 'cost'
			? `${m.usage_chart_cost_title()}${currencySymbol ? `, ${currencySymbol}` : ''}`
			: m.usage_chart_minutes_title();

	function formatShare(part, whole) {
		if (!whole) return '—';
		return (part / whole).toLocaleString(locale, { style: 'percent', maximumFractionDigits: 1 });
	}

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
		if (seconds < 60) return `${seconds.toFixed(1)} s`;
		// Round to whole seconds first, then split, so we never render "60 s"
		// (119.7s becomes 120s -> "2 m 0 s", not "1 m 60 s").
		const totalSecs = Math.round(seconds);
		const mins = Math.floor(totalSecs / 60);
		const secs = totalSecs % 60;
		return `${mins} m ${secs} s`;
	}

	function formatBytes(bytes) {
		if (bytes == null) return '—';
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
	}

	function formatCost(cost) {
		// null cost is legit for legacy rows — render em dash, never 0.
		return formatMoney(cost);
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
		// show a neutral "Unnamed" instead of leaking the internal id, plus the
		// key's visible prefix when we know it so two unnamed keys differ.
		const rawName = apiKey.name ?? '';
		let name = rawName;
		if (!rawName || /^Key #\d+$/.test(rawName)) {
			const prefix =
				apiKey.prefix ??
				$dashboardStore.apiKeys?.find((k) => k.id === apiKey.id)?.api_key?.slice(0, 7);
			name = prefix ? `${m.usage_key_unnamed()} · ${prefix}` : m.usage_key_unnamed();
		}
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
	<!-- Filters: one row, scoping everything below -->
	<div class="card filters-card">
		<div class="title-row">
			<p class="card-title">{m.usage_page_title()}</p>
			<button
				class="export-btn"
				on:click={exportCsv}
				disabled={exporting || Boolean(rangeError)}
				title={m.usage_export_csv()}
			>
				<Download size={16} />
				{exporting ? m.usage_exporting() : m.usage_export_csv()}
			</button>
		</div>

		<div class="filters">
			<div class="segmented" role="group" aria-label={m.usage_period()}>
				{#each PRESETS as days}
					<button
						class:selected={activePreset === days}
						aria-pressed={activePreset === days}
						on:click={() => applyPreset(days)}
					>
						{m.usage_preset_days({ days })}
					</button>
				{/each}
			</div>

			<label class="field">
				<span>{m.usage_date_from()}</span>
				<input type="date" bind:value={dateFrom} max={dateTo || today} />
			</label>
			<label class="field">
				<span>{m.usage_date_to()}</span>
				<input type="date" bind:value={dateTo} min={dateFrom} max={today} />
			</label>

			<label class="field">
				<span>{m.usage_col_key()}</span>
				<select bind:value={apiKeyId}>
					<option value="">{m.usage_all_keys()}</option>
					{#each keyOptions as key (key.id)}
						<option value={String(key.id)}>{keyLabel(key)}</option>
					{/each}
				</select>
			</label>
		</div>

		<p class="hint">
			{#if rangeError}
				<span class="error-inline">{rangeError}</span>
			{:else}
				{m.usage_tz_note({ tz: userTimeZone })}
			{/if}
			{#if exportError}
				<span class="error-inline">{exportError}</span>
			{/if}
		</p>
	</div>

	<!-- Stat tiles -->
	<div class="tiles" class:dimmed={statsLoading && stats}>
		<div class="card tile">
			<p class="tile-label">{m.usage_tile_cost()}</p>
			<p class="tile-value">{stats ? formatMoney(stats.totals.cost, 2) : '—'}</p>
		</div>
		<div class="card tile">
			<p class="tile-label">{m.usage_tile_minutes()}</p>
			<p class="tile-value">
				{stats ? stats.totals.minutes.toLocaleString(locale, { maximumFractionDigits: 2 }) : '—'}
			</p>
		</div>
		<div class="card tile">
			<p class="tile-label">{m.usage_tile_calls()}</p>
			<p class="tile-value">{stats ? formatCount(stats.totals.calls) : '—'}</p>
		</div>
	</div>

	<!-- Daily chart -->
	<div class="card chart-card">
		<div class="title-row">
			<p class="card-title">{chartTitle}</p>
			<div class="segmented" role="group" aria-label={m.usage_metric()}>
				<button
					class:selected={metric === 'cost'}
					aria-pressed={metric === 'cost'}
					on:click={() => (metric = 'cost')}
				>
					{m.usage_metric_cost()}
				</button>
				<button
					class:selected={metric === 'minutes'}
					aria-pressed={metric === 'minutes'}
					on:click={() => (metric = 'minutes')}
				>
					{m.usage_metric_minutes()}
				</button>
			</div>
		</div>

		{#if statsLoading && !stats}
			<div class="state-box chart-placeholder">
				<p>{m.usage_loading()}</p>
			</div>
		{:else if statsError && !stats}
			<div class="state-box chart-placeholder">
				<p class="error-text">{m.usage_error()}</p>
				<p class="error-detail">{statsError}</p>
			</div>
		{:else if stats}
			{#if statsError}
				<p class="error-detail load-error">{statsError}</p>
			{/if}

			{#if stats.totals.calls === 0}
				<div class="state-box chart-placeholder" class:dimmed={statsLoading}>
					<p class="empty-title">{m.usage_no_usage_in_range()}</p>
					<p class="empty-hint">{m.usage_no_usage_in_range_hint()}</p>
				</div>
			{:else}
				{#if series.length > 1}
					<ul class="legend">
						{#each series as s (s.id)}
							<li>
								<span class="swatch" style="background: {s.color}"></span>
								<span class="legend-label">{s.label}</span>
								<span class="legend-value">{formatMetric(s.total)}</span>
							</li>
						{/each}
					</ul>
				{/if}
				<UsageChart
					days={stats.days}
					{series}
					{seriesOf}
					{metric}
					formatValue={formatMetric}
					{formatTick}
					formatDate={formatAxisDate}
					{formatLongDate}
					totalLabel={m.usage_chart_total()}
					ariaLabel={`${chartTitle}. ${m.usage_chart_keyboard_hint()}`}
					dimmed={statsLoading}
				/>
			{/if}
		{/if}
	</div>

	<!-- Per-key breakdown -->
	{#if stats && keyRows.length > 0}
		<div class="card">
			<p class="card-title">{m.usage_by_key_title()}</p>
			<div class="table-wrap" class:dimmed={statsLoading}>
				<table class="usage-table">
					<thead>
						<tr>
							<th>{m.usage_col_key()}</th>
							<th class="num">{m.usage_col_calls()}</th>
							<th class="num">{m.usage_col_minutes()}</th>
							<th class="num">{m.usage_col_cost()}</th>
							<th class="num">{m.usage_col_share()}</th>
						</tr>
					</thead>
					<tbody>
						{#each keyRows as key (key.id)}
							<tr>
								<td>
									<span class="key-cell">
										<span class="swatch" style="background: {colorByKey.get(key.id) ?? OTHER_COLOR}"
										></span>
										<span class:deleted-key={key.deleted}>{keyLabel(key)}</span>
									</span>
								</td>
								<td class="num">{formatCount(key.calls)}</td>
								<td class="num">{formatMinutes(key.minutes)}</td>
								<td class="num">{formatMoney(key.cost)}</td>
								<td class="num">{formatShare(key.cost, stats.totals.cost)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	<!-- Itemized requests, same filters -->
	<div class="card">
		<p class="card-title">{m.usage_requests_title()}</p>

		{#if isLoading && items.length === 0}
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
				<p class="empty-title">{m.usage_no_usage_in_range()}</p>
				<p class="empty-hint">{m.usage_no_usage_in_range_hint()}</p>
			</div>
		{:else}
			<div class="requests-wrap" class:dimmed={isLoading}>
				<!-- Desktop table -->
				<div class="table-wrap requests-table">
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
								<th>{m.usage_col_emotions()}</th>
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
									<td>{formatProfanityFilter(item.emotions)}</td>
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
									<span class="rc-label">{m.usage_col_language()}</span>{formatLanguage(
										item.language
									)}
								</div>
								<div>
									<span class="rc-label">{m.usage_col_duration()}</span>{formatDuration(
										item.seconds
									)}
								</div>
								<div>
									<span class="rc-label">{m.usage_col_size()}</span>{formatBytes(item.bytes)}
								</div>
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
									<span class="rc-label">{m.usage_col_emotions()}</span>{formatProfanityFilter(
										item.emotions
									)}
								</div>
								<div>
									<span class="rc-label">{m.usage_col_llm_in()}</span>{formatTokens(
										item.llm_input_tokens
									)}
								</div>
								<div>
									<span class="rc-label">{m.usage_col_llm_out()}</span>{formatTokens(
										item.llm_output_tokens
									)}
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
		gap: 16px;
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

	/* The title's margin sets this row's height, so growing it is what adds
	   room between the cost/minutes switch and the legend below. */
	.chart-card .card-title {
		margin-bottom: 28px;
	}

	.title-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 16px;
		width: 100%; /* the app's global .card rule sets align-items: start */
	}

	.dimmed {
		opacity: 0.45;
		transition: opacity 0.15s ease;
	}

	/* --- filters --- */
	.filters {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 12px 16px;
	}

	.segmented {
		display: inline-flex;
		border: 1px solid rgba(250, 250, 250, 0.11);
		border-radius: 10px;
		padding: 2px;
		gap: 2px;
	}

	.segmented button {
		background: transparent;
		border: none;
		border-radius: 8px;
		padding: 7px 12px;
		font-family: inherit;
		font-size: 14px;
		color: rgba(250, 250, 250, 0.6);
		cursor: pointer;
		white-space: nowrap;
	}

	.segmented button:hover {
		background: rgba(250, 250, 250, 0.05);
		color: rgba(250, 250, 250, 0.9);
	}

	.segmented button.selected {
		background: rgba(250, 250, 250, 0.12);
		color: rgba(250, 250, 250, 1);
		font-weight: 450;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.field span {
		font-size: 12px;
		color: rgba(250, 250, 250, 0.45);
	}

	.field input,
	.field select {
		color-scheme: dark;
		border: 1px solid rgba(250, 250, 250, 0.11);
		border-radius: 10px;
		padding: 7px 12px;
		background-color: rgba(250, 250, 250, 0.03);
		color: inherit;
		font-family: inherit;
		font-size: 14px;
		outline: none;
		height: 38px;
	}

	.field select {
		max-width: 260px;
		cursor: pointer;
	}

	.field input:focus,
	.field select:focus {
		border-color: rgba(250, 250, 250, 0.3);
	}

	.field select option {
		color: #111;
	}

	.hint {
		margin-top: 16px;
		font-size: 13px;
		color: rgba(250, 250, 250, 0.45);
		display: flex;
		flex-wrap: wrap;
		gap: 4px 16px;
	}

	.error-inline {
		color: rgba(255, 100, 100, 0.9);
	}

	.export-btn {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: rgba(250, 250, 250, 0.95);
		color: #111;
		border: none;
		border-radius: 10px;
		padding: 9px 16px;
		font-family: inherit;
		font-size: 14px;
		font-weight: 450;
		cursor: pointer;
		white-space: nowrap;
		flex-shrink: 0;
	}

	/* The app's global `* { color }` would repaint the icon's paths white. */
	.export-btn :global(svg),
	.export-btn :global(svg *) {
		color: #111;
	}

	.export-btn:hover:not(:disabled) {
		background: rgba(250, 250, 250, 1);
	}

	.export-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	/* --- tiles --- */
	.tiles {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}

	.tile-label {
		color: rgba(250, 250, 250, 0.5);
		font-size: 14px;
		margin-bottom: 8px;
	}

	.tile-value {
		font-size: 28px;
		font-weight: 550;
		color: rgba(250, 250, 250, 1);
	}

	/* --- legend --- */
	.legend {
		list-style: none;
		margin: 0 0 16px 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 8px 20px;
		font-size: 13px;
	}

	.legend li {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.swatch {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 2px;
		flex-shrink: 0;
	}

	.legend-label {
		color: rgba(250, 250, 250, 0.8);
	}

	.legend-value {
		color: rgba(250, 250, 250, 0.5);
	}

	.key-cell {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}

	.chart-placeholder {
		min-height: 276px;
	}

	/* --- states --- */
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

	/* The app's global .card rule sets align-items: start, which would let this
	   wrapper grow to the table's full width; pin it to the card so the inner
	   .table-wrap is the one that overflows (and scrolls). */
	.requests-wrap {
		width: 100%;
		min-width: 0;
	}

	@media (max-width: 900px) {
		.requests-table {
			display: none;
		}

		.card-list {
			display: flex;
		}
	}

	@media (max-width: 700px) {
		.tiles {
			grid-template-columns: 1fr;
		}

		.title-row {
			flex-direction: column;
		}

		.title-row .card-title {
			margin-bottom: 0;
		}

		.title-row {
			margin-bottom: 16px;
		}
	}
</style>
