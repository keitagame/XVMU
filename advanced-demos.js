// Advanced XVM-8 Demo ROMs

// カラフルなプラズマエフェクト風デモ
function buildPlasmaDemo() {
    const data = [];
    
    // Header
    data.push(0x58, 0x56, 0x4D, 0x38);  // "XVM8"
    data.push(0x00, 0xE0);               // Entry: 0xE000
    data.push(0x00, 0x00);               // Size
    
    // === Palette setup (colorful) ===
    const palette = [
        0x00, 0x03, 0x06, 0x09, 0x0C, 0x0F, 0x1C, 0x3C,
        0x5C, 0x7C, 0x9C, 0xBC, 0xDC, 0xE0, 0xE4, 0xFF
    ];
    
    for (let i = 0; i < 16; i++) {
        data.push(0x01, palette[i]);  // LD A, palette[i]
        data.push(0x09, 0x20 + i, 0xC0);  // ST A, 0xC020+i
    }
    
    // === Main drawing loop ===
    // フレームカウンターとして使用
    data.push(0x01, 0x00);  // LD A, 0  (frame counter)
    
    // Main loop start (0xE030付近)
    const loopStart = data.length;
    
    // 簡易的なパターン描画
    // Y = 0 から 127
    data.push(0x04, 0x00);  // LD D, 0  (Y counter)
    
    const yLoopStart = data.length;
    // X = 0 から 127
    data.push(0x03, 0x00);  // LD C, 0  (X counter)
    
    const xLoopStart = data.length;
    
    // カラー計算: (X + Y + frame) & 0x0F
    data.push(0x01, 0x00);   // LD A, 0
    data.push(0x14);          // MOV C,A  (A = X)
    data.push(0x61);          // PUSH B
    data.push(0x15);          // MOV D,A  (tmp)
    data.push(0x20);          // ADD A,B  (A = X + Y)
    data.push(0x65);          // POP B
    
    // 色インデックス & 0x0F
    data.push(0x30);          // AND A,B
    data.push(0x01, 0x0F);    // LD A, 0x0F
    data.push(0x13);          // MOV B,A
    data.push(0x30);          // AND A,B
    
    // VRAM書き込み (簡易版: 中央付近のみ)
    const vramAddr = 0x8000 + 32 * 128 + 32;
    data.push(0x09, vramAddr & 0xFF, (vramAddr >> 8) & 0xFF);  // ST A, VRAM
    
    // X++
    data.push(0x2C);  // INC C
    data.push(0x39, 128);  // CMP A, 128
    data.push(0x42, xLoopStart & 0xFF, (xLoopStart >> 8) & 0xFF);  // JNZ xLoop
    
    // Y++
    data.push(0x2E);  // INC D
    data.push(0x39, 128);  // CMP A, 128
    data.push(0x42, yLoopStart & 0xFF, (yLoopStart >> 8) & 0xFF);  // JNZ yLoop
    
    // Frame++
    data.push(0x28);  // INC A (frame counter)
    
    // Loop forever
    data.push(0x40, loopStart & 0xFF, (loopStart >> 8) & 0xFF);  // JMP loopStart
    
    return new Uint8Array(data);
}

// ボックス描画デモ
function buildBoxDemo() {
    const data = [];
    
    // Header
    data.push(0x58, 0x56, 0x4D, 0x38);  // "XVM8"
    data.push(0x00, 0xE0);               // Entry: 0xE000
    data.push(0x00, 0x00);
    
    // Palette (simple 4-color)
    data.push(0x01, 0x00);  // LD A, 0x00 (black)
    data.push(0x09, 0x20, 0xC0);  // ST A, 0xC020
    
    data.push(0x01, 0xFF);  // LD A, 0xFF (white)
    data.push(0x09, 0x21, 0xC0);
    
    data.push(0x01, 0xE0);  // LD A, 0xE0 (red)
    data.push(0x09, 0x22, 0xC0);
    
    data.push(0x01, 0x1C);  // LD A, 0x1C (green)
    data.push(0x09, 0x23, 0xC0);
    
    data.push(0x01, 0x03);  // LD A, 0x03 (blue)
    data.push(0x09, 0x24, 0xC0);
    
    // 矩形を複数描画
    // 中央に赤いボックス
    for (let y = 60; y < 68; y++) {
        for (let x = 60; x < 68; x++) {
            const addr = 0x8000 + y * 128 + x;
            data.push(0x01, 0x02);  // LD A, 2 (red)
            data.push(0x09, addr & 0xFF, (addr >> 8) & 0xFF);
        }
    }
    
    // 緑のボックス
    for (let y = 30; y < 38; y++) {
        for (let x = 30; x < 38; x++) {
            const addr = 0x8000 + y * 128 + x;
            data.push(0x01, 0x03);  // LD A, 3 (green)
            data.push(0x09, addr & 0xFF, (addr >> 8) & 0xFF);
        }
    }
    
    // 青のボックス
    for (let y = 90; y < 98; y++) {
        for (let x = 90; x < 98; x++) {
            const addr = 0x8000 + y * 128 + x;
            data.push(0x01, 0x04);  // LD A, 4 (blue)
            data.push(0x09, addr & 0xFF, (addr >> 8) & 0xFF);
        }
    }
    
    // 無限ループ
    const loopAddr = data.length;
    data.push(0x00);  // NOP
    data.push(0x40, loopAddr & 0xFF, (loopAddr >> 8) & 0xFF);  // JMP loop
    
    return new Uint8Array(data);
}

// ストライプパターン
function buildStripeDemo() {
    const data = [];
    
    // Header
    data.push(0x58, 0x56, 0x4D, 0x38);
    data.push(0x00, 0xE0);
    data.push(0x00, 0x00);
    
    // Rainbow palette
    const colors = [
        0x00, 0xE0, 0xE4, 0xE8, 0xEC, 0xFC, 0x1C, 0x3C,
        0x5C, 0x7C, 0x9C, 0x03, 0x07, 0x0B, 0x0F, 0xFF
    ];
    
    for (let i = 0; i < 16; i++) {
        data.push(0x01, colors[i]);
        data.push(0x09, 0x20 + i, 0xC0);
    }
    
    // 横ストライプを描画
    for (let y = 0; y < 128; y++) {
        const color = Math.floor(y / 8) & 0x0F;
        for (let x = 0; x < 128; x += 8) {
            const addr = 0x8000 + y * 128 + x;
            data.push(0x01, color);
            data.push(0x09, addr & 0xFF, (addr >> 8) & 0xFF);
            data.push(0x09, (addr + 1) & 0xFF, ((addr + 1) >> 8) & 0xFF);
            data.push(0x09, (addr + 2) & 0xFF, ((addr + 2) >> 8) & 0xFF);
            data.push(0x09, (addr + 3) & 0xFF, ((addr + 3) >> 8) & 0xFF);
            data.push(0x09, (addr + 4) & 0xFF, ((addr + 4) >> 8) & 0xFF);
            data.push(0x09, (addr + 5) & 0xFF, ((addr + 5) >> 8) & 0xFF);
            data.push(0x09, (addr + 6) & 0xFF, ((addr + 6) >> 8) & 0xFF);
            data.push(0x09, (addr + 7) & 0xFF, ((addr + 7) >> 8) & 0xFF);
        }
    }
    
    // Loop
    const loopAddr = data.length;
    data.push(0x00);
    data.push(0x40, loopAddr & 0xFF, (loopAddr >> 8) & 0xFF);
    
    return new Uint8Array(data);
}

export { buildPlasmaDemo, buildBoxDemo, buildStripeDemo };
