// ---------- 軍師模擬器 · 設定檔 ----------
const CONFIG = {
    // 圖片集路徑
    TILESET_PATH: '../image/environment/glass.png',
    // 圖片集尺寸
    TILESET_WIDTH: 1788,
    TILESET_HEIGHT: 640,
    // 圖片集中菱形排列 (行, 列)
    TILE_COLS: 6,
    TILE_ROWS: 5,
    // 要使用的圖塊位置 (0起始)
    TARGET_ROW: 1,
    TARGET_COL: 0,
    // 大菱形地圖尺寸 (菱形數量)
    MAP_SIZE: 100,
    // 單一菱形尺寸 (自動計算)
    TILE_WIDTH: 1788 / 6,
    TILE_HEIGHT: 640 / 5,
    
    // 視圖縮放限制
    MIN_SCALE: 0.10,
    MAX_SCALE: 3.0,

    // 城市圖片縮放比例（可依顏色分別設定）
    CITY_SCALE: {
        default: 1.2,
        red: 0.4,    // 如果紅色圖片較大，就調小（例如 1.0）
        blue: 0.4    // 如果藍色圖片較小，就調大（例如 1.4）
    },

    // 城市顏色後綴對照（用於動態生成圖片路徑）
    CITY_COLOR_SUFFIX: {
        default: '',
        red: 'red/',
        blue: 'blue/'
    },

    // 城市標籤樣式（長方形，無邊框，半透明）
    LABEL_SHOW: true,
    LABEL_OFFSET_Y: -59,  // 往上偏移，避免與菱形重疊
    LABEL_PADDING_X: 30,
    LABEL_PADDING_Y: 10,
    LABEL_BORDER_RADIUS: 132,
    LABEL_BG_COLOR: 'rgba(30, 42, 54, 0.75)',   // 半透明深色背景
    LABEL_TEXT_COLOR: '#ffffff',
    LABEL_FONT_SIZE: 40,
    LABEL_FONT_FAMILY: "'Segoe UI', '微軟正黑體', sans-serif",

    // 等級菱形樣式
    LEVEL_DIAMOND_SIZE: 10,          // 基礎大小
    LEVEL_DIAMOND_SCALE: 8,        // 放大倍率
    LEVEL_DIAMOND_COLORS: {          // 依等級變化的顏色
        default: '#f1c40f',          // 預設金色
        level1: '#3498db',           // 等級 <5 藍色
        high: '#e74c3c'              // 等級 ≥5 紅色
    },
    LEVEL_TEXT_COLORS: {             // 對應的文字顏色
        default: '#000000',
        level1: '#ffffff',
        high: '#ffffff'
    },

    // 道路連線樣式
    EDGE_COLOR: '#DECFB4',   // 線條顏色
    EDGE_WIDTH: 10,           // 線條寬度
    EDGE_ALPHA: 1,        // 透明度 (0~1)

    // 水上道路連線樣式
    WATER_EDGE_COLOR: '#4fd1cd',
    WATER_EDGE_WIDTH: 10,        // 与陆地一致，可单独调整
    WATER_EDGE_ALPHA: 1,    // 透明度 (0~1)

    // 覆蓋層圖片縮放比例 (相對於菱形地圖實際邊界)
    OVERLAY_SCALE: 1.01,   // 1.0 = 原始大小，1.2 = 放大 20%

    // 覆蓋層偏移量 (單位：世界像素)
    OVERLAY_OFFSET_X: -17,  // 正值向右移，負值向左移
    OVERLAY_OFFSET_Y: 0,   // 正值向下移，負值向上移

    // 覆蓋層透明度 (0.0 = 完全透明，1.0 = 完全不透明)
    OVERLAY_OPACITY: 0.2,

};

// 計算來源圖塊在圖集中的座標
const TILE_SRC_X = CONFIG.TARGET_COL * CONFIG.TILE_WIDTH;
const TILE_SRC_Y = CONFIG.TARGET_ROW * CONFIG.TILE_HEIGHT;

// 地圖行列數 (方便其他模組使用)
const MAP_COLS = CONFIG.MAP_SIZE;
const MAP_ROWS = CONFIG.MAP_SIZE;