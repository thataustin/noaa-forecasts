var argv = require('minimist')(process.argv.slice(2));
var moment = require('moment');
var noaaForecaster = require('../index');
var inspect = require('util').inspect;

var myBusinessObjects = [
  {project_id: 1, lat: '38.99', lon: '-77.01'},
  {project_id: 2, lat: '37.7833', lon: '-122.4167'}
];

var forecastDetails = {
  product: 'time-series',
  begin: moment().format(),
  end: moment().add(3, 'days').format(),
  qpf: 'qpf', // Liquid Precipitation Amount
  pop12: 'pop12' // 12 hour probability of precipitation
};

var token = argv.token;
noaaForecaster.setToken(token);
noaaForecaster.attachForecasts(myBusinessObjects, forecastDetails)
  .then(function(results) {
    console.log(inspect(results, { colors: true, depth: Infinity }));
  });