 
import SibApiV3Sdk from "sib-api-v3-sdk";

/**
 * Brevo Email Campaign Configuration
 */
interface BrevoCampaignConfig {
    apiKey: string;
    name: string;
    subject: string;
    senderName: string;
    senderEmail: string;
    htmlContent: string;
    listIds: number[];
    scheduledAt?: string;
}

/**
 * Create and send/schedule a Brevo email campaign.
 */
export async function createEmailCampaign(
    config: BrevoCampaignConfig
): Promise<any> {

    // ---------------------------------------------------------
    // 1. Configure Brevo API client
    // ---------------------------------------------------------
    const defaultClient = SibApiV3Sdk.ApiClient.instance;

    const apiKey = defaultClient.authentications["api-key"];

    apiKey.apiKey = config.apiKey;

    // ---------------------------------------------------------
    // 2. Create Email Campaign API instance
    // ---------------------------------------------------------
    const apiInstance = new SibApiV3Sdk.EmailCampaignsApi();

    // ---------------------------------------------------------
    // 3. Create campaign object
    // ---------------------------------------------------------
    const emailCampaign = new SibApiV3Sdk.CreateEmailCampaign();

    // ---------------------------------------------------------
    // 4. Campaign settings
    // ---------------------------------------------------------
    emailCampaign.name = config.name;

    emailCampaign.subject = config.subject;

    emailCampaign.sender = {
        name: config.senderName,
        email: config.senderEmail
    };

    emailCampaign.type = "classic";

    // ---------------------------------------------------------
    // 5. Email content
    // ---------------------------------------------------------
    emailCampaign.htmlContent = config.htmlContent;

    // ---------------------------------------------------------
    // 6. Recipients
    // ---------------------------------------------------------
    emailCampaign.recipients = {
        listIds: config.listIds
    };

    // ---------------------------------------------------------
    // 7. Schedule campaign
    //
    // If scheduledAt is supplied, Brevo will schedule the
    // campaign. If omitted, the campaign is simply created.
    // ---------------------------------------------------------
    if (config.scheduledAt) {
        emailCampaign.scheduledAt = config.scheduledAt;
    }

    // ---------------------------------------------------------
    // 8. Create campaign
    // ---------------------------------------------------------
    try {

        const data = await apiInstance.createEmailCampaign(
            emailCampaign
        );

        console.log(
            "API called successfully. Returned data:",
            data
        );

        return data;

    } catch (error) {

        console.error(
            "Error creating Brevo email campaign:",
            error
        );

        throw error;
    }
}
 
