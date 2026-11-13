function UnityProgress(gameInstance, progress) {
  if (!gameInstance.Module) return;
  if (!gameInstance.logo) {
    gameInstance.logo = document.createElement("div");
    gameInstance.logo.className = "logo " + gameInstance.Module.splashScreenStyle;
    gameInstance.container.appendChild(gameInstance.logo);
  }
  if (!gameInstance.progress) {    
    gameInstance.progress = document.createElement("div");
    gameInstance.progress.className = "progress " + gameInstance.Module.splashScreenStyle;
    gameInstance.empty = document.createElement("div");
    gameInstance.empty.className = "empty";
    gameInstance.progress.appendChild(gameInstance.empty);
    gameInstance.full = document.createElement("div");
    gameInstance.full.className = "full";
    gameInstance.progress.appendChild(gameInstance.full);
    gameInstance.container.appendChild(gameInstance.progress);
  }
  gameInstance.full.style.width = (100 * progress) + "%";
  gameInstance.logo.style.display = progress === 1 ? "none" : "block";
  gameInstance.progress.style.display = progress === 1 ? "none" : "block";
}