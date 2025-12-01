// ===================== 常數設定 =====================
import { 
    generateRandomBoard,
    pickRandomEvent,
    SPECIAL_TOPICS,
    CELL_POS
} from './board.js';

// ⭐ 遊戲設定（會被 localStorage 覆蓋）
let GAME_SETTINGS = {
    totalPlayers: null,
    initCash: 30,
    winCash: 100,
    minLev: -3,
    maxLev: 9,
    useDiceAnimation: true,
    useSound: true,
};

// ⭐ 動態棋盤（遊戲開始後才產生）
let dynamicBoard = [];

const MAX_PLAYERS = 6;
const BOARD_SIZE = 36;
let   INIT_CASH = 30;   // 🔧 一定要 let，才能被設定覆蓋

const PLAYER_SYMBOLS = ["●", "▲", "■", "★", "☾", "◆"];
const PLAYER_COLORS = ["#0070c0", "#c00000", "#ffc000", "#00b050", "#7030a0", "#ed7d31"];

// ===================== 遊戲狀態 =====================
let totalPlayers = 0;
let currentPlayer = 0;
let diceMax = 6;
let gameStarted = false;

const players = [];
let pending = null;

// DOM 元素快取
let boardEl, infoEl, eventTextEl, impactEl;
let teachLearnEl, teachAdviceEl, teachTypeEl, teachFaceEl, teachMindEl;
let playersTableBody, leverageInput;
let btnSetPlayers, btnStart, btnReset, btnRoll, btnReveal;
let diceBox;

// 事件彈窗相關 DOM
let eventModal, eventModalTopic, eventModalTitle;
let eventModalImpact, eventModalLearn, eventModalAdvice, eventModalType, eventModalFace, eventModalMind;
let eventModalImpactRow, eventModalLearnRow, eventModalAdviceRow, eventModalTypeRow, eventModalFaceRow, eventModalMindRow;
let eventModalHint, eventModalCloseBtn, eventModalOkBtn;


// 音效
let diceRollAudio = null;
let diceLandAudio = null;

// ===================== 初始化 =====================
window.addEventListener("DOMContentLoaded", () => {
    boardEl = document.getElementById("board");
    infoEl = document.getElementById("infoText");
    eventTextEl = document.getElementById("eventText");
    impactEl = document.getElementById("impactValue");
    teachLearnEl = document.getElementById("teachLearn");
    teachAdviceEl = document.getElementById("teachAdvice");
    teachTypeEl = document.getElementById("teachType");
    teachFaceEl = document.getElementById("teachFace");
    teachMindEl = document.getElementById("teachMind");
    playersTableBody = document.querySelector("#playersTable tbody");
    leverageInput = document.getElementById("leverageInput");

    btnSetPlayers = document.getElementById("btnSetPlayers");
    btnStart = document.getElementById("btnStart");
    btnReset = document.getElementById("btnReset");
    btnRoll = document.getElementById("btnRoll");
    btnReveal = document.getElementById("btnReveal");
    diceBox = document.getElementById("diceBox");

    // 讀取 localStorage 設定
    try {
        const stored = localStorage.getItem("stockGameSettings");
        if (stored) {
            const parsed = JSON.parse(stored);
            GAME_SETTINGS = { ...GAME_SETTINGS, ...parsed };
        }
    } catch (e) {
        console.warn("讀取設定失敗，使用預設值。", e);
    }

    // 用設定覆蓋起始現金 / 勝利條件
    INIT_CASH = GAME_SETTINGS.initCash ?? INIT_CASH;

    // 初始化音效（路徑你可以依專案調整）
    diceRollAudio = new Audio("sounds/dice_roll.mp3");
    diceLandAudio = new Audio("sounds/dice_land.mp3");

    if (!GAME_SETTINGS.useSound) {
        diceRollAudio.muted = true;
        diceLandAudio.muted = true;
    }

    // 綁定 toggle 控制
    const animToggle = document.getElementById("diceAnimationToggle");
    const soundToggle = document.getElementById("diceSoundToggle");

    if (animToggle && typeof GAME_SETTINGS.useDiceAnimation === "boolean") {
        animToggle.checked = GAME_SETTINGS.useDiceAnimation;
    }
    if (soundToggle && typeof GAME_SETTINGS.useSound === "boolean") {
        soundToggle.checked = GAME_SETTINGS.useSound;
    }

    soundToggle?.addEventListener("change", (e) => {
        const on = e.target.checked;
        GAME_SETTINGS.useSound = on;
        if (diceRollAudio) diceRollAudio.muted = !on;
        if (diceLandAudio) diceLandAudio.muted = !on;
    });

    wireEvents();
        // 事件彈窗 DOM 綁定
    eventModal        = document.getElementById("eventModal");
    eventModalTopic   = document.getElementById("eventModalTopic");
    eventModalTitle   = document.getElementById("eventModalTitle");
    eventModalImpact  = document.getElementById("eventModalImpact");
    eventModalLearn   = document.getElementById("eventModalLearn");
    eventModalAdvice  = document.getElementById("eventModalAdvice");
    eventModalType    = document.getElementById("eventModalType");
    eventModalFace    = document.getElementById("eventModalFace");
    eventModalMind    = document.getElementById("eventModalMind");

    eventModalImpactRow = document.getElementById("eventModalImpactRow");
    eventModalLearnRow  = document.getElementById("eventModalLearnRow");
    eventModalAdviceRow = document.getElementById("eventModalAdviceRow");
    eventModalTypeRow   = document.getElementById("eventModalTypeRow");
    eventModalFaceRow   = document.getElementById("eventModalFaceRow");
    eventModalMindRow   = document.getElementById("eventModalMindRow");

    eventModalHint    = document.getElementById("eventModalHint");
    eventModalCloseBtn = document.getElementById("eventModalClose");
    eventModalOkBtn    = document.getElementById("eventModalOk");

    if (eventModalCloseBtn) {
        eventModalCloseBtn.addEventListener("click", () => closeEventModal());
    }
    if (eventModalOkBtn) {
        eventModalOkBtn.addEventListener("click", () => closeEventModal());
    }
    if (eventModal) {
        // 點背景也可以關閉
        eventModal.addEventListener("click", (e) => {
            if (e.target === eventModal) {
                closeEventModal();
            }
        });
    }

    clearEventArea(true);
    uiInfo("請先「設定玩家人數」。");
});

