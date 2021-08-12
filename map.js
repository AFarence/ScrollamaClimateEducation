/* First, define what constitutes a small screen.
This will affect the zoom parameter for each chapter. */

var smallMedia = window.matchMedia("(max-width: 600px)").matches;

/* Next, create two variables that will hold:
1. The different types of layers available to Mapbox and their
respective opacity attributes.
2. The possible alignments which could be applied to the vignettes.*/

var layerTypes = {
  fill: ["fill-opacity"],
  line: ["line-opacity"],
  circle: ["circle-opacity", "circle-stroke-opacity"],
  symbol: ["icon-opacity", "text-opacity"],
  raster: ["raster-opacity"],
  "fill-extrusion": ["fill-extrusion-opacity"],
  heatmap: ["heatmap-opacity"],
};

var alignments = {
  left: "lefty",
  center: "centered",
  right: "righty",
  full: "fully",
};

/* The next two functions help turn on and off individual
layers through their opacity attributes: The first one gets
the type of layer and the second one adjusts the layer's opacity */

function getLayerPaintType(layer) {
  var layerType = map.getLayer(layer).type;
  return layerTypes[layerType];
}

function setLayerOpacity(layer) {
  var paintProps = getLayerPaintType(layer.layer);
  paintProps.forEach(function (prop) {
    var options = {};
    if (layer.duration) {
      var transitionProp = prop + "-transition";
      options = { duration: layer.duration };
      map.setPaintProperty(layer.layer, transitionProp, options);
    }
    map.setPaintProperty(layer.layer, prop, layer.opacity, options);
  });
}

/* Next, these variables and functions create the story and vignette html
elements, and populate them with the content from the config.js file.
They also assign a css class to certain elements, also based on the
config.js file */

// Main 'story', 'features' and 'header' elements
var story = document.getElementById("story");
var features = document.createElement("div");
var header = document.createElement("div");
features.setAttribute("id", "features");

// If the content exists, then assign it to the 'header' element
// Note how each one of these are assigning 'innerHTML'
if (config.topTitle) {
  var topTitle = document.createElement("div");
  topTitle.innerHTML = config.topTitle;
  header.appendChild(topTitle);
}
if (config.title) {
  var titleText = document.createElement("div");
  titleText.innerHTML = config.title;
  header.appendChild(titleText);
}
if (config.subtitle) {
  var subtitleText = document.createElement("div");
  subtitleText.innerHTML = config.subtitle;
  header.appendChild(subtitleText);
}
if (config.byline) {
  var bylineText = document.createElement("div");
  bylineText.innerHTML = config.byline;
  header.appendChild(bylineText);
}
if (config.description) {
  var descriptionText = document.createElement("div");
  descriptionText.innerHTML = config.description;
  header.appendChild(descriptionText);
}

// If after this, the header has anything in it, it gets appended to the story
if (header.innerText.length > 0) {
  header.classList.add(config.theme);
  header.setAttribute("id", "header");
  story.appendChild(header);
}

/* After building the elements and assigning content to the header these
functions will loop through the chapters in the config.js file,
create the vignette elements and assign them their respective content */

config.chapters.forEach((record, idx) => {
  /* These first two variables will hold each vignette, the chapter
    element will go in the container element */
  var container = document.createElement("div");
  var chapter = document.createElement("div");
  // Adds a class to the vignette
  chapter.classList.add("br3");
  // Adds all the content to the vignette's div
  chapter.innerHTML = record.chapterDiv;
  // Sets the id for the vignette and adds the step css attribute
  container.setAttribute("id", record.id);
  container.classList.add("step");
  // If the chapter is the first one, set it to active
  if (idx === 0) {
    container.classList.add("active");
  }
  // Adds the overall theme to the chapter element
  chapter.classList.add(config.theme);
  /* Appends the chapter to the container element and the container
    element to the features element */
  container.appendChild(chapter);
  container.classList.add(alignments[record.alignment] || "centered");
  if (record.hidden) {
    container.classList.add("hidden");
  }
  features.appendChild(container);
});

// Appends the features element (with the vignettes) to the story element
story.appendChild(features);

/* Next, this section creates the footer element and assigns it
its content based on the config.js file */

var footer = document.createElement("div");

// This assigns all the content to the footer element
if (config.footer) {
  var footerText = document.createElement("p");
  footerText.innerHTML = config.footer;
  footer.appendChild(footerText);
}
// If the footer element contains any content, add it to the story
if (footer.innerText.length > 0) {
  footer.classList.add(config.theme);
  footer.setAttribute("id", "footer");
  story.appendChild(footer);
}

