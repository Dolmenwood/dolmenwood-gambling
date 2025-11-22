// --- GAME STATE ---
let gameState = {
    mode: 'nocheat', // 'cheat' or 'nocheat'
    cheatModifier: 0,
    cheatCompMod: 0, // Penalty for complication roll based on cheating
    gamblingMod: 0,  // Bonus/Malus for gambling roll
    gamblingCompMod: 0 // Modifier for complication based on winnings
};

// --- DICE UTILS ---
function rollD6() {
    return Math.floor(Math.random() * 6) + 1;
}

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
}

// --- NAVIGATION ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    window.scrollTo(0, 0);
}

function goHome() {
    showScreen('screen-home');
}

function showRules() {
    showScreen('screen-rules');
}

// --- FLOW: NO CHEAT ---
function startNoCheat() {
    gameState.mode = 'nocheat';
    gameState.cheatModifier = 0;
    gameState.cheatCompMod = 0;
    gameState.gamblingMod = 0; // No bonus from cheating
    
    runGamblingPhase();
}

// --- FLOW: CHEAT ---
function startCheat() {
    gameState.mode = 'cheat';
    showScreen('screen-cheat-select');
}

function runCheatPhase(modifier) {
    gameState.cheatModifier = modifier;
    
    // Roll
    const d1 = rollD6();
    const d2 = rollD6();
    const rawTotal = d1 + d2 + modifier;
    const cappedTotal = clamp(rawTotal, 2, 12);

    // Determine Outcomes
    let outcomeText = "";
    
    if (cappedTotal <= 2) {
        outcomeText = "Caught red-handed! The atmosphere turns hostile.";
        gameState.cheatCompMod = -4; // Heavy penalty
        gameState.gamblingMod = 0;
    } else if (cappedTotal >= 3 && cappedTotal <= 5) {
        outcomeText = "Cheating suspected. Eyes are upon you.";
        gameState.cheatCompMod = -2; // Small penalty
        gameState.gamblingMod = 0;
    } else if (cappedTotal >= 6 && cappedTotal <= 8) {
        outcomeText = "Cheating unnoticed but ineffective.";
        gameState.cheatCompMod = 0;
        gameState.gamblingMod = 0;
    } else if (cappedTotal >= 9 && cappedTotal <= 11) {
        outcomeText = "Cheating effective. You adjust the odds in your favor.";
        gameState.cheatCompMod = 0;
        gameState.gamblingMod = 2;
    } else { // 12+
        outcomeText = "Cheating very effective. You masterfully rig the game.";
        gameState.cheatCompMod = 0;
        gameState.gamblingMod = 4;
    }

    // Render UI
    renderResultScreen({
        title: "Cheating Attempt",
        d1: d1,
        d2: d2, // 2d6
        mod: modifier,
        total: rawTotal,
        capped: cappedTotal,
        text: outcomeText,
        range: "[2, 12]",
        actions: [
            { label: "Continue to Gambling", fn: "runGamblingPhase()", primary: true },
            { label: "Return Home", fn: "goHome()", primary: false }
        ]
    });
}

