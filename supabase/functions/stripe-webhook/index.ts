import { serve } from "https://deno.land/std/http/server.ts";
import Stripe from "https://esm.sh/stripe@12.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

serve(async (req) => {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );
  } catch (err) {
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Helper to update profile safely
  async function updateProfile(userId: string, fields: Record<string, any>) {
    const { error } = await supabase
      .from("profiles")
      .update(fields)
      .eq("id", userId);

    if (error) {
      console.error("Supabase update error:", error);
    }
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const userId = session.client_reference_id;

      await updateProfile(userId, {
        is_pro: true,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
      });

      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object;
      const userId = sub.metadata.user_id;

      const isActive =
        sub.status === "active" || sub.status === "trialing";

      await updateProfile(userId, {
        is_pro: isActive,
        stripe_subscription_id: sub.id,
      });

      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const userId = sub.metadata.user_id;

      await updateProfile(userId, {
        is_pro: false,
        stripe_subscription_id: null,
      });

      break;
    }
  }

  return new Response("ok", { status: 200 });
});
