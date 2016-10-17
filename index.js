var restling = require('restling');
var _ = require('underscore');
var BluebirdPromise = require('bluebird');
var querystring = require('querystring');
var url = require('url');
var dwmlParser = require('dwml-to-json');

var noaaForecaster = {

  _token: false,
  _baseUrl: 'graphical.weather.gov/xml/sample_products/browser_interface/ndfdXMLclient.php',
  _protocol: 'http',

  setToken: function (token) {
    this._token = token;
  },

  /**
   * @param options {Object} - NOAA api params describing what sort of environmental data to retrieve
   * @return {String} - urlString
   */
  getForecast: function (options) {
    if (!this._token) { return BluebirdPromise.reject('Must call setToken before calling get.'); }
    options = this._addDefaultOptions(options);
    var url = this._convertOptionsToUrlString('data', options);
    return this._makeCall(url);
  },

  /**
   * @param geoBusinessObjects {Array} - each object must have a lat and a lon
   * @param forecastDetails {Object} - NOAA api params describing what sort of environmental data to retrieve
   */
  attachForecasts: function (geoBusinessObjects, forecastDetails) {
    if (!this._token) { return BluebirdPromise.reject('Must call setToken before calling get.'); }
    forecastDetails = this._addDefaultOptions(forecastDetails);

    return this._validateGeoObjects(geoBusinessObjects).bind(this)
      .then(function() {
        return this._getForecastPerPoint(geoBusinessObjects, forecastDetails);
      })
      .then(this._attachForecastsToBusinessObjects.bind(this, geoBusinessObjects));
  },

  _addDefaultOptions: function (options) {
    options.product = options.product || 'time-series';
    return options;
  },

  _getForecastPerPoint(geoBusinessObjects, forecastDetails) {
    var chunkSize = 200;
    var i, forecastPerPointInChunks = [];
    for ( i = 0; i < geoBusinessObjects.length; i += chunkSize) {
      var listLatLon = this._getLatLonList(geoBusinessObjects.slice(i,i+chunkSize));
      var options = _.extend({}, forecastDetails, { listLatLon: listLatLon});
      var url = this._convertOptionsToUrlString('data', options);
      forecastPerPointInChunks.push(this._makeCall(url));
    }

    return BluebirdPromise.all(forecastPerPointInChunks)
      .then(_.flatten)
      .then(_.first);
  },

  _attachForecastsToBusinessObjects: function (geoBusinessObjects, forecastPerPoint) {
    var j = 1, curr, key, loc;

    var forecastByLoc = {};
    _.each(forecastPerPoint, (forecastForPoint, point) => {
      console.log(forecastPerPoint)
      loc = forecastForPoint.location;
      forecastByLoc[loc.latitude + ',' + loc.longitude] = forecastForPoint;
    });


    // This is tricky, but start at one, this time so we can use `j` as
    // part of the string in the point name (eg, point1)
    while (j <= geoBusinessObjects.length) {
      curr = geoBusinessObjects[j - 1];
      key = curr.lat.toFixed(2) + ',' + curr.lon.toFixed(2);

      if (_.has(forecastByLoc, key)) {
        curr.forecast = forecastByLoc[key];
      }

      j++;
    }


    return geoBusinessObjects;
  },

  _validateGeoObjects: function (geoBusinessObjects) {
    return BluebirdPromise.map(geoBusinessObjects, function (obj) {
      if (!obj.lat && obj.lon) {
        throw new Error('All geo business objects must have a lat and a lon');
      }
    });
  },

  /**
   * @param geoBusinessObjects
   * @return {String} - space-separated lat/lon list formatted for NOAA REST API
   *   eg: '37.00,-127.00 36.00,-127.10'
   */
  _getLatLonList: function (geoBusinessObjects) {
    var list = [], i = 0, curr;

    // We must maintain the order as we build the string, so loop through old-school
    while (i < geoBusinessObjects.length) {
      curr = geoBusinessObjects[i];
      list.push([curr.lat, curr.lon].join(','));
      i++;
    }

    return list.join(' ');
  },

  _convertOptionsToUrlString: function (noaaEndpoint, options) {

    var uriEncoder = function(a) { return a; };
    var q = querystring.stringify(options, null, null, { encodeURIComponent: uriEncoder });

    var urlObj = {
      protocol: this._protocol,
      host: this._baseUrl,
      search: q,
      pathname: '/' + noaaEndpoint
    };

    return url.format(urlObj);
  },

  _makeCall: function (url) {
    return restling.get(url, {headers: this._getHeaders()} )
      .bind(this)
      .then(function(forecasts) {
        if (! (forecasts && forecasts.data) ) {
          throw new Error('No forecasts found');
        }

        var forecastData = forecasts.data;

        if (/^<error>/.test(forecastData) ) {
          console.log(forecastData);

          var newUrl = this._parseErrorAndRemoveLocationsOutsideNOAACoverageFromURL(forecastData, url);
          if (newUrl) {
            return this._makeCall(newUrl);
          }

          throw new Error(forecastData);
        }
        return dwmlParser.parse(forecastData);
      });
  },

  _parseErrorAndRemoveLocationsOutsideNOAACoverageFromURL: function (forecastData, url) {
    var badLatLon = /^<error><h2>ERROR<\/h2><pre>Point with latitude .* longitude .* is not on an NDFD grid/.exec(forecastData);
    return badLatLon && badLatLon.length ? this._removeLocationsOutsideNOAACoverageFromURL(badLatLon, url) : null;
  },

  _getHeaders: function () {
    return { token: this._token};
  },

  _removeLocationsOutsideNOAACoverageFromURL (badLatLon, url) {
    var latIndex = badLatLon[0].indexOf('latitude') + 10;
    var lonIndex = badLatLon[0].indexOf('longitude') + 11;
    var lengthOfLat = badLatLon[0].indexOf('longitude') - latIndex - 2;
    var lengthOfLon = badLatLon[0].indexOf('is not on an NDFD grid') - lonIndex - 2;
    var lat = badLatLon[0].substr(latIndex, lengthOfLat);
    var lon = badLatLon[0].substr(lonIndex, lengthOfLon);
    var badLatLonStrOpt1 = ' ' + lat + ',' + lon;
    var badLatLonStrOpt2= '=' + lat + ',' + lon + ' ';

    console.log('Found that' + badLatLonStrOpt1 + ' is not a valid latLon pair for NOAA (probably outside U.S.A.). Reprocessing without it.');
    return url.indexOf(badLatLonStrOpt1) > 0 ? url.replace(badLatLonStrOpt1, '') :  url.replace(badLatLonStrOpt2, '=');
  }
};

module.exports = noaaForecaster;
