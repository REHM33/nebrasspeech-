(() => {
  "use strict";

  const usernameText = document.getElementById("usernameText");
  const token = window.Nebras.getToken();
  const username = window.Nebras.getUsername();

  if (!token) {
    window.Nebras.redirectToLogin();
    return;
  }

  if (usernameText) {
    usernameText.textContent = username || "User";
  }
})();