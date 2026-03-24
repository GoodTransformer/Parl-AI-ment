const main = document.querySelector("main");

if (main) {
  if (!main.id) {
    main.id = "main-content";
  }

  if (!document.querySelector(".skip-link")) {
    const skipLink = document.createElement("a");
    skipLink.className = "skip-link";
    skipLink.href = `#${main.id}`;
    skipLink.textContent = "Skip to content";
    document.body.prepend(skipLink);
  }
}

const currentPath = window.location.pathname.split("/").pop() || "index.html";

document.querySelectorAll(".nav-links a").forEach((link) => {
  const href = link.getAttribute("href");
  if (!href) {
    return;
  }

  const normalizedHref = href.split("/").pop();
  const isCurrent = normalizedHref === currentPath;
  link.classList.toggle("is-active", isCurrent);

  if (isCurrent) {
    link.setAttribute("aria-current", "page");
  } else {
    link.removeAttribute("aria-current");
  }
});

document.querySelectorAll("[data-tabs]").forEach((tabs, tabsIndex) => {
  const buttons = Array.from(tabs.querySelectorAll("[data-tab-target]"));
  const panels = Array.from(tabs.querySelectorAll("[data-tab-panel]"));

  buttons.forEach((button, buttonIndex) => {
    const target = button.dataset.tabTarget;
    const buttonId = `tab-${tabsIndex}-${target}`;
    const panelId = `panel-${tabsIndex}-${target}`;

    button.id = buttonId;
    button.setAttribute("role", "tab");
    button.setAttribute("tabindex", buttonIndex === 0 ? "0" : "-1");
    button.setAttribute("aria-controls", panelId);

    const panel = panels.find((item) => item.dataset.tabPanel === target);
    if (panel) {
      panel.id = panelId;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", buttonId);
      panel.setAttribute("tabindex", "0");
    }
  });

  const activate = (target, shouldFocus = false) => {
    buttons.forEach((button) => {
      const isActive = button.dataset.tabTarget === target;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
      button.setAttribute("tabindex", isActive ? "0" : "-1");

      if (isActive && shouldFocus) {
        button.focus();
      }
    });

    panels.forEach((panel) => {
      panel.hidden = panel.dataset.tabPanel !== target;
    });
  };

  buttons.forEach((button, buttonIndex) => {
    button.addEventListener("click", () => activate(button.dataset.tabTarget));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) {
        return;
      }

      event.preventDefault();

      let nextIndex = buttonIndex;

      if (event.key === "ArrowRight") {
        nextIndex = (buttonIndex + 1) % buttons.length;
      } else if (event.key === "ArrowLeft") {
        nextIndex = (buttonIndex - 1 + buttons.length) % buttons.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = buttons.length - 1;
      }

      activate(buttons[nextIndex].dataset.tabTarget, true);
    });
  });

  const initial = tabs.dataset.initialTab || buttons[0]?.dataset.tabTarget;
  if (initial) {
    activate(initial);
  }
});

const signupEndpoint = window.PARL_SIGNUP_ENDPOINT?.trim();

document.querySelectorAll("[data-signup-form]").forEach((form) => {
  const submitButton = form.querySelector('button[type="submit"]');
  const status = form.querySelector("[data-form-status]");
  const source = form.dataset.signupSource || "signup";

  const setStatus = (message, tone) => {
    if (!status) {
      return;
    }

    status.textContent = message;
    status.classList.remove("is-success", "is-error");

    if (tone === "success") {
      status.classList.add("is-success");
    }

    if (tone === "error") {
      status.classList.add("is-error");
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) {
      return;
    }

    if (!signupEndpoint) {
      setStatus("Signup is not configured yet. Add your live form endpoint in signup-config.js.", "error");
      return;
    }

    const formData = new FormData(form);
    formData.set("signup_type", source);
    formData.set("page_url", window.location.href);

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.dataset.originalLabel = submitButton.textContent || "";
      submitButton.textContent = "Submitting...";
    }

    form.classList.add("is-submitting");
    setStatus("Submitting...", null);

    try {
      const response = await fetch(signupEndpoint, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        let message = "Something went wrong. Please try again.";

        try {
          const result = await response.json();
          if (Array.isArray(result.errors) && result.errors[0]?.message) {
            message = result.errors[0].message;
          }
        } catch (error) {
          // Keep the default message when the error body is not JSON.
        }

        throw new Error(message);
      }

      form.reset();
      setStatus("Thanks. Your signup has been recorded.", "success");
    } catch (error) {
      setStatus(error.message || "Something went wrong. Please try again.", "error");
    } finally {
      form.classList.remove("is-submitting");

      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = submitButton.dataset.originalLabel || "Submit";
      }
    }
  });
});