// ===================== UI：棋盤 =====================
function buildBoard() {
    boardEl.innerHTML = "";

    for (let i = 0; i < dynamicBoard.length; i++) {
        const pos = CELL_POS[i];  // { row, col }

        const cell = document.createElement("div");
        cell.className = "cell";

        cell.style.gridRowStart = pos.row;
        cell.style.gridColumnStart = pos.col;

        cell.innerHTML = `
            <div class="cell-topic">${dynamicBoard[i]}</div>
            <div class="cell-index">#${i + 1}</div>
            <div class="tokens" id="tokens-${i + 1}"></div>
        `;

        boardEl.appendChild(cell);
    }
}

// ===================== UI 事件綁定 =====================
function wireEvents() {
    btnSetPlayers.addEventListener("click", onSetPlayers);
    btnStart.addEventListener("click", onStartGame);
    btnReset.addEventListener("click", onResetGame);
    btnRoll.addEventListener("click", onRollDice);
    btnReveal.addEventListener("click", onReveal);
}

// ===================== UI 輔助 =====================
function uiInfo(msg) { infoEl.textContent = msg || ""; }

function clearTeach() {
    teachLearnEl.textContent = "";
    teachAdviceEl.textContent = "";
    teachTypeEl.textContent = "";
    teachFaceEl.textContent = "";
    teachMindEl.textContent = "";
}

function clearEventArea(clearTeachFields) {
    eventTextEl.textContent = "";
    impactEl.textContent = "";
    if (clearTeachFields) clearTeach();
}