// Adds the Mapbox access token
mapboxgl.accessToken = config.accessToken;

// Honestly, don't know what this does
const transformRequest = (url) => {
  const hasQuery = url.indexOf("?") !== -1;
  const suffix = hasQuery
    ? "&pluginName=scrollytellingV2"
    : "?pluginName=scrollytellingV2";
  return {
    url: url + suffix,
  };
};

// Creates a variable to hold the starting zoom value
var startingZoom;
// If the screen size is small, it uses the `zoomSmall` value
if (smallMedia) {
  startingZoom = config.chapters[0].location.zoomSmall;
} else {
  startingZoom = config.chapters[0].location.zoom;
}

/* This section creates the map element with the
attributes from the main section of the config.js file */
var map = new mapboxgl.Map({
  container: "map",
  style: config.style,
  center: config.chapters[0].location.center,
  zoom: startingZoom,
  bearing: config.chapters[0].location.bearing,
  pitch: config.chapters[0].location.pitch,
  interactive: false,
  transformRequest: transformRequest,
});

if (config.showMarkers) {
  var marker = new mapboxgl.Marker({ color: config.markerColor });
  marker.setLngLat(config.chapters[0].location.center).addTo(map);
}

// Instantiates the scrollama function
var scroller = scrollama();

/* Here we add the two extra layers we are using, just like in our previous
tutorial. At the end, however, we setup the functions that will tie the
scrolling to the chapters and move the map from one location to another
while changing the zoom level, pitch and bearing */

