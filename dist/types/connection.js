"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionType = void 0;
/**
 * Enum representing the available Salesforce connection types
 */
var ConnectionType;
(function (ConnectionType) {
    /**
     * Standard username/password authentication with security token
     * Requires SALESFORCE_USERNAME, SALESFORCE_PASSWORD, and optionally SALESFORCE_TOKEN
     */
    ConnectionType["User_Password"] = "User_Password";
    /**
     * OAuth 2.0 Client Credentials Flow using client ID and secret
     * Requires SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET
     */
    ConnectionType["OAuth_2_0_Client_Credentials"] = "OAuth_2.0_Client_Credentials";
})(ConnectionType || (exports.ConnectionType = ConnectionType = {}));
