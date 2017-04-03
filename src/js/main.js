var App = App || {};

window.addEventListener("resize", function() {

});

(function() {
  var width = 960,
  height = 600;

  let projection = d3.geoCylindricalStereographic()

  // add zoom behavior
  let zoom = d3.zoom()
    .scaleExtent([1.246, 20])
    .translateExtent([[-109.16, -22.6], [width, height]])
    .on("zoom", zoomed);

    // .clipExtent([[0, 0], [width, height]])
    // .scale(110)
    // .center([54.5260, 15.2551]);

  console.log(projection.scale());

  var path = d3.geoPath()
    .projection(projection)

  App.init = function() {

    App.svg = d3.select("#mainContent")
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", "0 0 " + width + " " + height)
      .call(zoom);

    App.g = App.svg.append("g")
      .attr("transform", "translate(-109.16, -22.6) scale(1.246)");

    drawMap();
  };

  function drawMap() {
    d3.json("./data/world.json", function(error, json) {
      let features = topojson.feature(json, json.objects.countries).features;

      console.log(features);

      App.g.selectAll(".country")
        .data(features)
      .enter().append("path")
        .attr("class", "country")
        .attr("d", path)
        .on("click", function(d) {
          console.log(d);
        });

      // App.svg.insert("path", ".graticule")
      //   .datum(topojson.mesh(json, json.objects.countries, function(a, b) { return a !== b; }))
      //   .attr("class", "boundary")
      //   .attr("clip-path", "url(#clip)")
      //   .attr("d", path);
    });
  }

  function zoomed() {
    console.log(d3.event);
    App.g.attr("transform", d3.event.transform);
    App.g.selectAll("path")
      .style("stroke-width", 1/d3.event.transform.k);
  }
})();
