/**
 * ApexCharts dashboard — themed via CSS design tokens.
 * Init once, update on period/goal change (no destroy flicker).
 */
(function (global) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let trendChart = null;
  let barChart = null;

  function tokens() {
    const root = getComputedStyle(document.documentElement);
    const pick = (name, fallback) => root.getPropertyValue(name).trim() || fallback;
    return {
      primary: pick('--color-primary', '#059669'),
      secondary: pick('--color-secondary', '#10b981'),
      accent: pick('--color-accent', '#d97706'),
      border: pick('--color-border', '#e1f2ed'),
      textMuted: pick('--color-text-muted', '#475569'),
      surface: pick('--color-surface', '#ffffff'),
      font: getComputedStyle(document.body).fontFamily,
    };
  }

  function xTickAmount(count) {
    if (count <= 7) return count;
    if (count <= 14) return 7;
    return 8;
  }

  function chartHeight() {
    if (window.innerWidth >= 1024) return 300;
    if (window.innerWidth >= 768) return 280;
    return 260;
  }

  function baseOptions(t) {
    return {
      chart: {
        fontFamily: t.font,
        toolbar: { show: false },
        zoom: { enabled: false },
        animations: {
          enabled: !reduceMotion,
          easing: 'easeinout',
          speed: 360,
          animateGradually: { enabled: !reduceMotion, delay: 80 },
        },
        parentHeightOffset: 0,
        redrawOnParentResize: true,
      },
      grid: {
        borderColor: t.border,
        strokeDashArray: 0,
        padding: { left: 4, right: 8, top: 0, bottom: 0 },
      },
      dataLabels: { enabled: false },
      xaxis: {
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: {
            colors: t.textMuted,
            fontSize: '11px',
            fontFamily: t.font,
            fontWeight: 500,
          },
        },
      },
      yaxis: {
        labels: {
          formatter: (v) => Math.round(v).toLocaleString('th-TH'),
          style: {
            colors: t.textMuted,
            fontSize: '11px',
            fontFamily: t.font,
            fontWeight: 500,
          },
        },
      },
      tooltip: {
        theme: 'light',
        style: { fontSize: '13px', fontFamily: t.font },
      },
      legend: {
        fontFamily: t.font,
        fontSize: '12px',
        fontWeight: 600,
        labels: { colors: t.textMuted },
        markers: { width: 10, height: 10, radius: 2, offsetX: -2 },
      },
    };
  }

  function buildTrendOptions(series, goal, formatLabel, t) {
    const categories = series.map((d) => formatLabel(d.date));
    const values = series.map((d) => d.calories);
    const goals = series.map(() => goal);
    const dense = series.length > 10;

    return {
      ...baseOptions(t),
      chart: {
        ...baseOptions(t).chart,
        type: 'line',
        height: chartHeight(),
        width: '100%',
      },
      series: [
        { name: 'ที่กิน (kcal)', type: 'area', data: values },
        { name: 'เป้า', type: 'line', data: goals },
      ],
      colors: [t.primary, t.accent],
      stroke: {
        curve: 'smooth',
        width: [2.5, 2],
        dashArray: [0, 6],
      },
      fill: {
        type: ['gradient', 'solid'],
        gradient: {
          shadeIntensity: 0.25,
          opacityFrom: 0.32,
          opacityTo: 0.04,
          stops: [0, 92, 100],
        },
        opacity: [1, 0],
      },
      markers: {
        size: series.length > 14 ? 3 : 4,
        strokeWidth: 0,
        hover: { size: 6 },
      },
      xaxis: {
        ...baseOptions(t).xaxis,
        categories,
        tickAmount: xTickAmount(series.length),
        labels: {
          ...baseOptions(t).xaxis.labels,
          rotate: dense ? -42 : 0,
          rotateAlways: dense,
          hideOverlappingLabels: true,
        },
      },
      yaxis: {
        ...baseOptions(t).yaxis,
        min: 0,
        forceNiceScale: true,
      },
      legend: {
        ...baseOptions(t).legend,
        show: true,
        position: 'bottom',
        horizontalAlign: 'center',
        offsetY: 4,
      },
      tooltip: {
        ...baseOptions(t).tooltip,
        shared: true,
        intersect: false,
        y: {
          formatter: (v, { seriesIndex, dataPointIndex }) => {
            if (seriesIndex === 1) return `${v.toLocaleString('th-TH')} kcal (เป้า)`;
            const day = series[dataPointIndex];
            return `${v.toLocaleString('th-TH')} kcal · ${day.meals} มื้อ`;
          },
        },
      },
    };
  }

  function buildBarOptions(series, goal, formatLabel, t) {
    const categories = series.map((d) => formatLabel(d.date));
    const values = series.map((d) => d.calories);
    const barColors = series.map((d) => (d.calories > goal ? t.accent : t.secondary));
    const dense = series.length > 10;

    return {
      ...baseOptions(t),
      chart: {
        ...baseOptions(t).chart,
        type: 'bar',
        height: chartHeight(),
        width: '100%',
      },
      series: [{ name: 'kcal / วัน', data: values }],
      colors: barColors,
      plotOptions: {
        bar: {
          distributed: true,
          borderRadius: 2,
          borderRadiusApplication: 'end',
          columnWidth: dense ? '78%' : '58%',
        },
      },
      legend: { show: false },
      xaxis: {
        ...baseOptions(t).xaxis,
        categories,
        tickAmount: xTickAmount(series.length),
        labels: {
          ...baseOptions(t).xaxis.labels,
          rotate: dense ? -42 : 0,
          rotateAlways: dense,
          hideOverlappingLabels: true,
        },
      },
      yaxis: {
        ...baseOptions(t).yaxis,
        min: 0,
        forceNiceScale: true,
      },
      tooltip: {
        ...baseOptions(t).tooltip,
        y: {
          formatter: (v, { dataPointIndex }) => {
            const day = series[dataPointIndex];
            const mark = v > goal ? 'เกินเป้า' : v > 0 ? 'ไม่เกินเป้า' : 'ไม่มีข้อมูล';
            return `${v.toLocaleString('th-TH')} kcal · ${mark}`;
          },
        },
      },
    };
  }

  async function renderTrend(el, series, goal, formatLabel) {
    if (!el || !series.length) return;
    const t = tokens();
    const options = buildTrendOptions(series, goal, formatLabel, t);

    if (!trendChart) {
      el.innerHTML = '';
      trendChart = new global.ApexCharts(el, options);
      await trendChart.render();
      return;
    }

    await trendChart.updateOptions(
      {
        chart: { height: chartHeight() },
        colors: options.colors,
        xaxis: options.xaxis,
        markers: options.markers,
        stroke: options.stroke,
        fill: options.fill,
        tooltip: options.tooltip,
      },
      false,
      true
    );
    await trendChart.updateSeries(options.series);
  }

  async function renderBar(el, series, goal, formatLabel) {
    if (!el || !series.length) return;
    const t = tokens();
    const options = buildBarOptions(series, goal, formatLabel, t);

    if (!barChart) {
      el.innerHTML = '';
      barChart = new global.ApexCharts(el, options);
      await barChart.render();
      return;
    }

    await barChart.updateOptions(
      {
        chart: { height: chartHeight() },
        colors: options.colors,
        xaxis: options.xaxis,
        plotOptions: options.plotOptions,
        tooltip: options.tooltip,
      },
      false,
      true
    );
    await barChart.updateSeries(options.series);
  }

  function clear() {
    if (trendChart) {
      trendChart.destroy();
      trendChart = null;
    }
    if (barChart) {
      barChart.destroy();
      barChart = null;
    }
    const trendEl = document.getElementById('trend-chart');
    const barEl = document.getElementById('bar-chart');
    if (trendEl) trendEl.innerHTML = '';
    if (barEl) barEl.innerHTML = '';
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const h = chartHeight();
      if (trendChart) trendChart.updateOptions({ chart: { height: h } }, false, false);
      if (barChart) barChart.updateOptions({ chart: { height: h } }, false, false);
    }, 150);
  });

  global.DashboardCharts = { renderTrend, renderBar, clear };
})(window);
