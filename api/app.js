const config = require('config');
const cors = require('cors');
const express = require('express');
const log = require('npmlog');
const morgan = require('morgan');

const msgService = require('./msgService/routes');
const utils = require('./components/utils');

const Problem = require('api-problem');

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: false}));

app.use(cors());
app.options('*', cors());

app.use(morgan(config.get('server.morganFormat')));

log.level = config.get('server.logLevel');
log.addLevel('debug', 1500, { fg: 'green' });

// Print out configuration settings in verbose startup
log.verbose(utils.prettyStringify(config));

// expose our service at this end point.
app.use('/api/v1', msgService);


// Handle 500
// eslint-disable-next-line no-unused-vars
app.use(function (err, req, res, next) {
  if (err.stack) {
    log.error(err.stack);
  }

  if (err instanceof Problem) {
    err.send(res, null);
  } else {
    let p = new Problem(500, 'Server Error', { detail: err.message } );
    p.send(res, null);
  }
});

// Handle 404
app.use(function (req, res) {
  let p = new Problem(404, 'Page Not Found', { detail: req.originalUrl } );
  p.send(res, null);
});

// Prevent unhandled errors from crashing application
process.on('unhandledRejection', err => {
  log.error(err.stack);
});

module.exports = app;
