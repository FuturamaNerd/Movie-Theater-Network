async function addFooterEnd() {
  const response = await fetch("/supplementary-content/footer.html");
  if (!response.ok) {
    throw new Error(`Failed to load footer: ${response.status}`);
  }

  const template = document.createElement("template");
  template.innerHTML = await response.text();
  const footer = template.content.querySelector("footer");
  if (!footer) {
    throw new Error("Footer markup was not found in the response");
  }

  document.body.append(footer);
}

addFooterEnd().catch((error) => {
  console.error("Unable to render footer:", error);
});