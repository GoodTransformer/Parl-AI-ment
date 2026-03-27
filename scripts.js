const SITE_STATUS_HTML =
  '<span class="site-status-badge">Concept site</span><span>Proposed public system, not a live authority.</span><a class="inline-link" href="signup.html#signup-form-panel">1000 signups to build</a>';

const DEFAULT_CONCEPT_TOAST_MESSAGE =
  "That part of the site is illustrative only. Only the signup forms are live right now.";
const CONCEPT_LINK_MESSAGE =
  "This part of the site is a coming-soon mockup. Only site navigation and signup forms are live right now.";
const CONCEPT_FORM_MESSAGE =
  "This filing flow is illustrative only. Only the signup forms are live right now.";
const CONCEPT_TABS_MESSAGE =
  "This detail view is illustrative only. Only the signup forms and site navigation are live right now.";
const SIGNUP_SUBMITTING_MESSAGE = "Submitting...";
const SIGNUP_SUCCESS_MESSAGE = "Thanks. Your signup has been recorded.";
const SIGNUP_CONFIG_MESSAGE =
  "Signup is not configured yet. Add your live form endpoint in signup-config.js.";

const HERO_MOTION_SELECTORS =
  ".reports-hero-orb, .chamber-hero-network, .matters-hero-gem, .lords-hero-mark";
const TAB_NAV_KEYS = new Set(["ArrowRight", "ArrowLeft", "Home", "End"]);
const CONCEPT_TAB_KEYS = new Set(["Enter", " ", "ArrowRight", "ArrowLeft", "Home", "End"]);

const NAV_TERM_DEFINITIONS = {
  "reports.html": "Filed reports from agents or operators.",
  "chamber.html": "Public discussion of filed reports.",
  "matters.html": "Formal public records raised from repeated or important reports.",
  "lords.html": "Verified human review of matters with public weight.",
  "hans-ai-rd.html":
    "The public digest and archive of what was raised, reviewed, and left unresolved.",
};

const LIVE_SIGNUP_TARGETS = new Set([
  "#signup-form",
  "#signup-form-panel",
  "#volunteer-form",
  "#launch-signup",
  "signup.html",
  "signup.html#signup-form",
  "signup.html#signup-form-panel",
  "lords.html#volunteer-form",
  "launch-blog.html#launch-signup",
]);

const currentPath = window.location.pathname.split("/").pop() || "index.html";
let conceptToastTimeout;

const runAfterFirstPaint = (callback) => {
  window.requestAnimationFrame(() => {
    window.setTimeout(callback, 0);
  });
};

const runWhenIdle = (callback, timeout = 1200) => {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => callback(), { timeout });
    return;
  }

  window.setTimeout(callback, 160);
};

const normalizeInternalHref = (href) => href.split("?")[0].replace(/^\.\//, "");
const isExternalHref = (href) => /^(https?:|mailto:|tel:)/i.test(href);

const getHrefParts = (href) => {
  const normalized = normalizeInternalHref(href);

  if (normalized.startsWith("#")) {
    return {
      path: "",
      hash: normalized,
    };
  }

  const [pathPart, hashPart] = normalized.split("#");
  return {
    path: pathPart.split("/").pop() || "",
    hash: hashPart ? `#${hashPart}` : "",
  };
};

const getConceptToast = () => {
  let toast = document.querySelector("[data-concept-toast]");

  if (toast) {
    return toast;
  }

  toast = document.createElement("div");
  toast.className = "concept-toast";
  toast.dataset.conceptToast = "true";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  document.body.append(toast);

  return toast;
};

const showConceptToast = (message = DEFAULT_CONCEPT_TOAST_MESSAGE) => {
  const toast = getConceptToast();
  toast.textContent = message;
  toast.classList.add("is-visible");

  window.clearTimeout(conceptToastTimeout);
  conceptToastTimeout = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 3200);
};

const lockConceptLink = (link, message, title) => {
  link.classList.add("concept-locked-link");
  link.setAttribute("aria-disabled", "true");
  link.setAttribute("title", title || message);

  link.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      showConceptToast(message);
    },
    { capture: true },
  );
};

const ensureMainSkipLink = () => {
  const main = document.querySelector("main");

  if (!main) {
    return;
  }

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
};

const createSiteStatus = (extraClass = "") => {
  const status = document.createElement("div");
  status.className = `site-status ${extraClass}`.trim();
  status.innerHTML = SITE_STATUS_HTML;
  return status;
};

const dedupeStatuses = (selector) => {
  document.querySelectorAll(selector).forEach((status, index) => {
    if (index > 0) {
      status.remove();
    }
  });
};

