<script>
	// Stacked daily bar chart for the usage page: one bar per day, one segment
	// per series (API key, or the folded "Other"), bottom to top in `series`
	// order. Plain SVG — the values come from /get_usage_stats.

	/** @type {{ date: string, cost: number, minutes: number, calls: number, keys: { key_id: number, cost: number, minutes: number, calls: number }[] }[]} */
	export let days = [];
	/** Stack order, bottom to top. @type {{ id: string | number, label: string, color: string }[]} */
	export let series = [];
	/** Maps a key_id to the id of the series it is drawn in. */
	export let seriesOf = (keyId) => keyId;
	/** 'cost' | 'minutes' */
	export let metric = 'cost';
	export let formatValue = (v) => String(v);
	export let formatTick = (v) => String(v);
	export let formatDate = (iso) => iso;
	export let formatLongDate = (iso) => iso;
	export let totalLabel = 'Total';
	export let ariaLabel = '';
	/** Held at reduced opacity while a refetch is in flight. */
	export let dimmed = false;

	const PLOT_HEIGHT = 240;
	const AXIS_BAND = 28;
	const MARGIN_TOP = 8;
	const MARGIN_LEFT = 56;
	const MARGIN_RIGHT = 16; // room for the last day's centred label
	const GAP = 2; // surface gap between stacked segments and between bars
	const RADIUS = 4; // rounded data end, square at the baseline
	const MAX_BAR = 24;
	const MIN_LABEL_SPACING = 72;
	// Roughly half a date label ("13 нояб."): keeps the last one inside the card.
	const LABEL_HALF_WIDTH = 28;

	let width = 0;
	/** Index of the hovered / keyboard-focused day, or null. */
	let active = null;

	$: stacks = days.map((day) => {
		const values = new Map(series.map((s) => [s.id, 0]));
		for (const k of day.keys) {
			const sid = seriesOf(k.key_id);
			values.set(sid, (values.get(sid) ?? 0) + k[metric]);
		}
		return { date: day.date, total: day[metric], calls: day.calls, values };
	});

	$: ticks = niceTicks(Math.max(0, ...stacks.map((s) => s.total)));
	$: yMax = ticks[ticks.length - 1];
	$: baseline = MARGIN_TOP + PLOT_HEIGHT;
	$: plotWidth = Math.max(0, width - MARGIN_LEFT - MARGIN_RIGHT);
	$: band = stacks.length ? plotWidth / stacks.length : 0;
	$: barWidth = Math.max(1, Math.min(MAX_BAR, band - GAP));
	$: yOf = (v) => baseline - (v / yMax) * PLOT_HEIGHT;

	$: bars = stacks.map((stack, i) => {
		const x = MARGIN_LEFT + i * band + (band - barWidth) / 2;
		const present = series.filter((s) => stack.values.get(s.id) > 0);
		let acc = 0;
		const segments = present.map((s, j) => {
			const bottom = yOf(acc);
			acc += stack.values.get(s.id);
			const isTop = j === present.length - 1;
			// Shave the gap off every segment that has another one stacked on it.
			let top = isTop ? yOf(acc) : yOf(acc) + GAP;
			// A non-zero value never disappears: at least 1px.
			if (bottom - top < 1) top = bottom - 1;
			return { id: s.id, color: s.color, top, height: bottom - top, isTop };
		});
		return { x, segments };
	});

	$: labelEvery = Math.max(
		1,
		Math.ceil(stacks.length / Math.max(1, plotWidth / MIN_LABEL_SPACING))
	);
	// Anchor the labels on the last day so "today" is always labelled.
	$: xLabels = stacks
		.map((s, i) => ({ i, date: s.date }))
		.filter(({ i }) => (stacks.length - 1 - i) % labelEvery === 0);

	$: activeStack = active != null ? stacks[active] : null;
	$: tooltipRows = activeStack
		? series
				.filter((s) => activeStack.values.get(s.id) > 0)
				.reverse() // top of the stack first, like the bar reads
				.map((s) => ({ ...s, value: activeStack.values.get(s.id) }))
		: [];
	$: tooltipCenter = active != null ? MARGIN_LEFT + (active + 0.5) * band : 0;
	$: tooltipOnLeft = tooltipCenter > width / 2;

	function niceTicks(max) {
		if (!(max > 0)) return [0, 1];
		const rough = max / 4;
		const pow = 10 ** Math.floor(Math.log10(rough));
		const step = [1, 2, 2.5, 5, 10].map((f) => f * pow).find((s) => s >= rough);
		const out = [];
		for (let v = 0; v < max + step * 1e-9; v += step) out.push(+v.toPrecision(12));
		if (out[out.length - 1] < max) out.push(+(out[out.length - 1] + step).toPrecision(12));
		return out;
	}

	function topRoundedPath(x, y, w, h, r) {
		r = Math.min(r, w / 2, h);
		return `M${x},${y + h}V${y + r}A${r},${r} 0 0 1 ${x + r},${y}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${y + r}V${y + h}Z`;
	}

	function lastActiveDay() {
		for (let i = stacks.length - 1; i >= 0; i--) if (stacks[i].total > 0) return i;
		return stacks.length - 1;
	}

	function handleKeydown(event) {
		if (!stacks.length) return;
		const moves = { ArrowLeft: -1, ArrowRight: 1 };
		if (event.key in moves) {
			event.preventDefault();
			const from = active ?? lastActiveDay();
			active = Math.min(stacks.length - 1, Math.max(0, from + moves[event.key]));
		} else if (event.key === 'Home') {
			event.preventDefault();
			active = 0;
		} else if (event.key === 'End') {
			event.preventDefault();
			active = stacks.length - 1;
		} else if (event.key === 'Escape') {
			active = null;
		}
	}
