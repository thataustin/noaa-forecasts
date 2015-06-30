# noaa-forecasts
A Promised-based library for fetching forecast data from NOAA.  Promises are of the [Bluebird](https://github.com/petkaantonov/bluebird/blob/master/API.md) flavor.

### Install
npm install --save noaa-forecasts

### Quick Start

    1. Get an API key from NOAA (https://www.ncdc.noaa.gov/cdo-web/token)
    2. npm install noaa-forecasts
    3. var noaaForecaster = require('noaa-forecasts');
    4. read the docs below to figure out how which method to use :)

### .getForecast(apiParams) - using this library as a json formatter

With this method, you're simply passing API params through to the NOAA API (where this library does very little to change what you pass in other than formatting it for the api)

To do so, pass in any of the parameters found on the [NOAA REST API page](http://graphical.weather.gov/xml/rest.php)
The complete list of elementInputNames (ie, the data you actually care about) can be found [here](http://graphical.weather.gov/xml/docs/elementInputNames.php)

Here's an example from the test file in this code base:

    var moment = require('moment');
    var noaaForecaster = require('../index');
    var inspect = require('util').inspect;
    
    var obj = {
      listLatLon: '38.99,-77.01 37.7833,-122.4167',
      product: 'time-series', // this is a default, it's not actually required
      begin: moment().format('YYYY-MM-DDTHH:mm:ss'),
      end: moment().add(3, 'days').format('YYYY-MM-DDTHH:mm:ss'),
      qpf: 'qpf', // first elementInputName - Liquid Precipitation Amount
      pop12: 'pop12' // another elementInputName - 12 hour probability of precipitation    
    };
    
    var token = 'XXXXX-XXXXXXXX-XXXXXXXX-XXXXXX;
    noaaForecaster.setToken(token);
    noaaForecaster.getForecast(obj)
      .then(function(results) {
        console.log(inspect(results, { colors: true, depth: Infinity }));
      });


### .attachForecasts(businessObjects, forecastDetails) - adding a `.forecast` attribute to your business objects

The problem with using this library as a simple JSON formatter occurs when you have multiple points.  In your business data, you may have something like this:

    [
        { project: 1, lat: '33.00', lon: '-127.00' },
        { project: 2, lat: '33.00', lon: '-127.10' }
    ]

Where `project: 1` has meaning to you (though it has none to the NOAA API), and you'd really just like to attach a forecast to that `project: 1`.

Your best attempts to make an API call for both of those points (in the same call) will get you something back like this:

    [
        { 'Point1': /** forecast data **/, ... }
        { 'Point2': /** forecast data **/, ... }
    ]

That is, NOAA will name the points to Point1, Point2, etc... and give you no indication of which business object of yours the forecast is for.  You'd have to do either a comparison of the lat/lon's or something similar to what this method will do for you - carefully remember which points you passed in, in order, and then match them up with Point1, Point2, etc (which are also ordered).  Or, you can let this method do all that for you.

An example:

    var moment = require('moment');
    var noaaForecaster = require('../index');
    var inspect = require('util').inspect;

    // forecast details are applied to all the business objects.  The goal being to only make 1 request, for efficiency
    var forecastDetails = {
      product: 'time-series',  // this is a default, it's not actually required
      begin: moment().format(),
      end: moment().add(3, 'days').format(),
      qpf: 'qpf', // Liquid Precipitation Amount
      pop12: 'pop12' // 12 hour probability of precipitation
    };

    // each object must have a lat and a lon
    var myGeoBusinessObjects = [
      { project: 1, lat: '38.99', lon: '-77.01' },
      { project: 2, lat: '38.99', lon: '-77.01' }
    ];

    var token = 'XXXXX-XXXXXXXX-XXXXXXXX-XXXXXX;
    noaaForecaster.setToken(token);
    noaaForecaster.attachForecasts(myGeoBusinessObjects, forecastDetails)
      .then(function(results) {
        console.log(inspect(results, { colors: true, depth: Infinity }));
      });

I encourage you to simply log the results to see how the data is formatted for your points.

**NOTE**: This method returns the original object, NOT a copy!
**NOTE**: The location returned in the appended forecast object is the location that NOAA used, not the one you passed in.  They may not be the same if NOAA truncated some of the decimal places.

### test
To manually test, run one of the following

    node bin/test-getForecast.js --token=[token]
    node bin/test-attachForecasts.js --token=[token]

with the token you got from NOAA from [here](https://www.ncdc.noaa.gov/cdo-web/token)

Play around with the parameters in those files to get a feel for how it works.