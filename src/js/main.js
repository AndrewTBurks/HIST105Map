var App = App || {};

(function() {
  let path, zoom, projection;

  App.selectedCountry = null;
  App.chapterFilter = "all";

  App.init = function() {
    // populate chapter dropdown
    let dropdown = d3.select("#chapterSelector");

    for (let i = 1; i <= 14; i++) {
      dropdown.append("option")
        .text("Chapter " + i)
        .attr("value", i);
    }

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

      events.sort((a,b) => a.year - b.year);

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
            .classed("noEvents", function(d) {
              if (!App.countryCodeMap[d.id]) return true;

              let name = App.countryCodeMap[d.id].name.common;

              let numEvents = events.filter((e) => e.country === name).length;

              return !numEvents;
            })
            .on("click", function(d) {
              console.log(App.countryCodeMap[d.id]);

              if (d3.select(this).classed("country-selected")) {
                App.selectedCountry = null;

                d3.select(this).classed("country-selected", false);
                d3.selectAll(".event").classed("event-active", false);
              } else {
                App.selectedCountry = App.countryCodeMap[d.id].name.common;

                d3.selectAll(".event").classed("event-active", function(e) {
                  return e.country === App.selectedCountry;
                });

                let that = this;
                d3.selectAll(".country")
                .classed("country-selected", function() {
                  return that == this;
                });

              }

              App.updatePointsByFilters();
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

        if (App.timeline && App.timeline.SVG) {
          let tW = App.timeline.SVG.node().parentNode.clientWidth-10,
            tH = App.timeline.SVG.node().parentNode.clientHeight-10;

          App.timeline.SVG
              .attr("width", tW)
              .attr("height", tH);
        }
      });
    }

    function createTimeline(events) {
      let timeExtents = [-3000, 2000];

      App.timeline = {};

      App.timeline.SVG = d3.select("#timeline")
        .append("svg");

      let width = App.timeline.SVG.node().parentNode.clientWidth-10,
        height = App.timeline.SVG.node().parentNode.clientHeight-10;

      App.timeline.SVG
        .attr("width", width)
        .attr("height", height);

      // create axis
      let scale = d3.scaleLinear()
        .domain(timeExtents)
        .range([20, width - 20]);

      let axis = d3.axisBottom(scale);

      App.timeline.axis = App.timeline.SVG.append("g")
      .attr("transform", "translate(0, " + (3 * height/4) + ")");

      App.timeline.axis.call(axis);

      // add events to timeline
      let eventY = (3 * height / 4);

      App.timeline.SVG.selectAll(".timelineEvent")
        .data(events)
      .enter().append("circle")
        .attr("class", "timelineEvent")
        .attr("cx", (d) => scale(d.year))
        .attr("cy", eventY)
        .attr("r", 7.5);
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
            .text(Math.abs(d.year) + (d.year > 0 ? " AD" : " BC"));

          self.append("p")
            .text("What: " + d.description);

          self.append("h5")
            .text("Why: " + d.importance);

          self.append("p")
            .attr("class", "chapterText")
            .text("Chapter " + d.chapter);
        })
        .on("click", function(d, i) {
          let that = this;
          d3.selectAll(".event")
            .classed("event-selected", function() {
              if (that == this) {
                return !d3.select(this).classed("event-selected");
              }

              return false;
            });

          d3.selectAll(".eventPoint")
            .classed("eventPoint-selected", function(d2, i2) {
              if (Object.is(d, d2)) {
                return !d3.select(this).classed("eventPoint-selected");
              }

              return false;
            });


          d3.selectAll(".timelineEvent")
            .classed("timelineEvent-selected", function(d2, i2) {
              if (Object.is(d, d2)) {
                return !d3.select(this).classed("timelineEvent-selected");
              }

              return false;
            });

        })
        .on("mouseover", function(d, i) {
          d3.selectAll(".eventPoint")
            .classed("eventPoint-faded", function(d2, i2) {
              if (Object.is(d, d2)) {
                d3.select(this).moveToFront();
                return false;
              }
              return true;
            })
            .classed("eventPoint-filtered", function(d2, i2) {
              if (Object.is(d, d2)) {
                d3.select(this).moveToFront();
                return false;
              }
              return true;
            });

          d3.selectAll(".timelineEvent")
            .classed("timelineEvent-faded",function(d2, i2) {
              if (Object.is(d, d2)) {
                d3.select(this).moveToFront();
                return false;
              }
              return true;
            })
            .classed("timelineEvent-filtered", function(d2, i2) {
              if (Object.is(d, d2)) {
                d3.select(this).moveToFront();
                return false;
              }
              return true;
            });

        })
        .on("mouseout", function(d, i) {
          // return to initial coloring
          App.updatePointsByFilters();
        });
    }

  };

  App.changeChapter = function(option) {
    App.chapterFilter = option.value;

    App.updatePointsByFilters();
  };

  App.updatePointsByFilters = function() {
    if (App.chapterFilter === "all") {
      d3.selectAll(".event")
        .classed("event-chapterSelected", false);

      d3.selectAll(".eventPoint")
        .classed("eventPoint-chapter", false)
        .classed("eventPoint-filtered", false);

      d3.selectAll(".timelineEvent")
        .classed("timelineEvent-chapter", false)
        .classed("timelineEvent-filtered", false);
    } else {

      d3.selectAll(".eventPoint")
        .classed("eventPoint-chapter", (d, i) => d.chapter == App.chapterFilter)
        .classed("eventPoint-filtered", (d, i) => (d.chapter != App.chapterFilter) && (d.country !== App.selectedCountry));

      d3.selectAll(".timelineEvent")
        .classed("timelineEvent-chapter", (d, i) => d.chapter == App.chapterFilter)
        .classed("timelineEvent-filtered", (d, i) => (d.chapter != App.chapterFilter) && (d.country !== App.selectedCountry));

      d3.selectAll(".event")
        .classed("event-chapterSelected", (d, i) => d.chapter == App.chapterFilter);
    }


    function isEventFilteredOut(d, i) {
      if (App.chapterFilter === "all" && App.selectedCountry == null) {
        return false;
      } else if (App.chapterFilter === "all") {
        return d.country != App.selectedCountry;
      } else if (App.selectedCountry == null) {
        return d.chapter != App.chapterFilter;
      } else {
        return (d.country != App.selectedCountry) && (d.chapter != App.chapterFilter);
      }

      console.log(App.selectedCountry);

    }
  };

})();

d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
        this.parentNode.appendChild(this);
      });
};
