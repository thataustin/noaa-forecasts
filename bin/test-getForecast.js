var argv = require('minimist')(process.argv.slice(2));
var moment = require('moment');
var noaaForecaster = require('../index');
var inspect = require('util').inspect;

var obj = {
  listLatLon: '38.99,-77.01 37.7833,-122.4167',
  product: 'time-series',
  begin: moment().format(),
  end: moment().add(3, 'days').format(),

  // Liquid Precipitation Amount
  qpf: 'qpf',

  // 12 hour probability of precipitation
  pop12: 'pop12'
};

var token = argv.token;
noaaForecaster.setToken(token);
noaaForecaster.getForecast(obj)
  .then(function(results) {
    console.log(inspect(results, { colors: true, depth: Infinity }));
  });