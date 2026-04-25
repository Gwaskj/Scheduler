import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {
    const { user_id, action, details } = req.body;

    if (!action) {
      return res.status(400).send("Missing action");
    }

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabase.from("activity_logs").insert([
      {
        user_id: user_id || null,
        action,
        details: details || null,
      },
    ]);

    if (error) throw error;

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).send(err.message);
  }
}
