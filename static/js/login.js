document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("form");
  const msg = document.querySelector(".error") || document.querySelector("#message");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.querySelector('input[name="username"]')?.value?.trim()
      || document.querySelector("#username")?.value?.trim()
      || "";

    const password = document.querySelector('input[name="password"]')?.value
      || document.querySelector("#password")?.value
      || "";

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (msg) msg.textContent = data.error || "Login failed";
        return;
      }

      // حفظ التوكن والمستخدم
      localStorage.setItem("nebras_token", data.token);
      localStorage.setItem("nebras_user", JSON.stringify(data.user));

      window.location.href = "/dashboard";
    } catch (err) {
      if (msg) msg.textContent = "Network error";
    }
  });
});