'use strict';

const VARIABLE_REGEX = /\$\{{2}.+?\}{2}/;
const VARIABLE_EXACT_REGEX = new RegExp(`^${VARIABLE_REGEX.source}$`);

module.exports = {
    VARIABLE_REGEX,
    VARIABLE_EXACT_REGEX,
};
