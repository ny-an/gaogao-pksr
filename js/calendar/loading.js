function showLoading() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) {
    overlay.style.display = "flex";
  }
}

function hideLoading() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) {
    overlay.style.display = "none";
  }
}
