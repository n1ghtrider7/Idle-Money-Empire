// --- Game State ---
let state = {
    money: 0,
    clicks: 0,
    level: 1,
    basePower: 1,
    combo: 0,
    lastClickTime: 0,
    globalMultiplier: 1.00,
    tokens: 0,
    prestigeLevel: 0,
    buildings: {
        office: { count: 0, baseCost: 20, income: 2 },
        factory: { count: 0, baseCost: 100, income: 10 },
        bank: { count: 0, baseCost: 500, income: 50 }
    }
};

// --- DOM Elements ---
const elMoney = document.getElementById('total-money');
const elIncome = document.getElementById('income-sec');
const elLevel = document.getElementById('level');
const elXpFill = document.getElementById('xp-fill');
const elCombo = document.getElementById('combo-display');
const elClicker = document.getElementById('main-clicker');
const elGlobalMult = document.getElementById('global-mult');

// --- Click & Combo Logic ---
elClicker.addEventListener('click', (e) => {
    let now = Date.now();
    
    // Combo Logic
    if (now - state.lastClickTime < 2000) {
        state.combo++;
    } else {
        state.combo = 0; // Reset if too slow
    }
    state.lastClickTime = now;

    // Calculate Power
    let comboMult = Math.min(1 + (state.combo * 0.018), 2.5);
    let clickValue = state.basePower * state.globalMultiplier * comboMult;
    let isCrit = Math.random() < 0.05; // 5% chance

    if (isCrit) {
        clickValue *= 10;
        triggerCritFlash();
    }

    state.money += clickValue;
    state.clicks++;

    // Level up logic (20 clicks = 1 level)
    if (state.clicks >= 20) {
        state.level++;
        state.clicks = 0;
    }

    // UI Updates
    spawnFloatingText(e.clientX, e.clientY, clickValue, isCrit);
    updateUI();
    updateComboDisplay(comboMult);
});

// --- Buildings & Upgrades ---
function buyBuilding(id, baseCost, income) {
    let cost = getBuildingCost(id, baseCost);
    if (state.money >= cost) {
        state.money -= cost;
        state.buildings[id].count++;
        updateUI();
    }
}

function buyUpgrade(id, cost, power) {
    if (state.money >= cost) {
        state.money -= cost;
        state.basePower += power;
        document.getElementById(`upg-${id}`).disabled = true; // One time buy
        updateUI();
    }
}

function getBuildingCost(id, baseCost) {
    return Math.floor(baseCost * Math.pow(1.15, state.buildings[id].count));
}

// --- Casino (Simulated) ---
function getBet() {
    return parseInt(document.getElementById('bet-amount').value);
}

function playCoinFlip() {
    let bet = getBet();
    const resEl = document.getElementById('casino-result');
    if (state.money < bet) { resEl.innerText = "Not enough money!"; return; }
    
    state.money -= bet;
    let win = Math.random() < 0.5;
    if (win) {
        let payout = bet * 1.9;
        state.money += payout;
        resEl.innerText = `Heads! You won $${payout.toFixed(2)}`;
        resEl.style.color = "#4CAF50";
    } else {
        resEl.innerText = `Tails! You lost $${bet}`;
        resEl.style.color = "#f44336";
    }
    updateUI();
}

function playDice() {
    let bet = getBet();
    const resEl = document.getElementById('casino-result');
    if (state.money < bet) { resEl.innerText = "Not enough money!"; return; }

    state.money -= bet;
    // User implicitly picking a number, odds of hitting 1 out of 6
    let win = Math.random() < (1/6); 
    if (win) {
        let payout = bet * 5;
        state.money += payout;
        resEl.innerText = `Rolled your number! Won $${payout.toFixed(2)}`;
        resEl.style.color = "#4CAF50";
    } else {
        resEl.innerText = `Wrong number. You lost $${bet}`;
        resEl.style.color = "#f44336";
    }
    updateUI();
}

// --- Visual Effects ---
function spawnFloatingText(x, y, amount, isCrit) {
    const floatEl = document.createElement('div');
    floatEl.className = `floating-text ${isCrit ? 'crit-text' : ''}`;
    floatEl.innerText = `+$${amount.toFixed(2)}`;
    floatEl.style.left = `${x}px`;
    floatEl.style.top = `${y - 20}px`;
    document.body.appendChild(floatEl);

    setTimeout(() => { floatEl.remove(); }, 1000);
}

function triggerCritFlash() {
    const flash = document.createElement('div');
    flash.className = 'crit-flash';
    document.body.appendChild(flash);
    setTimeout(() => { flash.remove(); }, 300);
}

function updateComboDisplay(mult) {
    if (state.combo >= 4) {
        elCombo.innerText = `${mult.toFixed(2)}x COMBO`;
        elCombo.classList.add('combo-active');
    } else {
        elCombo.classList.remove('combo-active');
    }
}

// --- Core Game Loop ---
function updateUI() {
    elMoney.innerText = `$${state.money.toFixed(2)}`;
    elLevel.innerText = state.level;
    elXpFill.style.width = `${(state.clicks / 20) * 100}%`;
    elGlobalMult.innerText = `x${state.globalMultiplier.toFixed(2)}`;

    // Calculate total income
    let totalIncome = 0;
    for (let key in state.buildings) {
        let b = state.buildings[key];
        totalIncome += b.count * b.income;
        // Update costs in UI
        let btn = document.getElementById(`bld-${key}`);
        let cost = getBuildingCost(key, b.baseCost);
        document.getElementById(`cost-${key}`).innerText = cost;
        
        // Affordability styling
        if(state.money >= cost) btn.classList.add('affordable');
        else btn.classList.remove('affordable');
    }
    elIncome.innerText = `+$${(totalIncome * state.globalMultiplier).toFixed(2)} / sec`;
}

// Passive Income Tick (Runs every 1 second)
setInterval(() => {
    let totalIncome = 0;
    for (let key in state.buildings) {
        let b = state.buildings[key];
        totalIncome += b.count * b.income;
    }
    
    // Random Market Events (1.6% total chance per second)
    let marketMod = 1.0;
    let rand = Math.random();
    if (rand < 0.008) marketMod = 1.5;      // Boom
    else if (rand < 0.016) marketMod = 0.7; // Crash

    state.money += (totalIncome * state.globalMultiplier * marketMod);

    // Combo Decay check
    if (Date.now() - state.lastClickTime >= 2000) {
        state.combo = 0;
        updateComboDisplay(1);
    }

    updateUI();
}, 1000);

// Initialize
updateUI();