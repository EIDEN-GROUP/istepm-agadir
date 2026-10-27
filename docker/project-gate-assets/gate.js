(function () {
  "use strict";

  var form = document.getElementById("gate-form");
  var username = document.getElementById("gate-username");
  var password = document.getElementById("gate-password");
  var toggle = document.getElementById("gate-toggle");
  var submit = document.getElementById("gate-submit");
  var errorBox = document.getElementById("gate-error");
  var sessionBox = document.getElementById("gate-session");
  var logout = document.getElementById("gate-logout");

  function showError(message) {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.hidden = false;
  }

  function clearError() {
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.hidden = true;
  }

  function setLoading(loading) {
    if (!submit) return;
    submit.disabled = loading;
    submit.textContent = loading ? "Connexion…" : "Se connecter";
  }

  function showSession() {
    if (form) form.hidden = true;
    if (sessionBox) sessionBox.hidden = false;
  }

  // If already authenticated, offer to continue or log out.
  fetch("/api/project-gate/status", { credentials: "same-origin" })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data && data.enabled === false) {
        window.location.replace("/");
      } else if (data && data.authenticated) {
        showSession();
      }
    })
    .catch(function () { /* stay on the form */ });

  if (toggle) {
    toggle.addEventListener("click", function () {
      var showing = password.type === "text";
      password.type = showing ? "password" : "text";
      toggle.textContent = showing ? "Afficher" : "Masquer";
      toggle.setAttribute("aria-pressed", String(!showing));
      toggle.setAttribute(
        "aria-label",
        showing ? "Afficher le mot de passe" : "Masquer le mot de passe",
      );
    });
  }

  if (logout) {
    logout.addEventListener("click", function () {
      fetch("/api/project-gate/logout", {
        method: "POST",
        credentials: "same-origin",
      }).finally(function () {
        window.location.replace("/project-gate");
      });
    });
  }

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      clearError();

      if (!username.value.trim() || !password.value) {
        showError("Veuillez renseigner votre nom d’utilisateur et votre mot de passe.");
        return;
      }

      setLoading(true);
      fetch("/api/project-gate/login", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.value.trim(),
          password: password.value,
        }),
      })
        .then(function (response) {
          if (response.ok) {
            window.location.replace("/");
            return null;
          }
          return response.json().catch(function () { return {}; }).then(function (data) {
            if (response.status === 429) {
              var wait = data && data.retryAfter ? data.retryAfter : 60;
              showError("Trop de tentatives. Réessayez dans " + wait + " secondes.");
            } else if (response.status === 403) {
              showError("Requête refusée. Rechargez la page et réessayez.");
            } else if (response.status >= 500) {
              showError("Service temporairement indisponible. Réessayez plus tard.");
            } else {
              showError("Identifiants invalides.");
            }
          });
        })
        .catch(function () {
          showError("Impossible de joindre le serveur. Vérifiez votre connexion.");
        })
        .finally(function () {
          setLoading(false);
          if (password) password.value = "";
        });
    });
  }
})();
