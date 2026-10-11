export function switchModal(doc, currentModal, targetButton) {
  if (!doc.defaultView.bootstrap?.Modal) {
    throw new Error("Unable to switch modals without Bootstrap");
  }

  currentModal.addEventListener(
    "hidden.bs.modal",
    () => targetButton.click(),
    { once: true },
  );
  doc.defaultView.bootstrap.Modal.getOrCreateInstance(currentModal).hide();
}
