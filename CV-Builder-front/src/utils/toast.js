const TOAST_EVENT = "app:toast";

export const showToast = ({ message, type = "error", duration = 3500 }) => {
  if (!message) return;
  window.dispatchEvent(
    new CustomEvent(TOAST_EVENT, {
      detail: { message, type, duration },
    })
  );
};

export const toastEventName = TOAST_EVENT;
