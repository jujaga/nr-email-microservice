# Email Microservice OpenShift

The Email Microservice is a [node.js](https://nodejs.org/) server that demonstrates how one could call the Common Messaging Service (CMSG) and integrate it into an application.

## API Documentation
The API is documented in Open API 3.  The documentation can be viewed/downloaded from a running instance at /api/v1/docs path.  View the [api spec yaml](./msgService/v1.api-spec.yaml).

### Prerequisites
Since Common Messaging Service (CMSG) is authenticated and authorized with [WebADE](http://webade.org), we need to have our application (MSSC) authorized to call CMSG.  To do this, we can use [Get Token](https://github.com/bcgov/nr-get-token) to create a service client.  This will give us a service client id and password for a particular Common Services environment.  We will need the WebADE OAuth Token url and the CMSG url for that environment.

### Configuration
To configure the application for local development, we have a few options.  Since we are using the npm library: [config](https://www.npmjs.com/package/config), to configure our application.  We can either set environment variables to be picked up by [custom-environment-variables.json](/config/custom-environment-variables.json) or we can create a local configuration file (do not check into source control) such as local.json.  Please read the config library documentation to see how it overlays various environment files and uses environment variables to override those values (when provided).

#### Environment Variables

* OAUTH\_TOKEN\_URL - The WebADE environment OAuth Token url (ex. https://i1api.nrs.gov.bc.ca/oauth2/v1/oauth/token)
* CMSG\_TOP\_LEVEL\_URL - The CMSG url (ex. https://i1api.nrs.gov.bc.ca/cmsg-messaging-api/v1/)
* CMSG\_CLIENT\_ID - This is the service client id for MSSC that has been authorized to call CMSG.
* CMSG\_CLIENT\_SECRET - The service client password/secret

* HOST\_URL - The domain/base url where we will expose the api. Default is http://localhost:8080
* PORT - port for node to listen on. Default is 8080.
* SERVICE\_VERSION - Current default 1
* SERVICE\_HOMEPAGE - Should point at the repository for the deployed code.  Default https://github.com/bcgov/nr-email-microservice.git
* SERVER\_LOGLEVEL - set the npm log level (verbose, debug, info, warn, error). Default is info
* SERVER\_MORGANFORMAT - set the logging format for Morgan.  Default dev
* UPLOADS\_PATH - path to store the uploaded files.  Default ./uploads
* UPLOADS\_FIELD\_NAME - upload file configuration, which form/request fields to use for the file uploads.  Default is 'files'.
* UPLOADS\_FILE\_SIZE - limit the accepted size of files (in bytes).  Default is 5242880.
* UPLOADS\_FILE_COUNT - limit the number of files to accept in one upload.  Default is 3.
* UPLOADS\_FILE\_TYPE - limit the accepted file types.  Default is 'pdf'.  This is a current limitation of CMSG.
* CMSG\_SENDER - default email address to use as the sender/from. Default is: 'NR.CommonServiceShowcase@gov.bc.ca'

#### local.json

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
  }
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

