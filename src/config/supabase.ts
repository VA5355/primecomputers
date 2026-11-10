
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Supabase project configuration
const SUPABASE_URL = process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate configuration
if (!SUPABASE_URL) {
    throw new Error("SUPABASE_URL is not configured.");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is not configured."
    );
}

// Initialize the Supabase server-side client
export const supabaseAdmin: SupabaseClient = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    }
);

// Verify a customer's Supabase access token
export async function verifySupabaseAccessToken(
    accessToken: string
) {
    const {
        data: { user },
        error,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (error || !user) {
        throw new Error(
            error?.message || "Invalid Supabase access token."
        );
    }

    return user;
}
