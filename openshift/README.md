# Email Microservice OpenShift

# OpenShift
The email microservice is deployed to OpenShift.  Here you will find documentation about how this application is built and deployed. It is assumed that you are familiar with OpenShift commands and resources (ex. buildconfigs, deployconfigs, imagestreams, secrets, configmaps).

## Prerequisite
Since the email microservice is a wrapper around Common Messaging Service (CMSG)[../docs/overview.md], we need authorization to call it.  You will need to have your a Service Client ID and secret, and the OAuth Url for that client/environment (basically who, where, how we authenticate).  The service client id and password will be created through [Get Token](https://github.com/bcgov/nr-get-token).  You will need to get the Common Messaging Service (CMSG) api url and the OAuth url for whichever Common Services environment you are targetting.


## Conventions
The following documentation assumes that you have access and admin rights to an OpenShift environment; and that you have the OpenShift command line tools installed and on your path.  Please refer to the [Get Started with the CLI](https://docs.openshift.com/container-platform/3.11/cli_reference/get_started_cli.html) documentation.  If you are logged into your OpenShift Console, see <your console-url>/console/commandline for more information.

The instructions here are for a Mac with openshift v3.11.59 cli.  Please adjust accordingly if you have a different set up.

We prefer to provide an OpenShift namespace with all commands and not depend on our current logged in project.  To do so, we just set environment variables to simplify.

```sh

export proj=<your openshift namespace>

```

And to help with cut and paste of the commands, we set some other environment variables.  Populate with the values for your particular instance/environment

```sh

export oauth_token_url=<token url for the webade oauth instance>
export cmsg_id=<your CMSG Service Client Id>
export cmsg_secret=<your CMSG Service Client Secret>
export cmsg_url=<base url for the CMSG instance>

```

### Prepare the namespace/environment
There are some requirements for each namespace/environment.  For this microservice, we need to ensure each namespace has a secret (credentials to connect to the Common Messaging Service - CMSG), and we need a configmap that we can use to set environment variables.

#### Secrets/Environment variables
The following oc command creates a new secret, email-microsrv-cmsg-client, that will be used to set environment variables in the application.

email-microsrv-cmsg-client.username sets environment variable CMSG_CLIENT_ID
email-microsrv-cmsg-client.password sets environment variable CMSG_CLIENT_SECRET

```sh

oc create secret -n $proj generic email-microsrv-cmsg-client --from-literal=username=$cmsg_id --from-literal=password=$cmsg_secret --type=kubernetes.io/basic-auth

```

#### ConfigMap/Environment variables
The following oc command creates a new configmap, email-microsrv-cmsg-urls, that will be used to set environment variables in the application.  This config map will be used to set OAUTH\_TOKEN\_URL and CMSG\_TOP\_LEVEL\_URL environment variables (hence the Uppercase underscore convention for their names).

```sh

oc create configmap -n $proj email-microsrv-cmsg-urls --from-literal=OAUTH_TOKEN_URL=$oauth_token_url --from-literal=CMSG_TOP_LEVEL_URL=$cmsg_url

```

#### Other configurable environment variables
Other environmental variables will be set in the deployment config; this affords us the most flexibility for configuring instances on the fly.  See [api/README.md](../api/README.md) for all the configuration values and how they are loaded and used within the api code.


## Overview

The overall build/deployment process is:
1. Process and apply build configuration
2. Build Image
3. Process and apply deployment configuration
4. Rollout deployment
5. Option: expose service as a publicly accessible route/url

We have attempted to make the build and deployment as simple and agnostic as possible.  We have *no* triggers in our build or deployment configs, this is by design.  By having no automatic triggers, we can more easlily use these build and deploy configs in an external pipeline, where each step is explicitly controlled.  See [Messaging Service Showcase](https://github.com/bcgov/nr-messaging-service-showcase/master/openshift/README.md) for an example of pipeline controlled build and deploy.

Both templates provide several parameters for control over what is built and from where, and how the microservice is run; but reasonable defaults are provided to make the process as simple as possible.


## Templates

### Build Template - api.bc.yaml
The build config template will result in an ImageStream and a Build.  The base image is the OpenShift Node JS 10 image.  The default configuration for this template is to build the code from this repository's master branch with ample resources to run the npm install.

The template accepts 8 parameters:

* SOURCE\_REPO\_URL - complete url to the repo (including .git).  Default is this repository.
* SOURCE\_REPO\_REF - Git reference to pull - could be a tag, a pull request (ex. pull/3/head), branch.  Default is master.
* APP\_NAME - a name for the application deployment, combines with INSTANCE\_ID.  Default is email-microsrv.
* INSTANCE\_ID - a suffix for application name.  This is useful with pull requests when one would stand up many instances in the same namespace.  Default is ''

The following will allow you to customize the [resource load](https://docs.openshift.com/container-platform/3.11/dev_guide/compute_resources.html) during image build time:
* CPU\_REQUEST - Requested CPU per pod (in millicores ex. 500m).  Default 500m
* MEMORY\_REQUEST - Requested Memory per pod (in gigabytes Gi or megabytes Mi ex. 500Mi).  Default 1Gi
* CPU\_LIMIT - Limit Peak CPU per pod (in millicores ex. 1000m).  Default 1000m
* MEMORY\_LIMIT - Limit Peak Memory per pod (in gigabytes Gi or megabytes Mi ex. 2Gi).  Default 2Gi

### Deployment Template - api.dc.yaml
The deployment config template will result in an Service and Deployment/Pods.  By default, we employ a 2 Pod rolling strategy for maximum uptime.  *APP\_NAME* and  *INSTANCE\_ID* parameters must match values used running the Build Template.  And *NAMESPACE* must be provided.

A Route is *not* included in the deployment template, as not all use cases will require this api to be exposed publicly.  See the examples on how to expose the service if you wish to use the api directly.

*Important note*: the deployment is configured to use port 8080 for the Service, this value is passed to the api code via an environment variable (as PORT).  If you wish to use ports other than 8080, then you will have to update the deployment configuration and ensure the environment variable passed to the pods matches.

The template accepts 7 parameters:

* APP\_NAME - a name for the application deployment, combines with INSTANCE\_ID.  Default is email-microsrv.
* INSTANCE\_ID - a suffix for application name.  This is useful with pull requests when one would stand up many instances in the same namespace.  Default is ''
* NAMESPACE - The namespace where the build image is located.  Required, with *no* default.

The following allow for overriding the default secret and configmap (that are auto-loaded into environment variables):
* SECRET\_NAME - name of your secret.  Default email-microsrv-cmsg-client
* CONFIG_MAP_\_NAME - name of your configmap.  Default email-microsrv-cmsg-urls

The following are for setting environment variables.
* HOST\_URL - The domain/base url where we will expose the api.  This could be our own route, or could be a reverse proxy url.  Will be passed as an environment variable (as HOST\_URL) into the api code.  This should always be set during the deployment. Default is http://email-microsrv:8080
* PORT - port for node to listen on.  Best to leave as the default 8080 - see note above.
* SERVICE\_VERSION - useful if you are forking and versioning your own code.  Default 1
* SERVICE\_HOMEPAGE - useful if you are forking, should point at the repository for the deployed code.  Default https://github.com/bcgov/nr-email-microservice.git
* SERVER\_LOGLEVEL - set the npm log level (verbose, debug, info, warn, error). Default is info
* SERVER\_MORGANFORMAT - set the logging format for Morgan.  Default dev
* UPLOADS\_PATH - path to store the uploaded files.  Default ./uploads
* UPLOADS\_FIELD\_NAME - upload file configuration, which form/request fields to use for the file uploads.  Default is 'files'.
* UPLOADS\_FILE\_SIZE - limit the accepted size of files (in bytes).  Default is 5242880.
* UPLOADS\_FILE_COUNT - limit the number of files to accept in one upload.  Default is 3.
* UPLOADS\_FILE\_TYPE - limit the accepted file types.  Default is 'pdf'.  This is a current limitation of CMSG.
* CMSG\_SENDER - default email address to use as the sender/from. Default is: 'no-reply@nr-email-microservice.org'

The following will allow you to customize the [resource load](https://docs.openshift.com/container-platform/3.11/dev_guide/compute_resources.html) during runtime of the pods:

* CPU\_REQUEST - Requested CPU per pod (in millicores ex. 500m).  Default 500m
* MEMORY\_REQUEST - Requested Memory per pod (in gigabytes Gi or megabytes Mi ex. 500Mi).  Default 1Gi
* CPU\_LIMIT - Limit Peak CPU per pod (in millicores ex. 1000m).  Default 1000m
* MEMORY\_LIMIT - Limit Peak Memory per pod (in gigabytes Gi or megabytes Mi ex. 2Gi).  Default 2Gi


#### Default example
The following will illustrate how to call the templates from the command line.  A sort of, manual pipeline...  Assuming you have already initialized the environment with the secret and configmap (see above).  This will employ all the default values. We will also expose our own route and use that as an example for setting our HOST\_URL parameter.

It is always good to namespace ALL of your commands, we will just set an environment variable to simplify.

``` sh

cd openshift
export proj=<your namespace ex. idcqvl-dev>

```

Process the Build template.

``` sh

oc -n $proj process -f api.bc.yaml -o yaml | oc -n $proj create -f -

imagestream.image.openshift.io/email-microsrv-api created
buildconfig.build.openshift.io/email-microsrv-api created

```

Build the image.

```sh

oc -n $proj start-build email-microsrv-api

build.build.openshift.io/email-microsrv-api-1 started

```

Follow the build (optional)

```sh

oc logs build/email-microsrv-api-1 --follow

```


Once the runtime image has been built, we can process our deployment configuration.  Note that we are setting the HOST\_URL to match the route we are exposing later.

``` sh

oc -n $proj process -f api.dc.yaml -p NAMESPACE=$proj -p HOST_URL=http://email-$proj.pathfinder.gov.bc.ca -o yaml | oc -n $proj create -f -

service/email-microsrv-api created
deploymentconfig.apps.openshift.io/email-microsrv-api created

```

Rollout a deployment.

```sh

oc -n $proj rollout latest dc/email-microsrv-api

error: #1 is already in progress (Running).

```
*Note*: Even though we do not have an explicit trigger, when you create a deployment config, it will add a config trigger.  So a deployment will automatically start, hence the error.

Optional: create a route to access the api.


```sh

oc -n $proj expose svc/email-microsrv-api --hostname=email-$proj.pathfinder.gov.bc.ca --path=/api/v1

route.route.openshift.io/email-microsrv-api exposed

```

Optional: delete what you have created.

``` sh

oc -n $proj  delete all,template,secret,configmap,pvc,serviceaccount,rolebinding --selector app=email-microsrv

```

#### Pull Request example
The following will illustrate how to call the templates from the command line and simulate a pull request.  This would show overriding default parameter values to customize a build and deployment.  We will also show how to override the default secret and configmap, in case this pull request required a different CMSG service client than other instances in the same namespace.  By default, all deployments use the within a namespace use the same secret and config map.


``` sh

cd openshift
export proj=<your namespace ex. idcqvl-dev>

export app_name=emailms
export pr=5
export instance_id=-pr-$pr

export oauth_token_url=<token url for the webade oauth instance>
export cmsg_id=<your CMSG Service Client Id>
export cmsg_secret=<your CMSG Service Client Secret>
export cmsg_url=<base url for the CMSG instance>

```

Create a new secret just for this pull request.

``` sh

oc create secret -n $proj generic $app_name$instance_id-cmsg-client --from-literal=username=$cmsg_id --from-literal=password=$cmsg_secret --type=kubernetes.io/basic-auth

```

Create a new configmap just for this pull request.

``` sh

oc create configmap -n $proj $app_name$instance_id-cmsg-urls --from-literal=OAUTH_TOKEN_URL=$oauth_token_url --from-literal=CMSG_TOP_LEVEL_URL=$cmsg_url

```

Process the Build template.  In this example, we have a pull request (5), and we want to build a unique and complete instance/environment.  Note that we are adding an INSTANCE_ID parameter, all the object names will be unique, the app label will also be unique.  The change for APP\_NAME is included to show how to fully change the name of the app and components if required.

``` sh

oc -n $proj process -f api.bc.yaml -p SOURCE_REPO_REF=pull/$pr/head -p APP_NAME=$app_name -p INSTANCE_ID=$instance_id -o yaml | oc -n $proj create -f -
oc -n $proj process -f api.bc.yaml -p SOURCE_REPO_REF=feature/initial -p APP_NAME=$app_name -p INSTANCE_ID=$instance_id -o yaml | oc -n $proj create -f -

imagestream.image.openshift.io/emailms-pr-5-api created
buildconfig.build.openshift.io/emailms-pr-5-api created

```

Build the image.

```sh

oc -n $proj start-build emailms-pr-5-api

build.build.openshift.io/emailms-pr-5-api-1 started

```

Follow the build (optional)

```sh

oc logs build/emailms-pr-5-api-1 --follow

```


Once the runtime image has been built, we can process our deployment configuration - using our specific secret and configmap (created above) to override the defaults for the namespace.  Note that we are setting the HOST\_URL to match the route we are exposing later (we include our instance id in the url to ensure uniqueness).

``` sh

oc -n $proj process -f api.dc.yaml -p NAMESPACE=$proj -p APP_NAME=$app_name -p INSTANCE_ID=$instance_id -p SECRET_NAME=$app_name$instance_id-cmsg-client -p CONFIG_MAP_NAME=$app_name$instance_id-cmsg-urls -p HOST_URL=http://$app_name$instance_id-$proj.pathfinder.gov.bc.ca -o yaml | oc -n $proj create -f -

service/emailms-pr-5-api created
deploymentconfig.apps.openshift.io/emailms-pr-5-api created

```

Rollout a deployment.

```sh

oc -n $proj rollout latest dc/emailms-pr-5-api

error: #1 is already in progress (Running).

```
*Note*: Even though we do not have an explicit trigger, when you create a deployment config, it will add a config trigger.  So a deployment will automatically start, hence the error.

Optional: create a route to access the api.


```sh

oc -n $proj expose svc/emailms-pr-5-api --hostname=$app_name$instance_id-$proj.pathfinder.gov.bc.ca --path=/api/v1

route.route.openshift.io/emailms-pr-5-api exposed

```

Optional: delete what you have created.

``` sh

oc -n $proj  delete all,template,secret,configmap,pvc,serviceaccount,rolebinding --selector app=emailms-pr-5

```