function openEventModal(options) {
    if (!eventModal) return;
    const {
        topic = "",
        title = "",
        impact = "",
        learn = "",
        advice = "",
        type = "",
        face = "",
        mind = "",
        isPending = false
    } = options || {};

    if (eventModalTopic) eventModalTopic.textContent = topic || "事件主題";
    if (eventModalTitle) eventModalTitle.textContent = title || "";

    // 影響值區塊（如果沒有 impact 就隱藏）
    if (eventModalImpactRow) {
        if (impact === "" || impact === null || impact === undefined) {
            eventModalImpactRow.style.display = "none";
        } else {
            eventModalImpactRow.style.display = "flex";
            if (eventModalImpact) eventModalImpact.textContent = impact;
        }
    }

    // 教學 & 建議 & 類型等：如果為空則隱藏該列
    const setRow = (rowEl, spanEl, value) => {
        if (!rowEl) return;
        if (!value) {
            rowEl.style.display = "none";
        } else {
            rowEl.style.display = "flex";
            if (spanEl) spanEl.textContent = value;
        }
    };

    setRow(eventModalLearnRow,  eventModalLearn,  learn);
    setRow(eventModalAdviceRow, eventModalAdvice, advice);
    setRow(eventModalTypeRow,   eventModalType,   type);
    setRow(eventModalFaceRow,   eventModalFace,   face);
    setRow(eventModalMindRow,   eventModalMind,   mind);

    // Hint：尚未公布 vs 已公布
    if (eventModalHint) {
        eventModalHint.textContent = isPending
            ? "👉 請在右側輸入槓桿後，按下「公布」計算實際影響。"
            : "✅ 影響值已套用到玩家現金與績效。";
    }

    eventModal.classList.remove("hidden");
    eventModal.classList.add("visible");
}

function closeEventModal() {
    if (!eventModal) return;
    eventModal.classList.remove("visible");
    eventModal.classList.add("hidden");
}


function showEventOnly(text) {
    eventTextEl.textContent = text;
    impactEl.textContent = "";
    clearTeach();

    // 從文字中拆出【主題】與內容
    let topic = "事件";
    let title = text;
    const m = text.match(/^【(.+?)】(.*)$/);
    if (m) {
        topic = m[1];
        title = m[2] || m[1];
    }

    openEventModal({
        topic,
        title,
        impact: "",
        learn: "",
        advice: "",
        type: "",
        face: "",
        mind: "",
        isPending: true
    });
}

function showEventAndImpact(text, impact, learn, advice, type, face, mind) {
    // === 右側原本區塊 ===
    learn  = learn  ?? "";
    advice = advice ?? "";
    type   = type   ?? "";
    face   = face   ?? "";
    mind   = mind   ?? "";

    eventTextEl.textContent = text;
    impactEl.textContent = impact;

    teachLearnEl.textContent  = learn;
    teachAdviceEl.textContent = advice;
    teachTypeEl.textContent   = type;
    teachFaceEl.textContent   = face;
    teachMindEl.textContent   = mind;

    // === 彈窗區 ===
    let topic = "事件";
    let title = text;
    const m = text.match(/^【(.+?)】(.*)$/);
    if (m) {
        topic = m[1];
        title = m[2] || m[1];
    }

    openEventModal({
        topic,
        title,
        impact,
        learn,
        advice,
        type,
        face,
        mind,
        isPending: false
    });
}


function showDice(val) {
    if (!diceBox) return;
    diceBox.textContent = val;
    diceBox.style.transform = "scale(1.15)";
    setTimeout(() => {
        diceBox.style.transform = "scale(1)";
    }, 100);
}

// ===================== 棋子渲染 =====================
function renderTokens() {
    for (let i = 1; i <= BOARD_SIZE; i++) {
        const box = document.getElementById(`tokens-${i}`);
        if (box) box.innerHTML = "";
    }
    for (let i = 1; i <= totalPlayers; i++) {
        const p = players[i];
        if (!p || !p.active) continue;

        const box = document.getElementById(`tokens-${p.pos}`);
        if (!box) continue;

        const t = document.createElement("div");
        t.className = "token";
        t.style.backgroundColor = PLAYER_COLORS[i - 1];
        box.appendChild(t);
    }
}

