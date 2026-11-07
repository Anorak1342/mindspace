
function leaderboardNotice(message) {
  var node = document.getElementById("mindspace-leaderboard-notice");
  if (!node) {
    node = document.createElement("div");
    node.id = "mindspace-leaderboard-notice";
    node.style.cssText = "position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:99999;background:#18251f;color:#b9f5d8;border:1px solid #83e6bd;padding:10px 15px;border-radius:10px;font:700 13px system-ui;box-shadow:0 5px 25px #0009;max-width:calc(100% - 24px);text-align:center";
    document.body.appendChild(node);
  }
  node.textContent = message;
  clearTimeout(node._hideTimer);
  node._hideTimer = setTimeout(function () { node.remove(); }, 5000);
}

(function () {
  if (typeof GameManager === "undefined") return;
  var originalSetup = GameManager.prototype.setup;
  var originalAddRandomTile = GameManager.prototype.addRandomTile;
  var originalMove = GameManager.prototype.move;

  GameManager.prototype.setup = function () {
    var savedState = this.storageManager.getGameState();
    this._msRanked = !savedState;
    this._msInitialSpawns = [];
    this._msMoves = [];
    this._msSpawns = [];
    this._msSubmitted = false;
    return originalSetup.apply(this, arguments);
  };

  GameManager.prototype.addRandomTile = function () {
    var before = [];
    if (this._msRanked && this.grid) {
      this.grid.eachCell(function (x, y, tile) {
        if (!tile) before.push({ x: x, y: y });
      });
    }
    var result = originalAddRandomTile.apply(this, arguments);
    if (this._msRanked && before.length) {
      for (var i = 0; i < before.length; i++) {
        var cell = before[i];
        var tile = this.grid.cellContent(cell);
        if (tile) {
          var spawn = { x: cell.x, y: cell.y, value: tile.value };
          this._msSpawns.push(spawn);
          if (this._msInitialSpawns.length < 2) this._msInitialSpawns.push(spawn);
          break;
        }
      }
    }
    return result;
  };

  GameManager.prototype.move = function (direction) {
    var before = this._msSpawns ? this._msSpawns.length : 0;
    var result = originalMove.apply(this, arguments);
    if (this._msRanked && this._msSpawns && this._msSpawns.length > before) {
      this._msMoves.push({ direction: direction, spawn: this._msSpawns[this._msSpawns.length - 1] });
    }
    if (this._msRanked && this.over && !this._msSubmitted) {
      this._msSubmitted = true;
      submitMindspace2048Score(this);
    }
    return result;
  };

  async function submitMindspace2048Score(game) {
    if (!game._msInitialSpawns || game._msInitialSpawns.length !== 2 || !game._msMoves.length) {
      leaderboardNotice("This run could not be verified for the global leaderboard.");
      return;
    }
    try {
      var appModule = await import("https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js");
      var authModule = await import("https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js");
      var functionsModule = await import("https://www.gstatic.com/firebasejs/13.2.0/firebase-functions.js");
      var firestoreModule = await import("https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js");
      var config = {
        apiKey: "AIzaSyDymemJH4sSueC3PtiRsFlzdO_sR3yf2u4",
        authDomain: "mindspace-59b2d.firebaseapp.com",
        projectId: "mindspace-59b2d",
        storageBucket: "mindspace-59b2d.firebasestorage.app",
        messagingSenderId: "17331225260",
        appId: "1:17331225260:web:251d323c504ef116465509"
      };
      var app = appModule.getApps().length ? appModule.getApp() : appModule.initializeApp(config);
      var auth = authModule.getAuth(app);
      if (!auth.currentUser) {
        await new Promise(function (resolve) {
          var stop = authModule.onAuthStateChanged(auth, function (user) { stop(); resolve(user); });
        });
      }
      if (!auth.currentUser) {
        leaderboardNotice("Sign in through Mindspace Chat to submit your 2048 score.");
        return;
      }
      var functions = functionsModule.getFunctions(app, "us-central1");
      var submit = functionsModule.httpsCallable(functions, "submit2048Score");
      var response = await submit({
        score: game.score,
        initialSpawns: game._msInitialSpawns,
        moves: game._msMoves
      });
      leaderboardNotice(response.data && response.data.personalBest ? "2048 personal best saved to the global leaderboard!" : "2048 score submitted to the global leaderboard!");
    } catch (error) {
      console.error("Mindspace 2048 leaderboard submission failed", error);
      leaderboardNotice(error && error.code === "functions/not-found"
        ? "Leaderboard server is not deployed yet."
        : "Could not submit score. Sign in and try again later.");
    }
  }
})();
