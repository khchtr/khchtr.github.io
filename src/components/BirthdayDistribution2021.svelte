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
    gap: 20px;
    background-color: #fff;
    border-radius: 12px;
    max-inline-size: 600px;
    inline-size: 100%;
  }

  /* SVG element styling */
  :global(#my_dataviz_container svg) {
    display: block;
    margin: 0 auto;
    padding: 0;
  }
</style>

<script>
  import * as d3 from 'd3';
  import * as slider from 'd3-simple-slider';

  let vizEl;
  let sliderEl;

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

  $effect(() => {
    if (!vizEl || !sliderEl) return;

    vizEl.innerHTML = '';
    sliderEl.innerHTML = '';

    // --- D3 Setup ---
    const margin = { top: 75, right: 25, bottom: 25, left: 25 };
    const parentWidth = my_dataviz_container.offsetWidth;
    const width = 500 - margin.left - margin.right;
    const height = 1000 - margin.top - margin.bottom;

    const svg = d3
      .select(vizEl)
      .append("svg")
      .attr("width", parentWidth-10 ) // Make it responsive 
      .attr("height", 800)
       // Set viewBox for scaling
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
      .style("color", "black")
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
      .style("color", "black")
      .attr("transform", "translate(-5,0)")
      .call(d3.axisLeft(y).tickSize(0).tickFormat(d3.format("d")));
    yAxis.select(".domain").remove();

    const myColor = d3.scaleDiverging().range(["blue", "white", "red"]);

    svg
      .append("text")
      .attr("x", 0)
      .attr("y", -30)
      .attr("class", "chart-title")
      .attr("text-anchor", "left")
      .text("Number of births in Armenia (thousands)");

    function drawChart(sourceData, startYear, endYear) {
      const data = groupBirths(sourceData, startYear, endYear);

      const minBirths = d3.min(data, (d) => d.births) ?? 0;
      const maxBirths = d3.max(data, (d) => d.births) ?? 0;
      const meanBirths = d3.mean(data, (d) => d.births) ?? 0;

      myColor.domain([minBirths, meanBirths, maxBirths]);

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
          .width(parentWidth-300) // Scale slider width
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
          .attr("width", "100%")
          .attr("height", 100)
          .append("g")
          .attr("transform", "translate(20,30)")

        gRange.call(sliderRange);
      })
      .catch((error) => {
        console.error("Error loading or parsing data:", error);
      });

    return () => {
      vizEl.innerHTML = '';
      sliderEl.innerHTML = '';
    };
  });
</script>
