// board.js
import { EVENTS } from './events.js';

// =======================
//  36 個主題 (你的原版)
// =======================
export const BOARD_TOPICS = [
  "準備出發","K線型態","均線趨勢","技術指標1","技術指標2",
  "技術線型1","技術型態2","籌碼持股","情緒信心","人生機會",
  "內外盤勢","資產負債","收入損益","股利政策","現金流量",
  "價值評估","公司治理","永續表現","休息紓壓",
  "原物料價","相關指數","市場競爭","供應鏈","競爭五力",
  "國際金融","貨幣政策","財政政策","命也運也",
  "金融市場","景氣循環","就業物價","法規變化",
  "地緣政治","氣候疫情","技術發展","全球經濟"
];

export const SPECIAL_TOPICS = [
  "準備出發", "人生機會", "休息紓壓", "命也運也"
];

// =======================
//   ⭐ 正確版 外圈 36 格座標
//   (row:1~12, col:1~12)
// =======================
// ⭐ 36 格一圈的絕對正確座標（對應 12×12 外框）
export const CELL_POS = [
    // 上排 (1–10)
    { row: 1,  col: 1 },
    { row: 1,  col: 2 },
    { row: 1,  col: 3 },
    { row: 1,  col: 4 },
    { row: 1,  col: 5 },
    { row: 1,  col: 6 },
    { row: 1,  col: 7 },
    { row: 1,  col: 8 },
    { row: 1,  col: 9 },
    { row: 1,  col: 10 },

    // 右排 (11–19)
    { row: 2,  col: 10 },
    { row: 3,  col: 10 },
    { row: 4,  col: 10 },
    { row: 5,  col: 10 },
    { row: 6,  col: 10 },
    { row: 7,  col: 10 },
    { row: 8,  col: 10 },
    { row: 9,  col: 10 },
    { row: 10, col: 10 },

    // 下排 (20–28)
    { row: 10, col: 9 },
    { row: 10, col: 8 },
    { row: 10, col: 7 },
    { row: 10, col: 6 },
    { row: 10, col: 5 },
    { row: 10, col: 4 },
    { row: 10, col: 3 },
    { row: 10, col: 2 },
    { row: 10, col: 1 },

    // 左排 (29–36)
    { row: 9, col: 1 },
    { row: 8, col: 1 },
    { row: 7, col: 1 },
    { row: 6, col: 1 },
    { row: 5, col: 1 },
    { row: 4, col: 1 },
    { row: 3, col: 1 },
    { row: 2, col: 1 },
];


// =======================
//   ⭐ 固定 #1 + 35 格洗牌
// =======================
export function generateRandomBoard() {
  const first = BOARD_TOPICS[0]; // "準備出發"
  const rest = BOARD_TOPICS.slice(1);

  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }

  return [first, ...rest];
}

// =======================
//   隨機事件
// =======================
export function pickRandomEvent(topic) {
  const list = EVENTS[topic];
  if (!list) return null;
  return list[Math.floor(Math.random() * list.length)];
}
