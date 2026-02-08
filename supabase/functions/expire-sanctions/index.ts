// Supabase Edge Function: expire-sanctions
// Automatically expires sanctions that have passed their end date
// Run periodically via cron or invoke manually

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Initialize Supabase client with service role for full access (bypass RLS)
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        console.log("Checking for expired sanctions...");

        // Update expired sanctions
        // active = true AND ends_at < now
        const { data, error, count } = await supabase
            .from('unit_sanctions')
            .update({
                is_active: false,
                lifted_at: new Date().toISOString(),
                // lifted_by is left null to indicate system action
                // or we could add update notes if we had a column for it
            })
            .lt('ends_at', new Date().toISOString())
            .eq('is_active', true)
            .select('id');

        if (error) {
            console.error('Error expiring sanctions:', error);
            throw error;
        }

        const expiredCount = data?.length || 0;
        console.log(`Expired ${expiredCount} sanctions.`);

        return new Response(
            JSON.stringify({
                success: true,
                message: `Successfully processed expired sanctions`,
                expiredCount: expiredCount,
                expiredIds: data?.map(s => s.id) || []
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            }
        );
    } catch (error) {
        console.error("Internal error:", error);
        return new Response(
            JSON.stringify({ error: error.message || "Internal server error" }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            }
        );
    }
});
