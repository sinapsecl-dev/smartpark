// Supabase Edge Function: send-push
// Sends push notifications to users via Web Push API
// Deploy with: npx supabase functions deploy send-push

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Web Push implementation for Deno
import webpush from "npm:web-push@3.6.6";

interface PushPayload {
    userId?: string;
    condominiumId?: string;
    title: string;
    body: string;
    url?: string;
    type?: string;
    tag?: string;
    requireInteraction?: boolean;
}

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
        const payload: PushPayload = await req.json();

        // Validate required fields
        if (!payload.title || !payload.body) {
            return new Response(
                JSON.stringify({ error: "title and body are required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // At least one target must be specified
        if (!payload.userId && !payload.condominiumId) {
            return new Response(
                JSON.stringify({ error: "userId or condominiumId is required" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Initialize Supabase client with service role for full access
        const supabase = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // Configure VAPID keys
        webpush.setVapidDetails(
            "mailto:tech@smartparking.cl",
            Deno.env.get("VAPID_PUBLIC_KEY")!,
            Deno.env.get("VAPID_PRIVATE_KEY")!
        );

        // Query active subscriptions - single query, uses index
        let query = supabase
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth_key")
            .eq("is_active", true);

        if (payload.userId) {
            query = query.eq("user_id", payload.userId);
        } else if (payload.condominiumId) {
            query = query.eq("condominium_id", payload.condominiumId);
        }

        const { data: subscriptions, error: queryError } = await query;

        if (queryError) {
            console.error("DB query error:", queryError);
            return new Response(
                JSON.stringify({ error: "Failed to fetch subscriptions" }),
                { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!subscriptions?.length) {
            return new Response(
                JSON.stringify({ sent: 0, message: "No active subscriptions found" }),
                { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Prepare notification payload
        const notificationPayload = JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url || "/",
            type: payload.type || "default",
            tag: payload.tag,
            requireInteraction: payload.requireInteraction || false,
        });

        // Send notifications in parallel (efficient batch)
        const results = await Promise.allSettled(
            subscriptions.map((sub) =>
                webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: {
                            p256dh: sub.p256dh,
                            auth: sub.auth_key,
                        },
                    },
                    notificationPayload
                )
            )
        );

        // Count successes and failures
        const sent = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.filter((r) => r.status === "rejected").length;

        // Handle expired subscriptions (410 Gone) - mark as inactive
        const expiredEndpoints: string[] = [];
        results.forEach((result, index) => {
            if (result.status === "rejected") {
                const error = result.reason as { statusCode?: number };
                if (error?.statusCode === 410) {
                    expiredEndpoints.push(subscriptions[index].endpoint);
                }
            }
        });

        // Batch update expired subscriptions (single query)
        if (expiredEndpoints.length > 0) {
            await supabase
                .from("push_subscriptions")
                .update({ is_active: false })
                .in("endpoint", expiredEndpoints);
        }

        return new Response(
            JSON.stringify({
                sent,
                failed,
                expired: expiredEndpoints.length,
                total: subscriptions.length,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Push notification error:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
