document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  const msg = document.querySelector(".error") || document.querySelector("#message");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.querySelector('input[name="username"]')?.value?.trim()
      || document.querySelector("#username")?.value?.trim()
      || "";

    const email = document.querySelector('input[name="email"]')?.value?.trim()
      || document.querySelector("#email")?.value?.trim()
      || "";

    const password = document.querySelector('input[name="password"]')?.value
      || document.querySelector("#password")?.value
      || "";

    const confirm = document.querySelector('input[name="confirm"]')?.value
      || document.querySelector("#confirmPassword")?.value
      || document.querySelector("#confirm")?.value
      || "";

    if (confirm && password !== confirm) {
      if (msg) msg.textContent = "Passwords do not match";
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (msg) msg.textContent = data.error || "Register failed";
        return;
      }

      if (msg) msg.textContent = "Account created! Please sign in.";
      setTimeout(() => (window.location.href = "/login"), 600);
    } catch (err) {
      if (msg) msg.textContent = "Network error";
    }
  });
});