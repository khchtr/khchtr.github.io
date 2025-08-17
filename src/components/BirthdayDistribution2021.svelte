<div id="my_dataviz_container">
  <div bind:this={vizEl}></div>
  <div bind:this={sliderEl}></div>
</div>

<!-- Load d3.js -->
<style>
  #my_dataviz_container {
    display: flex;
    flex-direction: column;
    align-items: center;
    background-color: #fff;
    border-radius: 12px; /* Rounded corners for the container */
    width: 100%; /* Make it fluid */
    max-width: 600px; /* Max width for desktop */
  }

  /* SVG element styling */
  :global(#my_dataviz_container svg) {
    display: block; /* Remove extra space below SVG */
    margin: 0 auto; /* Center SVG within its div */
  }
</style>

<script>
  import * as d3 from 'd3';
  import * as slider from 'd3-simple-slider';

  // Svelte 5: Bind to the container elements directly
  let vizEl;
  let sliderEl;

  // --- Data Processing Functions ---
  function convertRow(d) {
    return {
      year: parseInt(d.year),
      month: parseInt(d.month),
      day: parseInt(d.day),
      births: parseInt(d.births),
    };
  }

  function groupBirths(data, startYear = 1907, endYear = 2003) {
    const filteredData = data.filter(
      (record) => record.year >= startYear && record.year <= endYear,
    );

    const groupedData = {};
    filteredData.forEach((record) => {
      const key = `${record.month}-${record.day}`;
      if (!groupedData[key]) {
        groupedData[key] = {
          month: record.month,
          day: record.day,
          births: 0,
        };
      }
      groupedData[key].births += record.births;
    });

    const result = Object.values(groupedData);
    result.sort((a, b) => {
      if (a.month !== b.month) {
        return a.month - b.month;
      }
      return a.day - b.day;
    });
    return result;
  }

  // Svelte 5: Use $effect to interact with the DOM after it's mounted
  $effect(() => {
    // Ensure the elements are available before running D3 code
    if (!vizEl || !sliderEl) return;

    // Clear previous renders if the effect re-runs
    vizEl.innerHTML = '';
    sliderEl.innerHTML = '';

    // --- D3 Setup ---
    const margin = { top: 80, right: 25, bottom: 30, left: 40 };
    const width = 500 - margin.left - margin.right;
    const height = 800 - margin.top - margin.bottom;

    const svg = d3
      .select(vizEl)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // --- Scales and Axes ---
    const x = d3
      .scaleBand()
      .range([0, width])
      .domain(Array.from({ length: 12 }, (_, i) => i + 1))
      .padding(0.05);

    const xAxis = svg
      .append("g")
      .style("font-size", "15px")
      .style("fill", "red")
      .attr("class", "axis")
      .attr("transform", "translate(0,-5)")
      .call(
        d3
          .axisTop(x)
          .tickSize(0)
          .tickFormat((d) => {
            const date = new Date(2000, d - 1, 1);
            return d3.timeFormat("%b")(date);
          }),
      );
    xAxis.select(".domain").remove();

    const y = d3
      .scaleBand()
      .range([height, 0])
      .domain(Array.from({ length: 31 }, (_, i) => 31 - i))
      .padding(0.05);

    const yAxis = svg
      .append("g")
      .style("font-size", "15px")
      .style("fill", "red")
      .attr("transform", "translate(-5,0)")
      .call(d3.axisLeft(y).tickSize(0));
    yAxis.select(".domain").remove();

    const myColor = d3.scaleDiverging().range(["blue", "white", "red"]);

    svg
      .append("text")
      .attr("x", 0)
      .attr("y", -30)
      .attr("class", "chart-title")
      .attr("text-anchor", "left")
      .text("Number of births in Armenia (thousands)");

    // --- Drawing Function ---
    function drawChart(sourceData, startYear, endYear) {
      const data = groupBirths(sourceData, startYear, endYear);

      const minBirths = d3.min(data, (d) => d.births) ?? 0;
      const maxBirths = d3.max(data, (d) => d.births) ?? 0;
      const meanBirths = d3.mean(data, (d) => d.births) ?? 0;

      myColor.domain([minBirths, meanBirths, maxBirths]);

      // Rectangles
      svg
        .selectAll("rect")
        .data(data, (d) => `${d.month}:${d.day}`)
        .join(
          (enter) =>
            enter
              .append("rect")
              .attr("x", (d) => x(d.month))
              .attr("y", (d) => y(d.day))
              .attr("rx", 0)
              .attr("ry", 0)
              .attr("width", x.bandwidth())
              .attr("height", y.bandwidth())
              .style("stroke-width", 0)
              .style("stroke", "none")
              .style("opacity", 0)
              .call((enter) =>
                enter
                  .transition()
                  .style("opacity", 0.8)
                  .style("fill", (d) => myColor(d.births)),
              ),
          (update) =>
            update.call((update) =>
              update
                .transition()
                .style("opacity", 0.8)
                .style("fill", (d) => myColor(d.births)),
            ),
          (exit) => exit.transition().style("opacity", 0).remove(),
        );

      // Text Labels
      svg
        .selectAll(".birth-label")
        .data(data, (d) => `${d.month}:${d.day}`)
        .join(
          (enter) =>
            enter
              .append("text")
              .attr("class", "birth-label")
              .attr("x", (d) => x(d.month) + x.bandwidth() / 2)
              .attr("y", (d) => y(d.day) + y.bandwidth() / 2)
              .attr("text-anchor", "middle")
              .style("font-size", "16px")
              .style("fill", "black")
              .style("dominant-baseline", "middle")
              .style("opacity", 0)
              .text((d) => (d.births / 1000).toFixed(1))
              .call((enter) => enter.transition().style("opacity", 1)),
          (update) =>
            update
              .text((d) => (d.births / 1000).toFixed(1))
              .call((update) => update.transition().style("opacity", 1)),
          (exit) => exit.transition().style("opacity", 0).remove(),
        );
    }

    // --- Data Loading and Initial Render ---
    d3.csv(
      "https://raw.githubusercontent.com/khchtr/OpenData/refs/heads/main/Demographics/birthdays.csv",
      convertRow,
    )
      .then((sourceData) => {
        const initialMinYear = 1907;
        const initialMaxYear = 2003;

        drawChart(sourceData, initialMinYear, initialMaxYear);

        const sliderRange = slider.sliderBottom()
          .min(initialMinYear)
          .max(initialMaxYear)
          .width(300)
          .step(1)
          .ticks(5)
          .default([initialMinYear, initialMaxYear])
          .fill("#5148ff")
          .displayFormat(d3.format(".0f"))
          .tickFormat(d3.format(".0f"))
          .on("onchange", (val) => {
            drawChart(sourceData, val[0], val[1]);
          });

        const gRange = d3
          .select(sliderEl)
          .append("svg")
          .attr("width", 500)
          .attr("height", 100)
          .append("g")
          .attr("transform", "translate(90,10)");

        gRange.call(sliderRange);
      })
      .catch((error) => {
        console.error("Error loading or parsing data:", error);
      });

    // Svelte 5: Cleanup function for the effect
    return () => {
      vizEl.innerHTML = '';
      sliderEl.innerHTML = '';
    };
  });
</script>