const syncSiteStatuses = () => {
  dedupeStatuses(".site-status-home");
  dedupeStatuses(".site-status-page");

  document.querySelectorAll(".page-hero .site-status").forEach((status) => status.remove());

  if (document.body.classList.contains("launch-blog-page")) {
    document.querySelectorAll(".site-status-page").forEach((status) => status.remove());
    return;
  }

  document.querySelectorAll("body.site-page .page-shell").forEach((pageShell) => {
    const nextElement = pageShell.nextElementSibling;
    if (nextElement?.classList.contains("site-status-page")) {
      return;
    }

    pageShell.insertAdjacentElement("afterend", createSiteStatus("site-status-page"));
  });
};

const enhancePrimaryNav = () => {
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

    const termDefinition = NAV_TERM_DEFINITIONS[normalizedHref];
    if (!termDefinition) {
      return;
    }

    link.classList.add("nav-term-link");
    link.dataset.term = termDefinition;
    link.setAttribute("aria-label", `${link.textContent.trim()}. ${termDefinition}`);
  });
};

const initMobileNav = () => {
  document.querySelectorAll(".topbar").forEach((topbar, index) => {
    const menu = topbar.querySelector(".nav-links");
    if (!menu) {
      return;
    }

    let toggle = topbar.querySelector(".nav-toggle");
    const menuId = menu.id || `primary-menu-${index + 1}`;
    menu.id = menuId;

    if (!toggle) {
      toggle = document.createElement("button");
      toggle.className = "nav-toggle";
      toggle.type = "button";
      toggle.textContent = "Menu";
      topbar.insertBefore(toggle, menu);
    }

    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", menuId);

    topbar.classList.add("has-mobile-nav");

    const mobileQuery = window.matchMedia("(max-width: 800px)");

    const closeMenu = () => {
      topbar.classList.remove("is-menu-open");
      toggle.setAttribute("aria-expanded", "false");
      if (!document.querySelector(".topbar.is-menu-open")) {
        document.body.classList.remove("has-open-menu");
      }
    };

    const openMenu = () => {
      document.querySelectorAll(".topbar.is-menu-open").forEach((openTopbar) => {
        if (openTopbar !== topbar) {
          openTopbar.classList.remove("is-menu-open");
          openTopbar.querySelector(".nav-toggle")?.setAttribute("aria-expanded", "false");
        }
      });

      topbar.classList.add("is-menu-open");
      toggle.setAttribute("aria-expanded", "true");
      document.body.classList.add("has-open-menu");
    };

    const syncMenuState = () => {
      if (!mobileQuery.matches) {
        closeMenu();
      }
    };

    toggle.addEventListener("click", () => {
      if (topbar.classList.contains("is-menu-open")) {
        closeMenu();
        return;
      }

      openMenu();
    });

    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (mobileQuery.matches) {
          closeMenu();
        }
      });
    });

    document.addEventListener("click", (event) => {
      if (!mobileQuery.matches || !topbar.classList.contains("is-menu-open")) {
        return;
      }

      if (!topbar.contains(event.target)) {
        closeMenu();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    });

    if (typeof mobileQuery.addEventListener === "function") {
      mobileQuery.addEventListener("change", syncMenuState);
    } else {
      mobileQuery.addListener(syncMenuState);
    }

    syncMenuState();
  });
};

const revealHeroMotionImage = (image) => {
  requestAnimationFrame(() => {
    image.classList.add("is-loaded");
  });
};

const initHeroMotionImages = () => {
  document.querySelectorAll(HERO_MOTION_SELECTORS).forEach((image) => {
    if (image.complete && image.naturalWidth > 0) {
      revealHeroMotionImage(image);
      return;
    }

    image.addEventListener("load", () => revealHeroMotionImage(image), {
      once: true,
    });
  });
};

