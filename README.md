# Codefresh YAML Validator

> An NPM module/CLI for validating the Codefresh YAML.

[![npm version](https://badge.fury.io/js/%40codefresh-io%2Fyaml-validator.svg)](https://badge.fury.io/js/%40codefresh-io%2Fyaml-validator)

Developed in [Codefresh](https://www.codefresh.io).

## Installation

```bash
$ npm install @codefresh-io/yaml-validator -g
```

## Usage

### Command Line Interface

```sh
# Search for a file named codefresh.yml in the current working directory and validate it
cyv validate

# Validate the specified codefresh.yml file
cyv validate --file /path/to/codefresh.yml 
```

### NPM Module

```js
const cyv  = require('@codefresh-io/yaml-validator');
const yaml = require('js-yaml');
const fs   = require('fs');

const doc = yaml.safeLoad(fs.readFileSync('/path/to/codefresh.yml', 'utf8'));
cyv(doc);
```

## License

Copyright © 2016, [Codefresh](https://codefresh.io).
Released under the [MIT license](https://github.com/codefresh-io/cf-expression-evaluator/blob/master/LICENSE).

***
