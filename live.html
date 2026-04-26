(() => {
  "use strict";

  const TOKEN_KEY = "nebras_token";
  const USERNAME_KEY = "nebras_username";

  // Works whether you open /login OR login.html (Flask or static).
  const ROUTES = {
    home: "/",
    login: "/login",
    register: "/register",
    dashboard: "/dashboard",
    live: "/live-page",
    upload: "/upload-page",
    sessions: "/sessions-page",
  };

  function setYear() {
    const el = document.getElementById("year");
    if (el) el.textContent = String(new Date().getFullYear());
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
  }

  function setUsername(name) {
    localStorage.setItem(USERNAME_KEY, name);
  }

  function getUsername() {
    return localStorage.getItem(USERNAME_KEY);
  }

  function currentPageName() {
    const p = (location.pathname.split("/").pop() || "").toLowerCase();
    return p || "/";
  }

  function isProtectedPage() {
    const p = currentPageName();
    // support both /dashboard and dashboard.html style
    return (
      p === "dashboard" ||
      p === "dashboard.html" ||
      p === "live" ||
      p === "live.html" ||
      p === "upload" ||
      p === "upload.html" ||
      p === "sessions-page" ||
      p === "sessions.html" ||
      p === "sessions" ||
      p === "upload-page" ||
      p === "live-page"
    );
  }

  function redirectToLogin() {
    location.href = ROUTES.login;
  }

  function protectPages() {
    if (!isProtectedPage()) return;
    if (!getToken()) redirectToLogin();
  }

  function attachLogout() {
    const btn = document.getElementById("logoutBtn");
    if (!btn) return;

    btn.addEventListener("click", () => {
      clearToken();
      redirectToLogin();
    });
  }

  async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = new Headers(options.headers || {});
    if (!headers.has("Accept")) headers.set("Accept", "application/json");

    // Only add JSON header if body is not FormData
    const isFormData = options.body instanceof FormData;
    if (!isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (token) headers.set("Authorization", `Bearer ${token}`);

    const res = await fetch(path, { ...options, headers });
    const contentType = res.headers.get("content-type") || "";

    let data = null;
    if (contentType.includes("application/json")) {
      data = await res.json().catch(() => null);
    } else {
      data = await res.text().catch(() => "");
    }

    if (!res.ok) {
      const msg =
        (data && data.error) ||
        (typeof data === "string" && data) ||
        `Request failed (${res.status})`;
      const err = new Error(msg);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  // Expose for other files
  window.Nebras = {
    ROUTES,
    setToken,
    getToken,
    clearToken,
    setUsername,
    getUsername,
    apiFetch,
    redirectToLogin,
  };

  setYear();
  protectPages();
  attachLogout();
})();