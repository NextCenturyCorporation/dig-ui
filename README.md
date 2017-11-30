# dig-ui
Customizable, config-driven search and visualization user interface (UI) for the DIG data from any domain.  Example domains include counterfeit electronics, human trafficking, narcotics, stock fraud, and weapons trafficking.

## Technologies
* [Polymer](https://github.com/Polymer/polymer)
* [Node.js](https://nodejs.org/en/)
* [Express.js](http://expressjs.com)
* [Gulp.js](http://gulpjs.com)
* [Bower](https://bower.io/)
* [Web Component Tester](https://github.com/Polymer/web-component-tester)
* [Vulcanize](https://github.com/Polymer/polymer-bundler)
* [Docker](https://www.docker.com/)
* [Lodash](https://lodash.com/)
* [JSCS](http://jscs.info/)
* [JSHint](http://jshint.com/)
* [Polymer Elements](https://www.webcomponents.org/author/PolymerElements)
* [DIG Elements](https://github.com/DigElements)
  * [Elastic Search Client](https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/index.html)
  * [Elastic.js](https://github.com/fullscale/elastic.js/)

## Basic Installation
Before getting started, ensure that your `node` and `npm` are up-to-date.
```
git clone https://github.com/NextCenturyCorporation/dig-ui.git
cd dig-ui
npm install
bower install
```

## Developer Installation
We recommend installing the following node modules globally for development of the DIG UI and DIG elements:
```
npm install -g gulp
npm install -g bower
npm install -g polyserve
npm install -g web-component-tester
```

## Server Configuration (Local)
Running the DIG UI locally with `gulp serve` uses a server configuration file located at `server/config/local.env.js`.

Copy `server/config/local.env.sample.js` to `server/config/local.env.js` and edit the available configuration options:

Configuration Option | Description | Default
---------------------|-------------|--------
AUTH | Whether to enable SSO authentication. | false
AUTH_LOGIN_URL | The URL for the login page.  Adds the target DIG URL to the end of the login URL for redirects back.  Example:  'http://localhost:1234/redirect=' | ''
AUTH_TOKEN_URL | The URL for the token validation page.  Adds the token string to the end of the token URL for validation.  Example:  'http://localhost:1234/token=' | ''
CONFIG_ENDPOINT | The location for the MyDIG config REST service. | 'http://localhost:1234'
CONFIG_PASSWORD | The password for the MyDIG config REST service. | ''
CONFIG_USERNAME | The username for the MyDIG config REST service. | ''
DATABASE_TYPE | The database type:  either 'full' or 'sample'.  Used when reading the domain/project config. | 'sample'
DEFAULT_PROJECT | The default project. | undefined
DOWNLOAD_IMAGE_URL | The download endpoint to get the image data for the image URLs for the PDF export. | 'downloadImage'
ES_HOST | The stringified object containing the location of the elasticsearch instance.  Supports all configuration options for the elasticsearch.js v12 client. | '{"apiVersion":"2.4","host": "http://localhost:9200"}'
ES_HOST_STRING | The string location of the elasticsearch instance with username and password authorization (if needed).  Used for the curl commands run by the node/express server.  Formatted 'http(s)://(username:password@)host:port'. | ''
IMAGE_SERVICE_CONFIG | The stringified object containing the username and password authorization, hostnames, and endpoints for the similar image REST service.  Syntax:  { auth: { user: username, password: password }, host: { face: hostname, similarity: hostname }, endpoint: { data: endpoint, link: endpoint } } | '{"auth": {}, "endpoint": {}, "host": {}}'
IMAGE_URL_PREFIX | The prefix added to the start of the image URLs (if not specified in the project config). | ''
IMAGE_URL_SUFFIX | The suffix added to the end of the image URLs (if not specified in the project config). | ''
LOG_INDEX_NAME | The elasticsearch log index name. | 'dig-logs'
LOG_INDEX_TYPE | The elasticsearch log index type. | 'log'
OVERRIDE_CONFIG | The stringified config object.  Overrides the domain/project and the config from the CONFIG_ENDPOINT. | undefined
OVERRIDE_SEARCH_ENDPOINT | The stringified object containing the project names mapped to the endpoints for the search and facets REST services.  Overrides the endpoints from the project configs. | undefined
PROFILE_INDEX_NAME | The elasticsearch profile index name. | 'dig-profiles'
PROFILE_INDEX_TYPE | The elasticsearch profile index type. | 'profile'
SEARCH_CONFIG | The stringified object containing project names and/or locations for the Sandpaper search REST service (from project configs) mapped to replacement locations. | undefined
STATE_INDEX | The elasticsearch state index name. | 'dig-states'
STATE_TYPE | The elasticsearch state index type. | 'state'
TAG_ENTITY_ENDPOINT | The entity endpoint for the MyDIG tag REST service. | undefined
TAG_EXTRACTION_ENDPOINT | The extraction endpoint for the MyDIG tag REST service. | undefined
TAG_LIST_ENDPOINT | The tag list endpoint for the MyDIG tag REST service. | undefined

## Server Configuration (Docker)
Running the DIG UI with Docker does **NOT** use the server configuration file (`server/config/local.env.js`).  You may set the server configuration options using environment variables.  We recommend using [docker-compose](https://docs.docker.com/compose/).  You can see an example docker-compose configuration file [here](https://github.com/NextCenturyCorporation/dig-ui/blob/master/docker-sample-config/docker-compose.sample.yml).

## Run Local Server
```
gulp serve
```

## Run Codestyle & Linter
```
gulp lint
```

## Run Unit Tests
```
gulp test
```

## Build & Vulcanize
First update the application version in package.json.  Then run:

```
gulp
```

## Build & Deploy Docker Image
First update the application version in package.json.  Then run:

```
gulp docker
```

This will build & vulcanize the application, build a docker image named **digmemex/digui:[version]** (using the version from the package.json file) and push it to Docker Hub.

## MyDIG and Domain/Project Configuration

[MyDIG](https://github.com/usc-isi-i2/mydig-webservice/) provides REST services for retreiving DIG domain/project configuration and setting tags on webpage results and extractions.  The MyDIG REST endpoints can be set in the server configuration using the CONFIG_* and TAG_* properties.

If you want to run the DIG UI without MyDIG, you can set a domain/project configuration with the OVERRIDE_CONFIG option in the server configuration.  You can find the domain/project configuration syntax [here](https://github.com/NextCenturyCorporation/dig-ui/blob/master/CONFIG_README.md).

## Sandpaper (Pinpoint)

The DIG UI runs search queries using [Sandpaper](https://github.com/usc-isi-i2/dig-sandpaper) (also called Pinpoint).  The Sandpaper REST endpoint can be set in the server configuration using the domain/project configuration or the OVERRIDE_SEARCH_ENDPOINT or SEARCH_CONFIG options in the server configuration.

All other elasticsearch queries and aggregations are sent directly to the elasticsearch instance defined in the search configuration by ES_HOST.  This includes:
- All queries/aggregations from the entity/result pages
- All queries to the log/profile/state indices

If you want to run the DIG UI without using Sandpaper, *coming soon...*

## License

[Apache 2.0](https://github.com/NextCenturyCorporation/dig-ui/blob/master/LICENSE)