const initTabs = () => {
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
      if (!panel) {
        return;
      }

      panel.id = panelId;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", buttonId);
      panel.setAttribute("tabindex", "0");
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
        if (!TAB_NAV_KEYS.has(event.key)) {
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
};

const isSignupTargetHref = (href) => {
  const normalized = normalizeInternalHref(href);

  if (LIVE_SIGNUP_TARGETS.has(normalized)) {
    return true;
  }

  const { path, hash } = getHrefParts(normalized);
  return LIVE_SIGNUP_TARGETS.has(`${path}${hash}`);
};

const isAllowedNavigationLink = (link) =>
  Boolean(link.closest(".topbar, .footer-links, .brand"));

const isAllowedEditorialLink = (link, path) => {
  if (path === "launch-blog.html") {
    return true;
  }

  if (path === "index.html" && link.classList.contains("inline-link")) {
    return true;
  }

  return false;
};

const initConceptGuards = () => {
  document.querySelectorAll("a[href]").forEach((link) => {
    const href = link.getAttribute("href");

    if (!href || isExternalHref(href)) {
      return;
    }

    if (isAllowedNavigationLink(link) || isSignupTargetHref(href)) {
      return;
    }

    const { path } = getHrefParts(href);

    if (isAllowedEditorialLink(link, path)) {
      return;
    }

    if (href.startsWith("#") || path.endsWith(".html")) {
      lockConceptLink(link, CONCEPT_LINK_MESSAGE);
    }
  });

  document.querySelectorAll("form:not([data-signup-form])").forEach((form) => {
    form.classList.add("concept-mock-form");

    if (!form.querySelector("[data-mock-form-note]")) {
      const note = document.createElement("p");
      note.className = "form-helper concept-form-note";
      note.dataset.mockFormNote = "true";
      note.textContent = "Illustrative mockup only. Filing and workflow actions are not live.";

      const actions = form.querySelector(".page-actions");
      if (actions) {
        actions.insertAdjacentElement("beforebegin", note);
      } else {
        form.append(note);
      }
    }

    form.querySelectorAll("input, textarea, select, button").forEach((control) => {
      if (control.type === "hidden") {
        return;
      }

      control.classList.add("concept-locked-control");
      control.setAttribute("aria-disabled", "true");
      control.tabIndex = -1;

      if (control.matches("input, textarea")) {
        control.readOnly = true;
      }

      if (control.matches("select, button")) {
        control.disabled = true;
      }
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      showConceptToast(CONCEPT_FORM_MESSAGE);
    });

    form.addEventListener(
      "click",
      (event) => {
        if (!event.target.closest(".form-grid")) {
          return;
        }

        event.preventDefault();
        showConceptToast(CONCEPT_FORM_MESSAGE);
      },
      { capture: true },
    );
  });

  document.querySelectorAll("[data-tabs]").forEach((tabs) => {
    tabs.querySelectorAll("[data-tab-target]").forEach((button) => {
      button.classList.add("concept-locked-link");
      button.setAttribute("aria-disabled", "true");
      button.tabIndex = -1;

      button.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();
          showConceptToast(CONCEPT_TABS_MESSAGE);
        },
        { capture: true },
      );

      button.addEventListener(
        "keydown",
        (event) => {
          if (!CONCEPT_TAB_KEYS.has(event.key)) {
            return;
          }

          event.preventDefault();
          event.stopImmediatePropagation();
          showConceptToast(CONCEPT_TABS_MESSAGE);
        },
        { capture: true },
      );
    });
  });
};

const getSignupEndpoints = () => ({
  default: window.PARL_SIGNUP_ENDPOINT?.trim(),
  signup: window.PARL_SIGNUP_ENDPOINT?.trim(),
  "launch-blog": window.PARL_SIGNUP_ENDPOINT?.trim(),
  "lords-volunteer": window.PARL_LORDS_SIGNUP_ENDPOINT?.trim() || window.PARL_SIGNUP_ENDPOINT?.trim(),
});

const initSignupForms = () => {
  const signupEndpoints = getSignupEndpoints();

  document.querySelectorAll("[data-signup-form]").forEach((form) => {
    const submitButton = form.querySelector('button[type="submit"]');
    const status = form.querySelector("[data-form-status]");
    const source = form.dataset.signupSource || "signup";

    if (!form.querySelector('input[name="_gotcha"]')) {
      const honeypot = document.createElement("input");
      honeypot.type = "text";
      honeypot.name = "_gotcha";
      honeypot.autocomplete = "off";
      honeypot.tabIndex = -1;
      honeypot.className = "signup-honeypot";
      honeypot.setAttribute("aria-hidden", "true");
      form.append(honeypot);
    }

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

      const signupEndpoint = signupEndpoints[source] || signupEndpoints.default;

      if (!signupEndpoint) {
        setStatus(SIGNUP_CONFIG_MESSAGE, "error");
        return;
      }

      const formData = new FormData(form);

      if (String(formData.get("_gotcha") || "").trim()) {
        form.reset();
        setStatus(SIGNUP_SUCCESS_MESSAGE, "success");
        return;
      }

      formData.set("signup_type", source);
      formData.set("page_url", window.location.href);

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.dataset.originalLabel = submitButton.textContent || "";
        submitButton.textContent = SIGNUP_SUBMITTING_MESSAGE;
      }

      form.classList.add("is-submitting");
      setStatus(SIGNUP_SUBMITTING_MESSAGE, null);

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
        setStatus(SIGNUP_SUCCESS_MESSAGE, "success");
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
};

ensureMainSkipLink();
syncSiteStatuses();
enhancePrimaryNav();
initMobileNav();

runAfterFirstPaint(() => {
  initHeroMotionImages();

  runWhenIdle(() => {
    initTabs();
    initConceptGuards();
    initSignupForms();
  });
});
