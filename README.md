# dig-ui
Customizable DIG search and visualization interface for any domain

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

## Installation
```
npm install -g gulp-cli
npm install -g gulp
npm install -g bower
npm install -g polyserve
npm install -g web-component-tester
git clone https://github.com/NextCenturyCorporation/dig-ui.git
cd dig-ui
npm install
bower install
```

## Configuration
Copy **dig-ui/server/config/local.env.sample.js** to **dig-ui/server/config/local.env.js** and edit the available configuration options:

Configuration Option | Description | Default
---------------------|-------------|--------
CONFIG_ENDPOINT | The location for the config REST service. | 'http://localhost:1234'
CONFIG_PASSWORD | The password for the config REST service. | ''
CONFIG_USERNAME | The username for the config REST service. | ''
DATABASE_TYPE | The database type:  either 'full' or 'sample'. | 'sample'
DEFAULT_PROJECT | The default project. | undefined
DOWNLOAD_IMAGE_URL | The download endpoint to get the image data for the image URLs for the PDF export. | 'downloadImage'
ES_HOST | The stringified object containing the location of elasticsearch. | '{"host": "http://localhost:9200"}'
IMAGE_SERVICE_AUTH | The stringified object containing the username and password authorization for the similar image REST service. | '{"user": "", "password": ""}'
IMAGE_SERVICE_HOST | The stringified object containing the location for the similar image REST service.  The "url" property is for GET requests sending a specific image URL.  The "base64" property is for POST requests sending specific image base64 data.  | {"url": "", "base64": ""}
IMAGE_URL_PREFIX | The prefix added to the start of image URLs. | ''
LOG_INDEX | The elasticsearch log index name. | 'dig-logs'
LOG_TYPE | The elasticsearch log index type. | 'log'
OVERRIDE_CONFIG | The stringified config object.  Overrides the domain/project and the config from the CONFIG_ENDPOINT | undefined
OVERRIDE_SEARCH_ENDPOINT | The stringified object containing the project names mapped to the endpoints for the search and facets REST services.  Overrides the endpoints from the project configs. | undefined
SEARCH_CONFIG | The stringified object containing locations for the search REST service (from project configs) mapped to replacement locations. | undefined
STATE_INDEX | The elasticsearch state index name. | 'dig-states'
STATE_TYPE | The elasticsearch state index type. | 'state'
TAG_ENTITY_ENDPOINT | The entity endpoint for the tag REST service. | undefined
TAG_EXTRACTION_ENDPOINT | The extraction endpoint for the tag REST service. | undefined
TAG_LIST_ENDPOINT | The tag list endpoint for the tag REST service. | undefined

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

## License

[Apache 2.0](https://github.com/NextCenturyCorporation/dig-ui/blob/master/LICENSE)
