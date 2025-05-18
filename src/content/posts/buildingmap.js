<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width" />
        <script
            is:inline
            src="https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.js"
        ></script>
        <link
            href="https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css"
            rel="stylesheet"
        />
        <title>{pageTitle}</title>
    </head>
    <body>
        <Header />
        <div id="map" style="width: 600px; height: 400px; position:relative">
            <nav id="filter-group" class="filter-group"></nav>;
            <div id="right" class="sidebar flex-center right collapsed">
                <div class="sidebar-content rounded-rect flex-center">
                    Right Sidebar
                    <div
                        class="sidebar-toggle rounded-rect right"
                        onclick="toggleSidebar('right')"
                    >
                        &larr;
                    </div>
                </div>
            </div>
        </div>
        <script>
            const oysource = "public/otherYerevan.geojson";
            const bounds = [
                [43.18240859, 38.57491379], // Southwest coordinates
                [47.2559895, 41.41826072], // Northeast coordinates
            ];

            function toggleSidebar(id) {
                const elem = document.getElementById(id);
                const classes = elem.className.split(" ");
                const collapsed = classes.indexOf("collapsed") !== -1;

                let padding: { [key: number]: number } = {};

                if (collapsed) {
                    // Remove the 'collapsed' class from the class list of the element, this sets it back to the expanded state.
                    classes.splice(classes.indexOf("collapsed"), 1);

                    padding[id] = 300; // In px, matches the width of the sidebars set in .sidebar CSS class
                    map.easeTo({
                        padding,
                        duration: 1000, // In ms, CSS transition duration property for the sidebar matches this value
                    });
                } else {
                    padding[id] = 0;
                    // Add the 'collapsed' class to the class list of the element
                    classes.push("collapsed");

                    map.easeTo({
                        padding,
                        duration: 1000,
                    });
                }

                // Update the class list on the element
                elem.className = classes.join(" ");
            };

            const filterGroup = document.getElementById("filter-group");
            const map = new maplibregl.Map({
                container: "map",
                /* stylesheet location. This is a local hosted stylesheet based on openfreemap, 
                where sprite has been changed to custum one.
                https://github.com/maplibre/maplibre-gl-js/discussions/3243 */
                style: "https://tiles.openfreemap.org/styles/positron", //'https://tiles.openfreemap.org/styles/positron'
                center: [44.51342921, 40.18029564], // starting position [lng, lat]
                zoom: 10, // starting zoom
                minZoom: 5,
                maxZoom: 16,
                maxBounds: bounds, // Sets bounds as max
            });
            let hoveredStateId: any = null;

            map.on("load", async () => {
                /* Find the index of the first symbol layer in the map style to place out own. Not used as the layer postion is set manually.
                const layers = map.getStyle().layers;
                let firstSymbolId;
                for (let i = 0; i < layers.length; i++) {
                if (layers[i].type === 'symbol') {
                firstSymbolId = layers[i].id;
                break;
            }} */
                Image = await map.loadImage("public/icons/pin.png");
                map.addImage("pin", Image.data);

                Image = await map.loadImage("public/icons/pin2.png");
                map.addImage("pin2", Image.data);

                Image = await map.loadImage("public/icons/icon-listed.png");
                map.addImage("icon-listed", Image.data);

                Image = await map.loadImage("public/icons/icon-listed2.png");
                map.addImage("icon-listed2", Image.data);

                const response = await fetch(oysource);
                const data = await response.json();

                // Add a GeoJSON source containing place coordinates and information.
                map.addSource("oy", {
                    type: "geojson",
                    data: data,
                    generateId: true, //Ensures that all features have unique IDs
                    cluster: true, // Ensures that the point_count_abbreviated is generated
                    clusterMaxZoom: 14, // Max zoom to cluster points on
                    clusterRadius: 50, // Radius of each cluster when clustering points (defaults to 50)
                });

                //create cluster rings
                map.addLayer({
                    id: "clusters",
                    type: "circle",
                    source: "oy",
                    filter: ["has", "point_count"],
                    paint: {
                        "circle-color": "#11b4da",
                        "circle-radius": [
                            "step",
                            ["get", "point_count"],
                            20,
                            100,
                            30,
                            750,
                            40,
                        ],
                    },
                });

                // add count number on cluster rings
                map.addLayer({
                    id: "cluster-count",
                    type: "symbol",
                    source: "oy",
                    filter: ["has", "point_count"],
                    layout: {
                        "text-field": "{point_count_abbreviated}",
                        "text-font": ["Noto Sans Regular"],
                        "text-size": 12,
                    },
                });

                // Add a symbol layer
                map.addLayer(
                    {
                        id: "unclustered-points",
                        type: "symbol",
                        source: "oy",
                        filter: ["!", ["has", "point_count"]],
                        //filter: ["==", ["get", "tag"], ["literal", ["pin", "pin2"]]],
                        layout: {
                            "icon-image": ["get", "tag"],
                            "icon-size": 1,
                            "icon-allow-overlap": true,

                            //'text-field': "id",
                            //'text-font': ['Noto Sans Regular'],
                            //'text-offset': [0, 1.25],
                            //'text-size': 12,
                            //'text-anchor': 'top',
                        },
                        paint: {
                            "icon-opacity": [
                                "case",
                                ["boolean", ["feature-state", "hover"], false],
                                0.5,
                                1,
                            ],
                        },
                    },
                    "boundary_disputed", //firstSymbolId
                );

                /* The above layer with circles
                        map.addLayer({
                            id: 'unclustered-points',
                            type: 'circle',
                            source: 'oy',
                            filter: ['!', ['has', 'point_count']],
                            paint: {
                                'circle-color': [
                                "case",
                                ['boolean', ['feature-state', 'hover'], false],
                                '#0b7993',
                                '#11b4da'
                                ],
                                'circle-radius': 4,
                                'circle-stroke-width': 1,
                                'circle-stroke-color': '#fff'}*/

                // this function will be called whenever a checkbox is toggled
                const updateLayerFilter = () => {
                    // get an array of icon names that corresponds to the currently checked checkboxes
                    const checkedSymbols = [
                        ...document.getElementsByTagName("input"),
                    ]
                        .filter((el) => el.checked)
                        .map((el) => el.id);


                    // use an 'in' expression to filter the layer
                    //map.setFilter("unclustered-points", ["in","tag",...checkedSymbols,]);
                    const checkedSymbolsSet = new Set(checkedSymbols);

                    let dataupdated = {
                        type: "FeatureCollection",
                        features: [],
                    };
                    dataupdated.features = data.features.filter((feature) =>
                        checkedSymbolsSet.has(feature.properties.tag),
                    );
                    map.getSource("oy").setData(dataupdated);
                };

                // create set to hold the unique values
                const symbols = new Set(["icon-listed", "pin", "pin2", "icon-listed2"]); 
                const categories = new Set(["constructivism", "soviet modernism", "independence", "early soviet", "tamanian", "tsarism", "persian", "Medieval", "ancient", "tamanian,soviet modernism" ]);
                // get an array of all unique `icon` properties
                // data.features.forEach((item) => {symbols.add(item.properties.tag);});

                // for each `icon` value, create a checkbox and label
                for (const symbol of symbols) {
                    const input = document.createElement("input");
                    input.type = "checkbox";
                    input.id = symbol;
                    input.checked = true;
                    filterGroup.appendChild(input);

                    const label = document.createElement("label");
                    label.setAttribute("for", symbol);
                    label.textContent = symbol;
                    filterGroup.appendChild(label);                  
                                       
                    // When any checkbox changes, update the filter.
                    input.addEventListener("change", updateLayerFilter);
                };

                // for each `icon` value, create a checkbox and label
                for (const category of categories) {
                    const input = document.createElement("input");
                    input.type = "checkbox";
                    input.id = category;
                    input.checked = true;
                    filterGroup.appendChild(input);

                    const label = document.createElement("label");
                    label.setAttribute("for", category);
                    label.textContent = category;
                    filterGroup.appendChild(label);                  
                                       
                    // When any checkbox changes, update the filter.
                    input.addEventListener("change", updateLayerFilter);
                };

                // inspect a cluster on click
                map.on("click", "clusters", async (e: any) => {
                    const features = map.queryRenderedFeatures(e.point, {
                        layers: ["clusters"],
                    });
                    const clusterId = features[0].properties.cluster_id;
                    const zoom = await map
                        .getSource("oy")
                        .getClusterExpansionZoom(clusterId);
                    map.easeTo({
                        center: features[0].geometry.coordinates,
                        zoom,
                    });
                });

                // When the user moves their mouse over the unclustered-points layer, we'll update the
                // feature state for the feature under the mouse.
                map.on("mousemove", ["unclustered-points"], (e: any) => {
                    if (e.features.length > 0) {
                        if (hoveredStateId) {
                            map.setFeatureState(
                                {
                                    source: "oy",
                                    id: hoveredStateId,
                                },
                                { hover: false },
                            );
                        }
                        hoveredStateId = e.features[0].id;
                        map.setFeatureState(
                            { source: "oy", id: hoveredStateId },
                            { hover: true },
                        );
                    }
                });

                // When the mouse leaves the state-fill layer, update the feature state of the
                // previously hovered feature.
                map.on("mouseleave", ["unclustered-points"], () => {
                    if (hoveredStateId) {
                        map.setFeatureState(
                            { source: "oy", id: hoveredStateId },
                            { hover: false },
                        );
                    }
                    hoveredStateId = null;
                });

                // When a click event occurs on a feature in the unclustered-point layer, open a popup at
                // the location of the feature, with description HTML from its properties.
                map.on("click", ["unclustered-points"], (e: any) => {
                    const coordinates =
                        e.features[0].geometry.coordinates.slice();
                    const title = e.features[0].properties.title_en;

                    function decodeHtml(html: string): string {
                        return new DOMParser().parseFromString(
                            html,
                            "text/html",
                        ).body.textContent as string;
                    }
                    const description = decodeHtml(
                        e.features[0].properties.annotation_en,
                    );

                    // Ensure that if the map is zoomed out such that
                    // multiple copies of the feature are visible, the
                    // popup appears over the copy being pointed to.
                    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                        coordinates[0] +=
                            e.lngLat.lng > coordinates[0] ? 360 : -360;
                    }

                    new maplibregl.Popup()
                        .setLngLat(coordinates)
                        .setHTML(`<b> ${title} </b><br>${description}`)
                        .addTo(map);
                });

                map.on("mouseenter", ["clusters", "unclustered-points"], () => {
                    map.getCanvas().style.cursor = "pointer";
                });
                map.on("mouseleave", ["clusters", "unclustered-points"], () => {
                    map.getCanvas().style.cursor = "";
                });
            });
        </script>
        <Footer />
        <script>
            import "../scripts/menu.js";
        </script>
        <style>
            .maplibregl-popup {
                max-width: 400px;
                font:
                    12px/20px "Helvetica Neue",
                    Arial,
                    Helvetica,
                    sans-serif;
            }

            .filter-group {
                font:
                    12px/20px "Helvetica Neue",
                    Arial,
                    Helvetica,
                    sans-serif;
                font-weight: 600;
                position: absolute;
                bottom: 10px;
                left: 10px;
                z-index: 1;
                border-radius: 10px;
                width: 120px;
                color: #ffffff;
                background-color: #3386c0;
            }

            .filter-group input[type="checkbox"]:first-child + label {
                border-radius: 3px 3px 0 0;
            }

            .filter-group label:last-child {
                border-radius: 0 0 3px 3px;
                border: none;
            }

            .filter-group input[type="checkbox"] {
                display: none;
            }

            .filter-group input[type="checkbox"] + label {
                background-color: #3386c0;
                display: block;
                cursor: pointer;
                padding: 10px;
                border-bottom: 1px solid rgba(0, 0, 0, 0.25);
            }

            .filter-group input[type="checkbox"] + label {
                background-color: #3386c0;
                text-transform: uppercase;
            }

            .filter-group input[type="checkbox"] + label:hover,
            .filter-group input[type="checkbox"]:checked + label {
                background-color: #4ea0da;
            }

            .filter-group input[type="checkbox"]:checked + label:before {
                content: "✔";
                margin-right: 5px;
            }

            .rounded-rect {
                background: white;
                border-radius: 10px;
                box-shadow: 0 0 50px -25px black;
            }

            .flex-center {
                position: absolute;
                display: flex;
                justify-content: center;
                align-items: center;
            }

            .flex-center.left {
                left: 0px;
            }

            .flex-center.right {
                right: 0px;
            }

            .sidebar-content {
                position: absolute;
                width: 95%;
                height: 95%;
                font-family: Arial, Helvetica, sans-serif;
                font-size: 32px;
                color: gray;
            }

            .sidebar-toggle {
                position: absolute;
                width: 1.3em;
                height: 1.3em;
                overflow: visible;
                display: flex;
                justify-content: center;
                align-items: center;
            }

            .sidebar-toggle.left {
                right: -1.5em;
            }

            .sidebar-toggle.right {
                left: -1.5em;
            }

            .sidebar-toggle:hover {
                color: #0aa1cf;
                cursor: pointer;
            }

            .sidebar {
                transition: transform 1s;
                z-index: 1;
                width: 300px;
                height: 100%;
            }

            /*
  The sidebar styling has them "expanded" by default, we use CSS transforms to push them offscreen
  The toggleSidebar() function removes this class from the element in order to expand it.
*/
            .left.collapsed {
                transform: translateX(-295px);
            }

            .right.collapsed {
                transform: translateX(295px);
            }
        </style>
    </body>
</html>
