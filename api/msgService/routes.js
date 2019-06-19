const config = require('config');
const wrap = require('../middleware/wrap');
const {relatedLinks} = require('./relatedLinks');
const {upload} = require('../middleware/upload');

const {login} = require('../middleware/login');
const {authenticate} = require('../middleware/authenticate');
const {authorize} = require('../middleware/authorize');

const CREATE_MSG = config.get('cmsg.scopes.createMessage');

const routes = require('express').Router();

const {getConfig, getHealth, sendEmail, getEmailStatus, handleFiles} = require('./controller');

routes.get('/', function (req, res) {
  res.status(200).json({
    data: { ... config.get('service') },
    links: relatedLinks.createLinks(req, [
      {r:'config', m:'GET', p:'/config'},
      {r:'documentation', m:'GET', p:'/docs'},
      {r:'email', m:'POST', p:'/email'},
      {r:'health', m:'GET', p:'/health'},
      {r:'specs', m:'GET', p:'/api-spec.yaml'},
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

routes.get('/docs', function(req, res) {
  const docs = require('./docs');
  res.send(docs.getDocHTML('v1'));
});

routes.get('/api-spec.yaml', (req, res) => {
  res.sendFile(require('path').join(__dirname, './v1.api-spec.yaml'));
});
module.exports = routes;
