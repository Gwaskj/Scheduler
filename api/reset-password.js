import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {
    const { email } = req.body;
    if (!email) return res.status(400).send("Missing email");

    // IMPORTANT:
    // VITE_SUPABASE_URL is safe to expose
    // SUPABASE_SERVICE_ROLE_KEY must be in Vercel environment variables
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get all users
    const { data: users } = await supabase.auth.admin.listUsers();
    const user = users.users.find((u) => u.email === email);

    if (!user) return res.status(404).send("User not found");

    // Generate a new random password
    const newPassword = Math.random().toString(36).slice(-10);

    // Update the user's password
    await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });

    return res.json({
      success: true,
      newPassword,
    });
  } catch (err) {
    return res.status(500).send(err.message);
  }
}
