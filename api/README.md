# Email Microservice OpenShift

The Email Microservice is a [node.js](https://nodejs.org/) server that demonstrates how one could call the Common Messaging Service (CMSG) and integrate it into an application.

## API Documentation
The API is documented in Open API 3.  The documentation can be viewed/downloaded from a running instance at /api/v1/docs path.  View the [api spec yaml](./msgService/v1.api-spec.yaml).

### Prerequisites
Since Common Messaging Service (CMSG) is authenticated and authorized with [WebADE](http://webade.org), we need to have our application (MSSC) authorized to call CMSG.  To do this, we can use [Get Token](https://github.com/bcgov/nr-get-token) to create a service client.  This will give us a service client id and password for a particular Common Services environment.  We will need the WebADE OAuth Token url and the CMSG url for that environment.

#### User Authentication, JWT, and Open ID Connect
Access to the microservice can be further secured by implementing a [JavaScript Web Token (JWT)](https://jwt.io/introduction/) authentication scheme.  We have provided an example using [Open ID Connect (OIDC)](https://en.wikipedia.org/wiki/OpenID_Connect) provided by a Key Cloak realm.  See [nr-messaging-service-showcase](https://github.com/bcgov/nr-messaging-service-showcase) for more on securing a front end and passing the JWT to the nr-email-microservice to verify.  Both the frontend and this api must be configured to use the same source of truth.  This is completely optional and can be bypassed completely.

We use [passport](https://www.npmjs.com/package/passport) as the authentication middleware when User Authentication is enabled and configured.

The current implementation does not check scopes or roles, it simply verifies that a user has been authenticated with the configured source of truth.  The /email, /email/:messageId/status and /uploads routes are protected when user authorization is enabled.

### Configuration
To configure the application for local development, we have a few options.  Since we are using the npm library: [config](https://www.npmjs.com/package/config), to configure our application.  We can either set environment variables to be picked up by [custom-environment-variables.json](/config/custom-environment-variables.json) or we can create a local configuration file (do not check into source control) such as local.json.  Please read the config library documentation to see how it overlays various environment files and uses environment variables to override those values (when provided).

#### Environment Variables
| Name | Default | Description |
| --- | --- | --- |
| OAUTH_TOKEN_URL | | The WebADE environment OAuth Token url (ex. https://i1api.nrs.gov.bc.ca/oauth2/v1/oauth/token) |
| CMSG_TOP_LEVEL_URL | | The CMSG url (ex. https://i1api.nrs.gov.bc.ca/cmsg-messaging-api/v1/) |
| CMSG_CLIENT_ID | | This is the service client id for microservice that has been authorized to call CMSG. |
| CMSG_CLIENT_SECRET | | The service client password/secret |
| HOST_URL | http://localhost:8080 | The domain/base url where we will expose the api. |
| PORT | 8080 | port for node to listen on. |
| SERVICE_VERSION | 1 | Current default 1 |
| SERVICE_HOMEPAGE | https://github.com/bcgov/nr-email-microservice.git | Should point at the repository for the deployed code. |
| SERVER_LOGLEVEL | info | set the npm log level (verbose, debug, info, warn, error). |
| SERVER_MORGANFORMAT | dev | set the logging format for Morgan. |
| UPLOADS_PATH | ./uploads | path to store the uploaded files. |
| UPLOADS_FIELD_NAME | files | upload file configuration, which form/request fields to use for the file uploads. |
| UPLOADS_FILE_SIZE | 5242880 | limit the accepted size of files (in bytes). |
| UPLOADS_FILE_COUNT | 3 | limit the number of files to accept in one upload. |
| UPLOADS_FILE_TYPE | pdf'| limit the accepted file types.  Default of 'pdf' is a current limitation of CMSG. |
| CMSG_SENDER | 'NR.CommonServiceShowcase@gov.bc.ca' | default email address to use as the sender/from. |

##### (Optional) User Authentication Configuration
| Name | Default | Description |
| --- | --- | --- |
| USER_AUTHENTICATION_ENABLED | false | Enable/Disable the user authentication setup and middleware |
| OIDC_ENABLED | false | Indicate whether OIDC is to be used |
| OIDC_DISCOVERY | | Url to the OIDC issuer realm discovery mechanism |
| OIDC_CLIENT_ID | | OIDC Client ID |
| OIDC_CLIENT_SECRET | | OIDC Client Password/Secret |
| JWT_PUBLICKEY | | OIDC Realm public key |

Notes: USER\_AUTHENTICATION\_ENABLED and OIDC\_ENABLED must be true, and all the other OIDC configuration must be completed to fully load the User Authentication mechanism.  For local development, the JWT\_PUBLIC\_KEY will require line breaks ("\\n") and the "-----BEGIN PUBLIC KEY-----" and "-----END PUBLIC KEY-----" delimiters.

#### local.json (with User Auth)

```json
{
  "server": {
    "logLevel": "verbose"
  },
  "cmsg": {
    "urls": {
      "token": "https://i1api.nrs.gov.bc.ca/oauth2/v1/oauth/token",
      "root": "https://i1api.nrs.gov.bc.ca/cmsg-messaging-api/v1/"
    },
    "client": {
      "id": "<The Service Client Id>",
      "secret": "<The Service Client password>"
    }
  },
  "userAuthentication": {
    "enabled": "true"
  },
  "oidc": {
    "enabled": "true",
    "discovery": "https://sso-dev.pathfinder.gov.bc.ca/auth/realms/98123d34df/.well-known/openid-configuration",
    "clientID": "<The OIDC Service Client Id>",
    "clientSecret": "<The OIDC Service Client password>",
    "publicKey": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtWiqVQ/eshPxJEkgJ/VH48ZwP7mAtnDtVnHH\n7WpgduJ9pgf/Yz9ptw0kaAWJG6XHBKe4RPl6JHLOslQqezR22j/nomVCaAPKPRKnu39nt4yoahV0JKFSoV\nOgImG1SGBfTmqnmUEoo281bWO27ollpeH4IfP9kgyk557fuhGI2d2ugqFqtlgBFrchp7uPRv45Ab1g9If\nOe9REX53cvVZNEIfkb5rKVWc6F1DsPI213E5ywsAb6cAmwb6yZgHvu9b03IkDGgUT84HBghrYoyhmaLi\nB7F1Lq4x3HjJ7GtMFB7EiBaNkLW49CMv5NOpUDmYf89XsOUBoVFVXqehxkastTwIDAQAB\n-----END PUBLIC KEY-----\n"
  },

}
```

### Notes

The entry point for the application is `bin/www`. This is the server.  `app.js` configures the routing and how requests will be handled.

Since CMSG can handle attachments, we have a file upload endpoint.  We are using [multer](https://www.npmjs.com/package/multer) and we wrap that in our own piece of middleware [upload.js](middleware/upload.js).

To get our application authorized, we need to call WebADE with our credentials and check that we have the correct permissions (scopes) for CMSG.  This is handled in [webadeSvc](oauthService/webadeSvc.js).

The demonstration and usage of CMSG is in [cmsgSvc](msgService/cmsgSvc.js).  Note that in sendEmail, the attachments is a listing of paths to previously uploaded files.

## Project scripts

Assumption is you have installed node 10.15.3 and npm 6.4.1.

``` sh
cd api
npm install
```

### Run the server

``` sh
npm run start
```

The application will be accessible at http://localhost:8080/api/v1/

