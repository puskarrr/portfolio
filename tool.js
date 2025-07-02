
// Initialize the map
var map = L.map('map', {
    center: [28.3949, 84.1240], // Approximate centre of Nepal
    zoom: 7
});

// ---- Base maps ---- //
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

var imagery = L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 17,
    attribution: 'Tiles © Esri'
});

var toner = L.tileLayer('https://{s}.tile.stamen.com/toner/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '© Stamen'
});

var baseMaps = {
    "OpenStreetMap": osm,
    "World Imagery": imagery,
    "Stamen Toner": toner
};

// ---- Overlay layers ---- //
var districtLayer = L.geoJSON(null, { style: {color: '#8B0000', weight: 1} });
var municipalityLayer = L.geoJSON(null, { style: {color: '#00008B', weight: 1} });
var wardLayer = L.geoJSON(null, { style: {color: '#006400', weight: 0.8} });

var overlays = {
    "Districts": districtLayer,
    "Municipalities": municipalityLayer,
    "Wards": wardLayer
};

L.control.layers(baseMaps, overlays, {position: 'topleft'}).addTo(map);

// ---- Load GeoJSON data ---- //
Promise.all([
    fetch('https://raw.githubusercontent.com/mesaugat/geoJSON-Nepal/master/nepal-districts.geojson').then(r => r.json()),
    fetch('https://raw.githubusercontent.com/mesaugat/geoJSON-Nepal/master/nepal-municipalities.geojson').then(r => r.json()),
    fetch('https://raw.githubusercontent.com/mesaugat/geoJSON-Nepal/master/nepal-wards.geojson').then(r => r.json())
]).then(([districts, municipalities, wards]) => {
    districtLayer.addData(districts);
    municipalityLayer.addData(municipalities);
    wardLayer.addData(wards);
    map.fitBounds(districtLayer.getBounds());
}).catch(err => console.error('Failed loading GeoJSON:', err));

// ---- Leaflet Draw setup ---- //
var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

var drawControl = new L.Control.Draw({
    position: 'topleft',
    draw: {
        circle: false,
        circlemarker: false,
        polyline: true,
        polygon: true,
        rectangle: true,
        marker: true
    },
    edit: { featureGroup: drawnItems }
});
map.addControl(drawControl);

// Measurement display element
var measurementEl = document.getElementById('measurement');

// Handle draw created event
map.on(L.Draw.Event.CREATED, function (event) {
    var layer = event.layer;
    drawnItems.addLayer(layer);

    var geojson = layer.toGeoJSON();
    var geomType = geojson.geometry.type;

    if (geomType === 'LineString' || geomType === 'MultiLineString') {
        var length = turf.length(geojson, {units: 'kilometers'});
        measurementEl.innerHTML = 'Length: ' + length.toFixed(3) + ' km';
    } else if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
        var areaSqM = turf.area(geojson);
        var areaSqKm = areaSqM / 1e6;
        measurementEl.innerHTML = 'Area: ' + areaSqKm.toFixed(3) + ' km²';
    } else {
        measurementEl.innerHTML = '';
    }
});

// ---- Buffer slider ---- //
var bufferRangeEl = document.getElementById('bufferRange');
var bufferValEl = document.getElementById('bufferVal');
// update label on input
bufferRangeEl.addEventListener('input', function () {
    bufferValEl.textContent = bufferRangeEl.value;
});

// ---- Spatial tools ---- //
document.getElementById('bufferBtn').addEventListener('click', function () {
    if (drawnItems.getLayers().length === 0) {
        alert('Draw a feature first.');
        return;
    }
    var dist = parseFloat(bufferRangeEl.value);
    var buffered = turf.buffer(drawnItems.toGeoJSON(), dist, {units: 'kilometers'});
    L.geoJSON(buffered, {style: {color: '#FF69B4'}}).addTo(map);
});

document.getElementById('centroidBtn').addEventListener('click', function () {
    if (drawnItems.getLayers().length === 0) {
        alert('Draw a polygon first.');
        return;
    }
    var centroid = turf.centroid(drawnItems.toGeoJSON());
    L.geoJSON(centroid, {
        pointToLayer: function (feature, latlng) {
            return L.marker(latlng, {title: 'Centroid'});
        }
    }).addTo(map);
});

document.getElementById('unionBtn').addEventListener('click', function () {
    if (drawnItems.getLayers().length < 2) {
        alert('Draw at least two polygons to union.');
        return;
    }
    var layers = drawnItems.getLayers();
    var unionFeature = turf.union(layers[0].toGeoJSON(), layers[1].toGeoJSON());
    L.geoJSON(unionFeature, {style: {color: '#FFA500'}}).addTo(map);
});

// ---- Querying attributes ---- //
var currentQueryLayer = null;
function setQueryLayer(layer, name) {
    currentQueryLayer = layer;
    document.getElementById('info').innerHTML = 'Query mode: ' + name + '. Click on the map to get attribute information.';
}

document.getElementById('districtQueryBtn').addEventListener('click', function(){ setQueryLayer(districtLayer, 'District'); });
document.getElementById('municipalityQueryBtn').addEventListener('click', function(){ setQueryLayer(municipalityLayer, 'Municipality'); });
document.getElementById('wardQueryBtn').addEventListener('click', function(){ setQueryLayer(wardLayer, 'Ward'); });

map.on('click', function (e) {
    if (!currentQueryLayer) return;
    var found = null;
    currentQueryLayer.eachLayer(function (layer) {
        // use turf booleanPointInPolygon for accuracy
        if (layer.feature && layer.feature.geometry && layer.feature.geometry.type.match(/Polygon/)) {
            if (turf.booleanPointInPolygon(turf.point([e.latlng.lng, e.latlng.lat]), layer.feature)) {
                found = layer;
            }
        } else if (layer instanceof L.Marker) {
            if (layer.getLatLng().equals(e.latlng)) {
                found = layer;
            }
        }
    });
    var infoEl = document.getElementById('info');
    if (found) {
        var props = found.feature.properties;
        var html = '<h4>Attributes</h4><table>';
        for (var key in props) {
            html += '<tr><td>' + key + '</td><td>' + props[key] + '</td></tr>';
        }
        html += '</table>';
        infoEl.innerHTML = html;
    } else {
        infoEl.innerHTML = 'No feature found at this location.';
    }
});
