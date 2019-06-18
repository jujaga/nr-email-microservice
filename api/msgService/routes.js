const config = require('config');
const wrap = require('../middleware/wrap');
const {relatedLinks} = require('./relatedLinks');
const {upload} = require('../middleware/upload');

const {login} = require('../middleware/login');
const {authenticate} = require('../middleware/authenticate');
const {authorize} = require('../middleware/authorize');

const CREATE_MSG = config.get('services.cmsg.scopes.createMessage');

const routes = require('express').Router();

const {getConfig, getHealth, sendEmail, getEmailStatus, handleFiles} = require('./controller');

routes.get('/', function (req, res) {
  res.status(200).json({
    data: { ... config.get('service') },
    links: relatedLinks.createLinks(req, [
      {r:'config', m:'GET', p:'/config'},
      {r:'health', m:'GET', p:'/health'},
      {r:'email', m:'POST', p:'/email'},
      {r:'uploads', m:'POST', p:'/uploads'}
    ])
  });
});

routes.get('/config', wrap(async function (req, res) {
  await getConfig(req, res);
}));

routes.get('/health', login, wrap(async function (req, res) {
  await getHealth(req, res);
}));

routes.post('/email', login, authenticate, authorize(CREATE_MSG), wrap(async function (req, res, next) {
  await sendEmail(req, res, next);
}));

routes.get('/email/:messageId/status', login, authenticate, authorize(CREATE_MSG), wrap(async function (req, res) {
  await getEmailStatus(req, res);
}));

routes.post('/uploads', login, authenticate, authorize(CREATE_MSG), upload, wrap(async function (req, res) {
  await handleFiles(req, res);
}));

module.exports = routes;
