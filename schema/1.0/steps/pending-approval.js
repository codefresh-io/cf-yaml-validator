/**
 * Defines the git clone step schema
 */

'use strict';

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

const Joi = require('joi');
const BaseSchema = require('../base-schema');

class PendingApproval extends BaseSchema {

    //------------------------------------------------------------------------------
    // Public Interface
    //------------------------------------------------------------------------------

    static getType() {
        return 'pending-approval';
    }

    getSchema() {
        const pendingApprovalProperties = {
            type: Joi.string().valid(PendingApproval.getType()),
            timeout: Joi.object({
                timeUnit: Joi.string()
                    .valid([
                        'hours',
                        'minutes'
                    ]),
                duration: Joi.number().positive(),
                finalState: Joi.string()
                    .valid([
                        'terminated',
                        'approved',
                        'denied',
                    ]),
            }),
        };
        return this._createSchema(pendingApprovalProperties);
    }
}
// Exported objects/methods
module.exports = PendingApproval;
