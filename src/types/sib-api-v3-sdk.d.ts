declare module "sib-api-v3-sdk" {

    interface Authentications {
        [key: string]: {
            apiKey: string;
        };
    }

    class ApiClient {
        static instance: ApiClient;

        authentications: Authentications;
    }

    class EmailCampaignsApi {
        createEmailCampaign(
            emailCampaign: CreateEmailCampaign
        ): Promise<any>;
    }

    class CreateEmailCampaign {
        name: string;
        subject: string;

        sender: {
            name: string;
            email: string;
        };

        type: string;

        htmlContent: string;

        recipients: {
            listIds: number[];
        };

        scheduledAt?: string;
    }

    const SibApiV3Sdk: {
        ApiClient: typeof ApiClient;
        EmailCampaignsApi: typeof EmailCampaignsApi;
        CreateEmailCampaign: typeof CreateEmailCampaign;
    };

    export = SibApiV3Sdk;
}