var App = App || {};

(function() {
  let path, zoom, projection;

  App.init = function() {
    // load country codes first
    d3.queue()
      .defer(d3.json, "./data/world.json")
      .defer(d3.json, "./data/countryInfo.json")
      .defer(d3.json, "./data/events.json")
      .await(itemsLoaded);


    function itemsLoaded(err, world, countryInfo, events) {
      if (err) console.log(err);

      App.countryCodeMap = {};

      for (let country of countryInfo) {
        App.countryCodeMap[country.ccn3] = country;
      }

      // then create map/timelines
      createMap(world, events);
      createTimeline(events);
      createEvents(events);
    }


    function createMap(world, events) {
      App.map = {};

      App.map.SVG = d3.select("#map")
        .append("svg");

      let width = App.map.SVG.node().parentNode.clientWidth-10,
        height = App.map.SVG.node().parentNode.clientHeight-10;

      projection = d3.geoWagner6()
        .scale(125)
        .center([13, -2]);

      console.log(projection.scale());

      // add zoom behavior
      zoom = d3.zoom()
        .scaleExtent([1, 20])
        .translateExtent([[-width/2, -height/2], [3*width/2, 3*height/2]])
        .on("zoom", zoomed);

      path = d3.geoPath()
        .projection(projection);


      App.map.SVG
        .attr("width", width)
        .attr("height", height)
        // .attr("viewBox", "0 0 " + width + " " + height)
        // .attr("transform", "translate(109.16, 22.6) scale(1.246)")
        .call(zoom);

      App.map.countryG = App.map.SVG.append("g")

      drawMap(world);
      drawEvents(events);

      function drawMap(json) {
          let features = topojson.feature(json, json.objects.countries).features;

          var graticule = d3.geoGraticule();


          App.map.countryG.append("path")
              .datum(graticule)
              .attr("class", "graticule")
              .attr("d", path);


          App.map.countryG.selectAll(".country")
            .data(features)
          .enter().insert("path", ".graticule")
            .attr("class", "country")
            .attr("d", path)
            .on("click", function(d) {
              console.log(App.countryCodeMap[d.id]);

              d3.selectAll(".event").classed("event-active", function(e) {
                return e.country === App.countryCodeMap[d.id].name.common;
              })

              let that = this;
              d3.selectAll(".country")
                .classed("country-selected", function() {
                  return that == this;
                });
            });

            App.map.countryG.insert("path", ".graticule")
              .datum(topojson.mesh(json, json.objects.countries, function(a, b) { return a !== b; }))
              .attr("class", "boundary")
              .attr("d", path);
      }

      function drawEvents(json) {
        console.log(json);

        for (let e of json) {
          e.coord.reverse();
        }

        App.map.countryG.selectAll(".eventPoint")
          .data(json)
        .enter().append("circle")
          .attr("class", "eventPoint")
          .attr("cx", (d) => projection(d.coord)[0])
          .attr("cy", (d) => projection(d.coord)[1])
          .attr("r", 5);

      }

      function zoomed() {
        App.map.countryG.attr("transform", d3.event.transform);

        // make strokes on countries thinner
        App.map.countryG.selectAll("path")
          .style("stroke-width", 1/d3.event.transform.k);


        App.map.countryG.selectAll(".eventPoint")
          .attr("r", 5/d3.event.transform.k)
          .style("stroke-width", 1/d3.event.transform.k);
      }

      window.addEventListener("resize", function() {
        let width = App.map.SVG.node().parentNode.clientWidth-10,
          height = App.map.SVG.node().parentNode.clientHeight-10;

        App.map.SVG
            .attr("width", width)
            .attr("height", height)
      });
    }

    function createTimeline(events) {

    }

    function createEvents(events) {
      App.events = {};

      App.events = d3.select("#events")
      .selectAll(".event").data(events)
      .enter().append("div")
        .attr("class", "event")
        .each(function(d) {
          let self = d3.select(this);

          self.append("h4")
            .text(d.year + " " + d.ADorBC);

          self.append("p")
            .text(d.description);
        })
        .on("click", function(d, i) {
          let that = this;
          d3.selectAll(".event")
            .classed("event-selected", function() {
              return that == this;
            });

          d3.selectAll(".eventPoint")
            .classed("eventPoint-selected", (d2, i2) => i === i2);
            // .classed("eventPoint", (d2, i2) => i !== i2);
            // .style("fill", function(d2, i2) {
            //   return i === i2 ? "blue" : "red";
            // });
        })
        .on("mouseover", function(d, i) {
          d3.selectAll(".eventPoint")
            .classed("eventPoint-hovering", (d2, i2) => i === i2);
        })
        .on("mouseout", function(d, i) {
          d3.selectAll(".eventPoint")
            .classed("eventPoint-hovering", false);
        });
    }

  };

})();
