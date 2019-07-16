const config = require('config');
const log = require('npmlog');
const passport = require('passport');
const session = require('express-session');

const JWTStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;

const {oidcDiscovery} = require('./discovery');

const userAuthenticationEnabled = () => {
  try {
    return config.get('userAuthentication.enabled').toLowerCase() === 'true';
  } catch (e) {
    log.warn('oidc init', 'Could not determine if User Authentication enabled, setting to false (disabled).');
    return false;
  }
};

const oidcEnabled = () => {
  try {
    return config.get('oidc.enabled').toLowerCase() === 'true';
  } catch (e) {
    log.warn('oidc init', 'Could not determine if OIDC enabled, setting to false (disabled).');
    return false;
  }
};

const oidcConfigured = () => {
  try {
    return (config.get('oidc.discovery').trim().length > 0 &&
      config.get('oidc.clientID').trim().length > 0 &&
      config.get('oidc.clientSecret').trim().length > 0 &&
      config.get('oidc.publicKey').trim().length > 0);
  } catch (e) {
    log.error('oidc init', 'OIDC is not properly configured');
    return false;
  }
};

const configured = () => {
  return userAuthenticationEnabled() && oidcEnabled() && oidcConfigured();
};

const userAuthenticationOidc = (expressApp) => {

  if (!configured()) {
    return;
  }

  expressApp.use(session({
    secret: config.get('oidc.clientSecret'),
    resave: false,
    saveUninitialized: true
  }));
  expressApp.use(passport.initialize());
  expressApp.use(passport.session());

  // Resolves OIDC Discovery values and sets up passport strategies
  oidcDiscovery().then(discovery => {
    // Add Passport JWT Strategy
    passport.use('jwt', new JWTStrategy({
      algorithms: discovery.token_endpoint_auth_signing_alg_values_supported,
      audience: config.get('oidc.clientID'),
      issuer: discovery.issuer,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('oidc.publicKey')
    }, (jwtPayload, done) => {
      if ((typeof (jwtPayload) === 'undefined') || (jwtPayload === null)) {
        return done('No JWT token', null);
      }

      done(null, {
        email: jwtPayload.email,
        familyName: jwtPayload.family_name,
        givenName: jwtPayload.given_name,
        jwt: jwtPayload,
        name: jwtPayload.name,
        preferredUsername: jwtPayload.preferred_username,
      });
    }));
  });

  passport.serializeUser((user, next) => next(null, user));
  passport.deserializeUser((obj, next) => next(null, obj));
};

module.exports = {userAuthenticationOidc};
