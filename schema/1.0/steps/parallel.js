/**
 * Defines the git clone step schema
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const BaseSchema = require('../base-schema');

class Parallel extends BaseSchema {

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    static getType() {
        return 'parallel';
    }

    getSchema() {
        return this._createSchema({ });
    }
}

// Exported objects/methods
module.exports = Parallel;
