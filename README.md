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
CONFIG_ENDPOINT | The endpoint at which the REST config services are hosted. | "http://localhost:9200"

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
