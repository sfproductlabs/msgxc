const LI = require('node-linkedin');

class LinkedIn {
    constructor(comms) {  
        this.comms = comms;
        this.li = LI(process.env.LINKEDIN_CLIENT_ID, process.env.LINKEDIN_CLIENT_SECRET)
        this.ocb = 'http://' + comms.req.getHeader('host') + '/linkedin';
        this.li.auth.setCallback(this.ocb);
    }
    
    async setCallback (cb) {
        this.li.auth.setCallback(cb);
    }

    // Returns a URL
    async startAuth () {
        //https://docs.microsoft.com/en-us/linkedin/shared/references/migrations/default-scopes-migration#scope-to-consent-message-mapping
        // NEW
        // r_ad_campaigns
        // r_ads
        // r_ads_leadgen_automation
        // r_ads_reporting
        // r_basicprofile
        // r_emailaddress
        // r_liteprofile
        // r_member_social
        // r_organization_social
        // rw_ad_campaigns
        // rw_ads
        // rw_company_admin
        // rw_dmp_segments
        // rw_organization_admin
        // rw_organization
        // w_member_social
        // w_organization_social
        // w_share

        //OLD
        //r_contactinfo
        //r_basicprofile
        //r_network
        //rw_nus
        //rw_company_admin


        //var scope = ['r_basicprofile', 'r_fullprofile', 'r_emailaddress', 'r_network', 'r_contactinfo', 'rw_nus', 'rw_groups', 'w_messages'];
        var scope = ["w_share"]
        return this.li.auth.authorize(scope);
    }
}


/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

module.exports = LinkedIn;