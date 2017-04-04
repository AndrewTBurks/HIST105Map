var App = App || {};

window.addEventListener("resize", function() {

});

(function() {
  let path, zoom, projection;

  App.init = function() {
    // load country codes first


    createMap();
    createTimeline();


    function createMap() {
      App.map = {};

      App.map.SVG = d3.select("#map")
        .append("svg");

      let width = App.map.SVG.node().clientWidth,
        height = App.map.SVG.node().clientHeight;

      projection = d3.geoCylindricalStereographic()
      // .clipExtent([[0, 0], [width, height]]);

      // add zoom behavior
      zoom = d3.zoom()
        .scaleExtent([1, 20])
        .translateExtent([[0, 0], [width, height]])
        .on("zoom", zoomed);

      path = d3.geoPath()
      .projection(projection);


      App.map.SVG
        .attr("viewBox", "0 0 " + width + " " + height)
        // .attr("transform", "translate(109.16, 22.6) scale(1.246)")
        .call(zoom);

      App.map.countryG = App.map.SVG.append("g")

      drawMap();

      function drawMap() {
        d3.json("./data/world.json", function(error, json) {
          let features = topojson.feature(json, json.objects.countries).features;

          console.log(features);

          App.map.countryG.selectAll(".country")
          .data(features)
          .enter().append("path")
          .attr("class", "country")
          .attr("d", path)
          .on("click", function(d) {
            console.log(d);
          });


        });
      }

      function zoomed() {
        App.map.countryG.attr("transform", d3.event.transform);

        // make strokes on countries thinner
        App.map.countryG.selectAll("path")
        .style("stroke-width", 1/d3.event.transform.k);
      }
    }

    function createTimeline() {

    }

  };

})();
