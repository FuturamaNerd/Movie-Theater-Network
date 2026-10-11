async function addHeaderStart() {
  const response = await fetch("/supplementary-content/header.html");
  if (!response.ok) {
    throw new Error(`Failed to load header: ${response.status}`);
  }

  const template = document.createElement("template");
  template.innerHTML = await response.text();
  const header = template.content.querySelector("header");
  if (!header) {
    throw new Error("Header markup was not found in the response");
  }

  document.body.prepend(header);
  document.dispatchEvent(
    new CustomEvent("header:rendered", { detail: { header } }),
  );
}

addHeaderStart().catch((error) => {
  console.error("Unable to render header:", error);
});