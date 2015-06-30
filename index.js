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
        var listLatLon = this._getLatLonList(geoBusinessObjects);
        var options = _.extend({}, forecastDetails, { listLatLon: listLatLon});
        var url = this._convertOptionsToUrlString('data', options);
        return this._makeCall(url);
      })
      .then(function(forecastPerPoint) {
        return this._attachForecastsToBusinessObjects(geoBusinessObjects, forecastPerPoint);
      });
  },

  _addDefaultOptions: function (options) {
    options.product = options.product || 'time-series';
    return options;
  },

  _attachForecastsToBusinessObjects: function (geoBusinessObjects, forecastPerPoint) {
    var i = 1, curr;

    // This is tricky, but start at one, this time so we can use `i` as
    // part of the string in the point name (eg, point1)
    while (i <= geoBusinessObjects.length) {
      curr = geoBusinessObjects[i - 1];
      curr.forecast = forecastPerPoint['point' + i];
      i++;
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
      .then(function(forecasts) {
        if (! (forecasts && forecasts.data) ) {
          throw new Error('No forecasts found');
        }

        var forecastData = forecasts.data;

        if (/^<error>/.test(forecastData) ) {
          throw new Error(forecastData);
        }
        return dwmlParser.parse(forecastData);
      });
  },

  _getHeaders: function () {
    return { token: this._token};
  }
};

module.exports = noaaForecaster;