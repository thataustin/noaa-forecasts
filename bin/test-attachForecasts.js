var argv = require('minimist')(process.argv.slice(2));
var moment = require('moment');
var noaaForecaster = require('../index');
var inspect = require('util').inspect;

var myBusinessObjects = [
  {project_id: 1, lat: 37.8689206763912, lon: -122.303384194185},
  {project_id: 2, lat: 37.8678778913623, lon: -122.302314443276},
  {project_id: 3, lat: 37.8678778913624, lon: -122.302314443277}
];

var forecastDetails = {
  begin: moment().format('YYYY-MM-DDTHH:mm:ss'),
  end: moment().add(3, 'days').format('YYYY-MM-DDTHH:mm:ss'),
  qpf: 'qpf', // Liquid Precipitation Amount
  pop12: 'pop12' // 12 hour probability of precipitation
};

var token = argv.token;
noaaForecaster.setToken(token);
noaaForecaster.attachForecasts(myBusinessObjects, forecastDetails)
  .then(function(results) {
    console.log(inspect(results, { colors: true, depth: Infinity }));
  });