// ===================== 玩家表格 =====================
function renderPlayersTable() {
    playersTableBody.innerHTML = "";

    for (let i = 1; i <= totalPlayers; i++) {
        const p = players[i];
        if (!p) continue;

        const statusClass =
              !p.active && p.cash < 0  ? "status-out"
            : !p.active && p.cash >= (GAME_SETTINGS.winCash ?? 100) ? "status-win"
            : "";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>玩家${p.id}</td>
            <td style="color:${PLAYER_COLORS[i - 1]}">${PLAYER_SYMBOLS[i - 1]}</td>
            <td>${p.levSum.toFixed(0)}</td>
            <td>${p.cash.toFixed(0)}</td>
            <td class="${statusClass}">${p.status || ""}</td>
            <td>${p.perf.toFixed(2)}</td>
        `;
        playersTableBody.appendChild(tr);
    }
}

// ===================== 玩家控制 =====================
function onSetPlayers() {
    let n = GAME_SETTINGS.totalPlayers;

    if (!n) {
        const val = prompt("請輸入玩家人數（1~6）：", "3");
        if (val === null) return;
        n = parseInt(val, 10);
    }

    if (Number.isNaN(n) || n < 1 || n > MAX_PLAYERS) {
        uiInfo("玩家人數需介於 1~6。");
        return;
    }

    totalPlayers = n;
    pending = null;

    for (let i = 1; i <= n; i++) {
        players[i] = {
            id: i,
            active: true,
            pos: 1,
            cash: INIT_CASH,   // 🔥 用設定的起始現金
            levSum: 0,
            perf: 0,
            status: ""
        };
    }
    for (let i = n + 1; i <= MAX_PLAYERS; i++) players[i] = null;

    clearEventArea(true);
    renderTokens();
    renderPlayersTable();
    uiInfo(`已設定 ${totalPlayers} 位玩家，按「開始玩」。`);
}

function onStartGame() {
    if (totalPlayers < 1) {
        uiInfo("請先設定玩家人數！");
        return;
    }

    // 生成新的隨機棋盤（準備出發永遠第 1 格）
    dynamicBoard = generateRandomBoard();
    buildBoard();

    for (let i = 1; i <= totalPlayers; i++) {
        const p = players[i];
        p.active = true;
        p.pos = 1;
        p.cash = INIT_CASH;  // 再保險一次
        p.levSum = 0;
        p.perf = 0;
        p.status = "";
    }

    gameStarted = true;
    pending = null;
    currentPlayer = nextAliveFrom(0);

    clearEventArea(true);
    renderTokens();
    renderPlayersTable();
    uiInfo(`遊戲開始！請玩家${currentPlayer} 丟骰子。`);
}

function onResetGame() {
    totalPlayers = 0;
    currentPlayer = 0;
    pending = null;

    for (let i = 1; i <= MAX_PLAYERS; i++) players[i] = null;

    clearEventArea(true);
    renderTokens();
    renderPlayersTable();
    uiInfo("已重置，請重新開始。");
}

// ===================== 玩家輪替 =====================
function haveAlive() {
    return players.some(p => p && p.active);
}

function nextAliveFrom(i) {
    if (!haveAlive()) return 0;
    let k = i;
    while (true) {
        k++;
        if (k > totalPlayers) k = 1;
        if (players[k] && players[k].active) return k;
    }
}

// ===================== 丟骰子 =====================
function onRollDice() {
    if (!gameStarted) return uiInfo("請先開始遊戲！");
    if (!haveAlive()) return uiInfo("所有玩家結束，請重新玩。");
    if (pending) return uiInfo("有未公布事件，請先按「公布」。");

    const p = players[currentPlayer];
    if (!p || !p.active) {
        currentPlayer = nextAliveFrom(currentPlayer);
        uiInfo(`輪到玩家${currentPlayer} 行動。`);
        return;
    }

    const finalRoll = Math.floor(Math.random() * diceMax) + 1;

    const animToggle = document.getElementById("diceAnimationToggle");
    const useAnim =
        animToggle ? animToggle.checked : (GAME_SETTINGS.useDiceAnimation ?? true);

    const doMove = () => {
        uiInfo(`玩家${currentPlayer} 丟出 ${finalRoll} 點`);
        showDice(finalRoll);  // 🔥 小骰子同步顯示
        animateMove(p, finalRoll, () => onLand(p));
    };
    
    if (useAnim) {
        playDiceAnimation(finalRoll, doMove);
    } else {
        doMove();
    }
}

// 移動畫動畫
function animateMove(player, steps, onDone) {
    let remain = steps;

    function tick() {
        if (remain <= 0) return onDone();

        player.pos++;
        if (player.pos > BOARD_SIZE) player.pos = 1;

        renderTokens();
        remain--;
        setTimeout(tick, 120);
    }
    tick();
}

// ===================== 落地事件 =====================
function onLand(player) {
    const pos = player.pos;
    const topic = dynamicBoard[pos - 1];

    const ev = pickRandomEvent(topic);

    if (!ev) {
        showEventOnly(`【${topic}】沒有事件資料。`);
        currentPlayer = nextAliveFrom(currentPlayer);
        return;
    }

    // 特殊主題：不吃槓桿
    if (SPECIAL_TOPICS.includes(topic)) {
        applyCash(player, ev.impact);
        updatePerf(player, 0);

        showEventAndImpact(
            `【${topic}】${ev.text}`,
            ev.impact,
            ev.learn,
            ev.advice,
            ev.type,
            ev.face,
            ev.mind
        );

        checkStatus(player);
        renderPlayersTable();
        currentPlayer = nextAliveFrom(currentPlayer);
        uiInfo(`玩家${player.id} 已觸發特殊事件，輪到下一位。`);
        return;
    }

    // 一般主題 → 需要公布
    pending = { playerId: player.id, topic, ev };
    showEventOnly(`【${topic}】${ev.text}`);
    uiInfo(`輸入槓桿後按「公布」。`);
}

// ===================== 公布事件 =====================
function onReveal() {
    if (!pending) return uiInfo("沒有待公布的事件。");

    const p = players[pending.playerId];
    const e = pending.ev;

    let lv = parseInt(leverageInput.value, 10);
    if (Number.isNaN(lv)) lv = 1;

    const minLev = GAME_SETTINGS.minLev ?? -3;
    const maxLev = GAME_SETTINGS.maxLev ?? 9;
    lv = Math.max(minLev, Math.min(maxLev, lv));

    const dCash = lv * e.impact;

    showEventAndImpact(
        `【${pending.topic}】${e.text}`,
        e.impact,
        e.learn,
        e.advice,
        e.type,
        e.face,
        e.mind
    );

    updatePlayerCashAndPerf(p, dCash, lv);
    pending = null;
    renderPlayersTable();

    if (haveAlive()) {
        currentPlayer = nextAliveFrom(currentPlayer);
        uiInfo(`事件公布完成，輪到玩家${currentPlayer}。`);
    } else {
        uiInfo("所有玩家皆已結束。");
    }
}

// ===================== 金錢 / 績效 / 狀態 =====================
function applyCash(player, dCash) {
    player.cash += dCash;
}

function updatePlayerCashAndPerf(player, dCash, lev) {
    player.levSum += lev;
    applyCash(player, dCash);

    if (player.levSum <= 0) player.perf = 0;
    else player.perf = (player.cash - INIT_CASH) / Math.sqrt(player.levSum);

    checkStatus(player);
}

function updatePerf(player, extraLev) {
    player.levSum += extraLev;

    if (player.levSum <= 0) player.perf = 0;
    else player.perf = (player.cash - INIT_CASH) / Math.sqrt(player.levSum);
}

function checkStatus(player) {
    const winCash = GAME_SETTINGS.winCash ?? 100;
    if (player.cash < 0) {
        player.active = false;
        player.status = "出局";
    } else if (player.cash >= winCash) {
        player.active = false;
        player.status = "過關";
    } else {
        player.status = "";
    }
}

// ===================== 3D 骰子動畫 =====================
function playDiceAnimation(finalRoll, done) {
    const overlay = document.getElementById("diceOverlay");
    const cube = document.getElementById("diceCube");
    if (!overlay || !cube) {
        if (typeof done === "function") done();
        return;
    }

    // 重置狀態
    overlay.classList.remove("hidden");
    overlay.classList.add("visible");

    cube.classList.remove(
        "stop-spin",
        "show-1", "show-2", "show-3", "show-4", "show-5", "show-6"
    );
    cube.classList.add("rolling", "show-1");

    // 滾動音效
    if (GAME_SETTINGS.useSound && diceRollAudio) {
        diceRollAudio.currentTime = 0;
        diceRollAudio.loop = true;
        diceRollAudio.play().catch(() => {});
    }

    // 滾一段時間後停在結果
    setTimeout(() => {
        cube.classList.remove("rolling");
        cube.classList.add("stop-spin", `show-${finalRoll}`);

        if (diceRollAudio) {
            diceRollAudio.loop = false;
            diceRollAudio.pause();
        }
        if (GAME_SETTINGS.useSound && diceLandAudio) {
            diceLandAudio.currentTime = 0;
            diceLandAudio.play().catch(() => {});
        }

        // 再等一下淡出
        setTimeout(() => {
            overlay.classList.remove("visible");
            overlay.classList.add("hidden");

            if (typeof done === "function") done();
        }, 400);
    }, 900);
}
