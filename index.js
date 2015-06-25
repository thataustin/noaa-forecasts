var restling = require('restling');
var BluebirdPromise = require('bluebird');
var querystring = require('querystring');
var url = require('url');

var noaaForecaster = {

  _token: false,
  _baseUrl: 'www.ncdc.noaa.gov/cdo-web/api/v2',
  _protocol: 'http',

  setToken: function (token) {
    this._token = token;
  },

  /**
   * @param options {Object} - any options that go with the given noaa endpoint per their docs
   * @return {String} - urlString
   */
  getForecast: function (options) {
    if (!this._token) { return BluebirdPromise.reject('Must call setToken before calling get.'); }

    var url = this._convertOptionsToUrlString('data', options);

    return restling.get(url, {headers: this._getHeaders()} );
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

  _getHeaders: function () {
    return {
      token: this._token
    }
  }
};

module.exports = noaaForecaster;