var noaaForecaster = require('../index');

var obj = {
  datasetid: 'GHCND',
  stationid: 'GHCND:US1NCBC0005',
  startdate: '2015-05-01',
  enddate: '2015-05-01',
  includemetadata: false
};

noaaForecaster.setToken();
noaaForecaster.getForecast(obj)
  .then(function(results) {
    console.log('DEBUG: results', results.data);
  })
  .catch(function (err) {
    console.log('DEBUG: err', err);
  });