</script>

<div class="chart" class:dimmed bind:clientWidth={width}>
	{#if width > 0}
		<svg
			{width}
			height={MARGIN_TOP + PLOT_HEIGHT + AXIS_BAND}
			role="slider"
			aria-label={ariaLabel}
			aria-valuemin={0}
			aria-valuemax={Math.max(0, stacks.length - 1)}
			aria-valuenow={active ?? lastActiveDay()}
			aria-valuetext={activeStack
				? `${formatLongDate(activeStack.date)}: ${formatValue(activeStack.total)}`
				: undefined}
			tabindex="0"
			on:keydown={handleKeydown}
			on:focus={() => (active = active ?? lastActiveDay())}
			on:blur={() => (active = null)}
			on:pointerleave={() => (active = null)}
		>
			<!-- grid + y ticks -->
			{#each ticks as tick}
				<line
					class:baseline={tick === 0}
					class="grid"
					x1={MARGIN_LEFT}
					x2={width - MARGIN_RIGHT}
					y1={Math.round(yOf(tick)) + 0.5}
					y2={Math.round(yOf(tick)) + 0.5}
				/>
				<text class="tick" x={MARGIN_LEFT - 10} y={yOf(tick)} dy="0.32em" text-anchor="end">
					{formatTick(tick)}
				</text>
			{/each}

			<!-- hover wash -->
			{#if active != null}
				<rect
					class="wash"
					x={MARGIN_LEFT + active * band}
					y={MARGIN_TOP}
					width={band}
					height={PLOT_HEIGHT}
				/>
			{/if}

			<!-- bars -->
			{#each bars as bar}
				{#each bar.segments as seg (seg.id)}
					{#if seg.isTop}
						<path
							d={topRoundedPath(bar.x, seg.top, barWidth, seg.height, RADIUS)}
							fill={seg.color}
						/>
					{:else}
						<rect x={bar.x} y={seg.top} width={barWidth} height={seg.height} fill={seg.color} />
					{/if}
				{/each}
			{/each}

			<!-- x labels -->
			{#each xLabels as label}
				<text
					class="tick"
					x={Math.min(MARGIN_LEFT + (label.i + 0.5) * band, width - LABEL_HALF_WIDTH)}
					y={baseline + 18}
					text-anchor="middle"
				>
					{formatDate(label.date)}
				</text>
			{/each}

			<!-- hit targets: the whole day column, not just the painted bar -->
			{#each stacks as stack, i (stack.date)}
				<rect
					class="hit"
					x={MARGIN_LEFT + i * band}
					y={MARGIN_TOP}
					width={band}
					height={PLOT_HEIGHT}
					on:pointerenter={() => (active = i)}
					role="presentation"
				/>
			{/each}
		</svg>

		{#if activeStack}
			<div
				class="tooltip"
				style={tooltipOnLeft
					? `right: ${width - tooltipCenter + 12}px`
					: `left: ${tooltipCenter + 12}px`}
				aria-hidden="true"
			>
				<p class="tt-date">{formatLongDate(activeStack.date)}</p>
				<p class="tt-total">
					<strong>{formatValue(activeStack.total)}</strong>
					<span>{totalLabel}</span>
				</p>
				{#each tooltipRows as row (row.id)}
					<p class="tt-row">
						<span class="tt-key" style="background: {row.color}"></span>
						<strong>{formatValue(row.value)}</strong>
						<span class="tt-label">{row.label}</span>
					</p>
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.chart {
		position: relative;
		width: 100%;
		min-height: 276px; /* plot + x-axis band, so the card never scrolls */
		transition: opacity 0.15s ease;
		overflow: visible;
	}

	.chart.dimmed {
		opacity: 0.45;
	}

	svg {
		display: block;
		overflow: visible;
		outline: none;
	}

	svg:focus-visible {
		outline: 1px solid rgba(250, 250, 250, 0.3);
		outline-offset: 4px;
		border-radius: 8px;
	}

	.grid {
		stroke: rgba(250, 250, 250, 0.07);
		stroke-width: 1;
		shape-rendering: crispEdges;
	}

	.grid.baseline {
		stroke: rgba(250, 250, 250, 0.2);
	}

	.tick {
		fill: rgba(250, 250, 250, 0.45);
		font-size: 12px;
		font-variant-numeric: tabular-nums;
	}

	.wash {
		fill: rgba(250, 250, 250, 0.05);
	}

	.hit {
		fill: transparent;
	}

	.tooltip {
		position: absolute;
		top: 0;
		pointer-events: none;
		min-width: 160px;
		max-width: 260px;
		padding: 10px 12px;
		border-radius: 10px;
		background: #222221;
		border: 1px solid rgba(255, 255, 255, 0.1);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 13px;
		overflow: hidden;
	}

	.tt-date {
		color: rgba(250, 250, 250, 0.5);
		font-size: 12px;
	}

	.tt-total,
	.tt-row {
		display: flex;
		align-items: center;
		gap: 8px;
		white-space: nowrap;
	}

	.tt-total {
		padding-bottom: 4px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.tooltip strong {
		font-weight: 550;
		color: rgba(250, 250, 250, 1);
	}

	.tooltip span {
		color: rgba(250, 250, 250, 0.6);
	}

	.tt-key {
		width: 10px;
		height: 2px;
		border-radius: 1px;
		flex-shrink: 0;
	}

	.tt-label {
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