// --- FLOW: GAMBLING ---
function runGamblingPhase() {
    const mod = gameState.gamblingMod;
    
    // Roll
    const d1 = rollD6();
    const d2 = rollD6();
    const rawTotal = d1 + d2 + mod;
    const cappedTotal = clamp(rawTotal, 2, 12);

    // Outcomes
    let outcomeText = "";
    let triggersComplication = false;

    if (cappedTotal <= 5) {
        // Combined 2 or less and 3-5 for simplicity, or separate them
        outcomeText = cappedTotal <= 2 ? "Disaster. You lose 10× your stake." : "You lose 2× your stake.";
        triggersComplication = false;
    } else if (cappedTotal >= 6 && cappedTotal <= 8) {
        outcomeText = "A wash. You break even.";
        triggersComplication = false;
    } else if (cappedTotal >= 9 && cappedTotal <= 11) {
        outcomeText = "Success! You win 2× your stake.";
        triggersComplication = true;
        gameState.gamblingCompMod = 2; // Moderate win, moderate safety
    } else { // 12+
        outcomeText = "Jackpot! You win 10× your stake.";
        triggersComplication = true;
        gameState.gamblingCompMod = 0; // Big win, big jealousy (harder complication roll)
    }

    // Buttons logic
    let actions = [];
    if (triggersComplication) {
        outcomeText += " (Complication check triggered)";
        actions.push({ label: "Roll Complication", fn: "runComplicationPhase()", primary: true });
    } else {
        // Loop back based on mode
        if (gameState.mode === 'cheat') {
            actions.push({ label: "Play Again (Cheat)", fn: "startCheat()", primary: true });
        } else {
            actions.push({ label: "Play Again (No Cheat)", fn: "startNoCheat()", primary: true });
        }
    }
    actions.push({ label: "Return Home", fn: "goHome()", primary: false });

    renderResultScreen({
        title: "Gambling Table",
        d1: d1,
        d2: d2,
        mod: mod,
        total: rawTotal,
        capped: cappedTotal,
        text: outcomeText,
        range: "[2, 12]",
        actions: actions
    });
}

// --- FLOW: COMPLICATION ---
function runComplicationPhase() {
    // Calculate total mod
    const totalCompMod = gameState.cheatCompMod + gameState.gamblingCompMod;
    
    // Roll 1d6
    const d1 = rollD6();
    const rawTotal = d1 + totalCompMod;
    const cappedTotal = clamp(rawTotal, 1, 6);

    let outcomeText = "";
    if (cappedTotal <= 1) {
        outcomeText = "A Thieves’ Guild or official takes notice. Future trouble is guaranteed.";
    } else if (cappedTotal === 2) {
        outcomeText = "Hostile repayment demanded; regional reputation damaged.";
    } else if (cappedTotal === 3) {
        outcomeText = "Hostile repayment demanded; local reputation damaged.";
    } else if (cappedTotal === 4) {
        outcomeText = "General hostility from tablemates; some may become enemies.";
    } else { // 5+
        outcomeText = "You slip away into the night. No immediate complication.";
    }

    // Loop back
    let actions = [];
    if (gameState.mode === 'cheat') {
        actions.push({ label: "Play Again (Cheat)", fn: "startCheat()", primary: true });
    } else {
        actions.push({ label: "Play Again (No Cheat)", fn: "startNoCheat()", primary: true });
    }
    actions.push({ label: "Return Home", fn: "goHome()", primary: false });

    renderResultScreen({
        title: "Complication Table",
        d1: d1,
        d2: null, // 1d6 only
        mod: totalCompMod,
        total: rawTotal,
        capped: cappedTotal,
        text: outcomeText,
        range: "[1, 6]",
        actions: actions
    });
}

// --- RENDER HELPER ---
function renderResultScreen(data) {
    document.getElementById('result-title').innerText = data.title;
    
    // Dice Strip
    document.getElementById('die-1').innerText = data.d1;
    const die2El = document.getElementById('die-2');
    if (data.d2 !== null) {
        die2El.style.display = 'flex';
        die2El.previousElementSibling.style.display = 'inline'; // The "+"
        die2El.innerText = data.d2;
    } else {
        die2El.style.display = 'none';
        die2El.previousElementSibling.style.display = 'none'; // The "+"
    }
    
    // Format modifier string (e.g. "+2", "-1", "0")
    const modStr = data.mod >= 0 ? `+${data.mod}` : data.mod;
    document.getElementById('result-mod').innerText = modStr;
    
    document.getElementById('result-total').innerText = data.total;
    document.getElementById('result-capped-text').innerText = `Capped to table range: ${data.capped} ${data.range}`;
    
    document.getElementById('outcome-text').innerText = data.text;

    // Buttons
    const actionArea = document.getElementById('result-actions');
    actionArea.innerHTML = ''; // Clear old buttons
    data.actions.forEach(act => {
        const btn = document.createElement('button');
        btn.className = act.primary ? 'btn btn-primary' : 'btn btn-secondary';
        btn.innerText = act.label;
        btn.setAttribute('onclick', act.fn);
        actionArea.appendChild(btn);
    });

    showScreen('screen-result');
}