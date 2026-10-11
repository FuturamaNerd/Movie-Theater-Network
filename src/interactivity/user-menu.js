import { getAuthSession } from "../Auth/auth-session.js";
import { logout } from "../Auth/logout.js";

function getInitials(user) {
  const name = user.fullName?.trim() || user.username?.trim() || user.email;
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length > 1) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function createAvatar(doc, className) {
  const avatar = doc.createElement("span");
  avatar.className = className;
  avatar.setAttribute("aria-hidden", "true");

  const initials = doc.createElement("span");
  initials.className = "account-avatar-initials";
  avatar.append(initials);

  const image = doc.createElement("img");
  image.className = "account-avatar-image";
  image.alt = "";
  image.hidden = true;
  image.addEventListener("error", () => {
    image.hidden = true;
    initials.hidden = false;
  });
  avatar.append(image);

  return { avatar, image, initials };
}

function createUserMenu(doc, headerActions) {
  const menu = doc.createElement("div");
  menu.className = "account-menu";
  menu.hidden = true;

  const trigger = doc.createElement("button");
  trigger.className = "account-menu-trigger";
  trigger.type = "button";
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", "account-menu-panel");

  const triggerAvatar = createAvatar(doc, "account-avatar account-avatar-trigger");
  const triggerName = doc.createElement("span");
  triggerName.className = "account-trigger-name";
  const chevron = doc.createElement("span");
  chevron.className = "account-menu-chevron";
  chevron.setAttribute("aria-hidden", "true");
  chevron.textContent = "⌄";
  trigger.append(triggerAvatar.avatar, triggerName, chevron);

  const panel = doc.createElement("div");
  panel.className = "account-menu-panel";
  panel.id = "account-menu-panel";
  panel.hidden = true;

  const identity = doc.createElement("div");
  identity.className = "account-menu-identity";
  const panelAvatar = createAvatar(doc, "account-avatar account-avatar-panel");
  const identityCopy = doc.createElement("div");
  identityCopy.className = "account-identity-copy";
  const fullName = doc.createElement("strong");
  const email = doc.createElement("span");
  email.className = "account-email";
  identityCopy.append(fullName, email);
  identity.append(panelAvatar.avatar, identityCopy);

  const profileNotice = doc.createElement("p");
  profileNotice.className = "account-profile-notice";
  profileNotice.hidden = true;
  const noticeTitle = doc.createElement("strong");
  noticeTitle.textContent = "Profile incomplete";
  const noticeCopy = doc.createElement("span");
  noticeCopy.textContent = "Please complete your profile to enable booking.";
  profileNotice.append(noticeTitle, noticeCopy);

  const profileLink = doc.createElement("a");
  profileLink.className = "account-menu-link";
  profileLink.href = "/profile";
  profileLink.textContent = "My Profile";

  const ticketsLink = doc.createElement("a");
  ticketsLink.className = "account-menu-link";
  ticketsLink.href = "/tickets";
  ticketsLink.textContent = "My Tickets";

  const logoutButton = doc.createElement("button");
  logoutButton.className = "account-menu-logout";
  logoutButton.type = "button";
  logoutButton.textContent = "Log out";

  const status = doc.createElement("p");
  status.className = "account-menu-status";
  status.setAttribute("role", "status");
  status.hidden = true;

  panel.append(
    identity,
    profileNotice,
    profileLink,
    ticketsLink,
    logoutButton,
    status,
  );
  menu.append(trigger, panel);
  headerActions.append(menu);

  function setAvatar(avatar, initials, user) {
    initials.textContent = getInitials(user);
    initials.hidden = false;
    avatar.classList.toggle(
      "has-incomplete-profile",
      user.profileComplete === false,
    );
    if (user.avatar) {
      const image = avatar.querySelector(".account-avatar-image");
      image.src = user.avatar;
      image.hidden = false;
      initials.hidden = true;
    }
  }

  function setOpen(isOpen) {
    trigger.setAttribute("aria-expanded", String(isOpen));
    panel.hidden = !isOpen;
  }

  trigger.addEventListener("click", () => {
    setOpen(panel.hidden);
  });

  doc.addEventListener("click", (event) => {
    if (!menu.contains(event.target)) setOpen(false);
  });

  doc.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      setOpen(false);
      trigger.focus();
    }
  });

  logoutButton.addEventListener("click", async () => {
    status.hidden = true;
    status.textContent = "";
    try {
      await logout(doc);
      doc.dispatchEvent(new doc.defaultView.CustomEvent("auth:logout"));
    } catch (error) {
      if (!getAuthSession(doc.defaultView.sessionStorage)) {
        doc.dispatchEvent(new doc.defaultView.CustomEvent("auth:logout"));
      }
      status.textContent = "Unable to log out. Please try again.";
      status.hidden = false;
      console.error(error);
    }
  });

  return {
    menu,
    trigger,
    triggerAvatar,
    triggerName,
    panel,
    panelAvatar,
    fullName,
    email,
    profileNotice,
    setAvatar,
  };
}

export function initializeUserMenu(doc = document) {
  const headerActions = doc.querySelector(".header-actions");
  if (!headerActions || headerActions.dataset.userMenuInitialized === "true") {
    return;
  }
  headerActions.dataset.userMenuInitialized = "true";

  const authButtons = headerActions.querySelectorAll(
    ".sign-up-button, .login-button",
  );
  const accountMenu = createUserMenu(doc, headerActions);

  function renderSession() {
    const session = getAuthSession(doc.defaultView.sessionStorage);
    for (const button of authButtons) button.hidden = Boolean(session);
    accountMenu.menu.hidden = !session;
    accountMenu.panel.hidden = true;
    accountMenu.trigger.setAttribute("aria-expanded", "false");
    if (!session) return;

    const { user } = session;
    const displayName =
      user.fullName?.trim() || user.username?.trim() || user.email;
    accountMenu.trigger.setAttribute("aria-label", `Account: ${displayName}`);
    accountMenu.triggerName.textContent = user.username || displayName;
    accountMenu.fullName.textContent = displayName;
    accountMenu.email.textContent = user.email;
    accountMenu.profileNotice.hidden = user.profileComplete !== false;
    accountMenu.setAvatar(
      accountMenu.triggerAvatar.avatar,
      accountMenu.triggerAvatar.initials,
      user,
    );
    accountMenu.setAvatar(
      accountMenu.panelAvatar.avatar,
      accountMenu.panelAvatar.initials,
      user,
    );
  }

  doc.addEventListener("auth:login", renderSession);
  doc.addEventListener("auth:logout", renderSession);
  renderSession();
}

if (typeof document !== "undefined") {
  if (document.querySelector(".header-actions")) {
    initializeUserMenu();
  } else {
    document.addEventListener(
      "header:rendered",
      () => initializeUserMenu(),
      { once: true },
    );
  }
}