map.on("load", function () {
  var layers = map.getStyle().layers;
for (var i = 0; i < layers.length; i++) {
    console.log(layers[i].id);
}
  // Add 3d terrain if necessary
  if (config.use3dTerrain) {
    map.addSource("mapbox-dem", {
      type: "raster-dem",
      url: "mapbox://mapbox.mapbox-terrain-dem-v1",
      tileSize: 512,
      maxzoom: 14,
    });
    // Add the DEM source as a terrain layer with exaggerated height
    map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

    // Add a sky layer that will show when the map is highly pitched
    map.addLayer({
      id: "sky",
      type: "sky",
      paint: {
        "sky-type": "atmosphere",
        "sky-atmosphere-sun": [0.0, 0.0],
        "sky-atmosphere-sun-intensity": 15,
      },
    });
  }
  map.on("load", function () {
    map.addLayer({
      id: "us_states_education_outline",
      type: "line",
      source: {
        type: "geojson",
        data: "./data/stateData.geojson",
      },
      paint: {
        "line-color": "#ffffff",
        "line-width": 0.7,
      },
    },
    "waterway-shadow"
  );
  map.addLayer({
    id: "us_states_education",
    type: "fill",
    source: {
      type: "geojson",
      data: "./data/stateData.geojson",
    },
    paint: {
      "fill-color": [
        "match",
        ["get", "Type_of_teaching"],
        "Requires teaching human-caused climate change", "#fc8d59",
        "Climate change only included in optional high school classes", "#ffffbf",
        "Currently lacks any mention of climate change in their state science standards", "#91bfdb",
        "Requires teaching climate change but not as predominantly human caused", "#91cf60",
        "#ffffff",
      ],
      "fill-outline-color": "#000000",
    },
    },"road-simple"
    );
  });

  // Create the popup
  map.on('click', 'us_states_education', function (e) {
    var stateName = e.features[0].properties.NAME;
    var education = e.features[0].properties.Type_of_teaching;
    var ngss = e.features[0].properties.NGSS;
    stateName = stateName.toUpperCase();
    new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML('<h4><b>'+stateName+'</b></h4>'
        + '<p>' + education +'</p>'
        + '<i><p>' + ngss +'</p></i>')
        .addTo(map);
  });

  map.on('click', 'penn_opinion', function (e) {
    var countyName = e.features[0].properties.NAMELSAD;
    var percentage = e.features[0].properties.Percentage;
    new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML('<h4><b>' + countyName + '</b></h4>'
        + '<p><b> % of adults who believe schools should teach about climate change: </b>' + percentage)
        .addTo(map);
});
// Change the cursor to a pointer when the mouse is over the us_states_elections layer.
map.on('mouseenter', 'penn_opinion', function () {
    map.getCanvas().style.cursor = 'pointer';
});
// Change it back to a pointer when it leaves.
map.on('mouseleave', 'penn_opinion', function () {
    map.getCanvas().style.cursor = '';
});

  // Change the cursor to a pointer when the mouse is over the us_states_elections layer.
  map.on('mouseenter', 'us_states_education', function () {
    map.getCanvas().style.cursor = 'pointer';
  });
  // Change it back to a pointer when it leaves.
  map.on('mouseleave', 'us_states_education', function () {
      map.getCanvas().style.cursor = '';
  });
  map.addLayer({
    id: "bfg",
    type: "fill",
    source: {
      type: "geojson",
      data: "data/bfg.geojson",
    },
    paint: {
      "fill-opacity": .5,
      "fill-color": "#FFFACD",
    },
  }, "waterway-shadow");

//   map.addLayer({
//     id:'schooldata',
//     type:'fill',
//     source: {
//         type:'geojson',
//         data:'data/dataframe.geojson'
//     },
//     paint:{
//         'fill-color':'#0276FD',
//         'fill-opacity': ['interpolate',['linear'],['get','B14001_001E'],
// 1000,0.25,
// 2000000,0.95]

//     }
// },"waterway-shadow" );

  map.addLayer(
    {
      id: "us_states_education",
      type: "fill",
      source: {
        type: "geojson",
        data: "data/stateData.geojson",
      },
      paint: {
        "fill-opacity": 0,
        "fill-color": [
          "match",
          ["get", "Type_of_teaching"],
          "Requires teaching human-caused climate change",
          "#fc8d59",
          "Climate change only included in optional high school classes",
          "#ffffbf",
          "Currently lacks any mention of climate change in their state science standards",
          "#91bfdb",
          "Requires teaching climate change but not as predominantly human caused",
          "#91cf60",
          "#ffffff",
        ],
        "fill-outline-color": "#000000",
      },
    }, "waterway-shadow");

  map.addLayer({
    id: "penn_opinion",
    type: "fill",
    source: {
      type: "geojson",
      data: "data/pennOpCounties.geojson",
    },
    'paint': {
      'fill-opacity': 0,
      'fill-color': [
      'interpolate',
      ['linear'],
      ['get', 'Percentage'],
              5, '#071C57',
              10, '#142C69',
              15, '#203F79',
              20, '#32528C',
              25, '#46679E',
              30, '#5F7FB0',
              35, '#7999C1',
              40, '#98B2D3',
              45, '#B9CFE5',
              50, '#DFEBF7',
              55, '#FEEB9E',
              60, '#FBD885',
              65, '#F7C36B',
              70, '#F3A650',
              75, '#EF8A36',
              80, '#DB5A2F',
              85, '#D0372D',
              90, '#A12A30' ,
              95, '#7A203E',
              100, '#4E184A',

          ],
  },
},"waterway-shadow")
  //Pop-up code
  map.on('click', 'bfg', function (e) {
    new mapboxgl.Popup()
        .setLngLat(e.lngLat)
        .setHTML('<h2>' + 'Come high water' + '<br></h2><hr>' +  '<p>' + 'The Bloomsburg Fairgrounds have seen progressively worse flooding over the past sevearl decades. Experts blame climate change.' + '</p>')
        .addTo(map);
});

  // Setup the instance, pass callback functions
  scroller
    .setup({
      step: ".step",
      offset: 0.75,
      progress: true,
    })
    .onStepEnter((response) => {
      var chapter = config.chapters.find(
        (chap) => chap.id === response.element.id
      );
      response.element.classList.add("active");
      let thisZoom;
      if (smallMedia) {
        thisZoom = chapter.location.zoomSmall;
      } else {
        thisZoom = chapter.location.zoom;
      }
      thisLocation = {
        bearing: chapter.location.bearing,
        center: chapter.location.center,
        pitch: chapter.location.pitch,
        zoom: thisZoom,
      };
      map[chapter.mapAnimation || "flyTo"](thisLocation);
      if (config.showMarkers) {
        marker.setLngLat(chapter.location.center);
      }
      if (chapter.onChapterEnter.length > 0) {
        chapter.onChapterEnter.forEach(setLayerOpacity);
      }
      if (chapter.callback) {
        window[chapter.callback]();
      }
      if (chapter.rotateAnimation) {
        map.once("moveend", function () {
          const rotateNumber = map.getBearing();
          map.rotateTo(rotateNumber + 90, {
            duration: 24000,
            easing: function (t) {
              return t;
            },
          });
        });
      }
    })
    .onStepExit((response) => {
      var chapter = config.chapters.find(
        (chap) => chap.id === response.element.id
      );
      response.element.classList.remove("active");
      if (chapter.onChapterExit.length > 0) {
        chapter.onChapterExit.forEach(setLayerOpacity);
      }
    });
});

/* Here we watch for any resizing of the screen to
adjust our scrolling setup */
window.addEventListener("resize", scroller.resize);
