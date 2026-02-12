// XVM-8 ROM Builder and Sample Programs

class ROMBuilder {
    constructor() {
        this.data = [];
    }
    
    // ヘッダー作成
    header(entryPoint) {
        this.data = [
            0x58, 0x56, 0x4D, 0x38,  // "XVM8"
            entryPoint & 0xFF,        // Entry point (low)
            (entryPoint >> 8) & 0xFF, // Entry point (high)
            0x00, 0x00               // ROM size (placeholder)
        ];
        return this;
    }
    
    // 命令追加
    nop() { this.data.push(0x00); return this; }
    
    ld_a(val) { this.data.push(0x01, val); return this; }
    ld_b(val) { this.data.push(0x02, val); return this; }
    ld_c(val) { this.data.push(0x03, val); return this; }
    ld_d(val) { this.data.push(0x04, val); return this; }
    
    ld_a_addr(addr) { 
        this.data.push(0x05, addr & 0xFF, (addr >> 8) & 0xFF); 
        return this; 
    }
    
    st_a(addr) { 
        this.data.push(0x09, addr & 0xFF, (addr >> 8) & 0xFF); 
        return this; 
    }
    st_b(addr) { 
        this.data.push(0x0A, addr & 0xFF, (addr >> 8) & 0xFF); 
        return this; 
    }
    st_c(addr) { 
        this.data.push(0x0B, addr & 0xFF, (addr >> 8) & 0xFF); 
        return this; 
    }
    st_d(addr) { 
        this.data.push(0x0C, addr & 0xFF, (addr >> 8) & 0xFF); 
        return this; 
    }
    
    mov_ab() { this.data.push(0x10); return this; }
    mov_ac() { this.data.push(0x11); return this; }
    mov_ad() { this.data.push(0x12); return this; }
    mov_ba() { this.data.push(0x13); return this; }
    mov_ca() { this.data.push(0x14); return this; }
    mov_da() { this.data.push(0x15); return this; }
    
    add_ab() { this.data.push(0x20); return this; }
    add_ac() { this.data.push(0x21); return this; }
    add_a(val) { this.data.push(0x23, val); return this; }
    
    sub_ab() { this.data.push(0x24); return this; }
    sub_a(val) { this.data.push(0x27, val); return this; }
    
    inc_a() { this.data.push(0x28); return this; }
    dec_a() { this.data.push(0x29); return this; }
    inc_b() { this.data.push(0x2A); return this; }
    dec_b() { this.data.push(0x2B); return this; }
    inc_c() { this.data.push(0x2C); return this; }
    dec_c() { this.data.push(0x2D); return this; }
    inc_d() { this.data.push(0x2E); return this; }
    dec_d() { this.data.push(0x2F); return this; }
    
    and_ab() { this.data.push(0x30); return this; }
    or_ab() { this.data.push(0x31); return this; }
    xor_ab() { this.data.push(0x32); return this; }
    not_a() { this.data.push(0x33); return this; }
    
    shl_a() { this.data.push(0x34); return this; }
    shr_a() { this.data.push(0x35); return this; }
    
    cmp_ab() { this.data.push(0x38); return this; }
    cmp_a(val) { this.data.push(0x39, val); return this; }
    
    jmp(addr) { 
        this.data.push(0x40, addr & 0xFF, (addr >> 8) & 0xFF); 
        return this; 
    }
    jz(addr) { 
        this.data.push(0x41, addr & 0xFF, (addr >> 8) & 0xFF); 
        return this; 
    }
    jnz(addr) { 
        this.data.push(0x42, addr & 0xFF, (addr >> 8) & 0xFF); 
        return this; 
    }
    
    call(addr) { 
        this.data.push(0x50, addr & 0xFF, (addr >> 8) & 0xFF); 
        return this; 
    }
    ret() { this.data.push(0x51); return this; }
    
    push_a() { this.data.push(0x60); return this; }
    push_b() { this.data.push(0x61); return this; }
    pop_a() { this.data.push(0x64); return this; }
    pop_b() { this.data.push(0x65); return this; }
    
    in_a(addr) { 
        this.data.push(0x70, addr & 0xFF, (addr >> 8) & 0xFF); 
        return this; 
    }
    out(addr) { 
        this.data.push(0x71, addr & 0xFF, (addr >> 8) & 0xFF); 
        return this; 
    }
    
    ld_bc(val) { 
        this.data.push(0x80, val & 0xFF, (val >> 8) & 0xFF); 
        return this; 
    }
    
    inc_bc() { this.data.push(0x82); return this; }
    dec_bc() { this.data.push(0x83); return this; }
    
    ei() { this.data.push(0xF0); return this; }
    di() { this.data.push(0xF1); return this; }
    halt() { this.data.push(0xFE); return this; }
    brk() { this.data.push(0xFF); return this; }
    
    // ラベル管理
    label(name) {
        if (!this.labels) this.labels = {};
        this.labels[name] = this.data.length;
        return this;
    }
    
    build() {
        return new Uint8Array(this.data);
    }
}

// サンプルプログラム1: 画面塗りつぶしテスト
function buildFillTest() {
    const rom = new ROMBuilder();
    
    rom.header(0xE000);
    
    // パレット設定
    rom.ld_a(0xFF);  // 白
    rom.st_a(0xC020);
    rom.ld_a(0xE0);  // 赤
    rom.st_a(0xC021);
    rom.ld_a(0x1C);  // 緑
    rom.st_a(0xC022);
    rom.ld_a(0x03);  // 青
    rom.st_a(0xC023);
    
    // BCレジスタを使ってVRAMアドレスを管理
    rom.ld_bc(0x8000);  // VRAM開始
    
    rom.label('loop');
    
    // 色を計算 (x + y) & 0x03
    rom.ld_a(0x01);  // カラーインデックス
    rom.mov_ca();    // A -> C (一時保存)
    
    // VRAMに書き込み
    rom.ld_a(0x01);
    rom.st_a(0x8000);  // 簡易版: 固定アドレスに書き込み
    
    rom.inc_a();
    rom.cmp_a(0x10);
    rom.jnz(0xE010);  // ループ
    
    rom.halt();
    
    return rom.build();
}

// サンプルプログラム2: グラデーション
function buildGradient() {
    const rom = new ROMBuilder();
    
    rom.header(0xE000);
    
    // パレット設定 (16階調グレー)
    for (let i = 0; i < 16; i++) {
        const gray = Math.floor(i * 255 / 15);
        const rgb332 = ((gray >> 5) << 5) | ((gray >> 5) << 2) | (gray >> 6);
        rom.ld_a(rgb332);
        rom.st_a(0xC020 + i);
    }
    
    // Y座標ループ (D = Y)
    rom.ld_d(0);
    rom.label('y_loop');
    
    // X座標ループ (C = X)
    rom.ld_c(0);
    rom.label('x_loop');
    
    // カラー = (X + Y) / 16
    rom.ld_a(0);
    rom.mov_ca();  // A = X
    rom.mov_ba();
    rom.mov_da();  // A = Y
    rom.add_ab();  // A = X + Y
    rom.shr_a();
    rom.shr_a();
    rom.shr_a();
    rom.shr_a();   // A = (X+Y) / 16
    
    // VRAMアドレス = 0x8000 + Y * 128 + X
    // 簡易実装のため固定パターン
    rom.st_a(0x8000);
    
    rom.inc_c();
    rom.ld_a(128);
    rom.cmp_ab();
    rom.jnz(0xE020);  // x_loop
    
    rom.inc_d();
    rom.ld_a(128);
    rom.mov_ba();
    rom.mov_da();
    rom.cmp_ab();
    rom.jnz(0xE010);  // y_loop
    
    rom.halt();
    
    return rom.build();
}

// サンプルプログラム3: シンプルな画面クリア + ピクセル描画
function buildSimpleDemo() {
    const rom = new ROMBuilder();
    
    rom.header(0xE000);
    
    // === パレット設定 ===
    const palette = [
        0x00, // 0: 黒
        0xFF, // 1: 白
        0xE0, // 2: 赤
        0x1C, // 3: 緑
        0x03, // 4: 青
        0xE3, // 5: 黄
        0xFC, // 6: シアン
        0xFF, // 7: マゼンタ
        0x92, // 8: グレー
        0xB6, // 9: ライトグレー
        0xDB, // 10: ライトブルー
        0x24, // 11: ダークグリーン
        0x6D, // 12: ブラウン
        0xB0, // 13: ライトブラウン
        0x49, // 14: オレンジ
        0xFF  // 15: 白
    ];
    
    for (let i = 0; i < 16; i++) {
        rom.ld_a(palette[i]);
        rom.st_a(0xC020 + i);
    }
    
    // === 画面クリア ===
    rom.ld_bc(0x8000);  // BC = VRAMアドレス
    rom.ld_d(128);      // D = 行カウンター
    
    rom.label('clear_row');
    rom.ld_c(128);      // C = 列カウンター
    
    rom.label('clear_col');
    rom.ld_a(0x00);     // 黒で塗りつぶし
    // (実際にはBCレジスタを使った間接アドレッシングが必要)
    // 簡易版として固定位置に描画
    rom.dec_c();
    rom.ld_a(0);
    rom.cmp_ab();
    rom.jnz(0xE020);    // clear_col
    
    rom.dec_d();
    rom.ld_a(0);
    rom.mov_ba();
    rom.mov_da();
    rom.cmp_ab();
    rom.jnz(0xE010);    // clear_row
    
    // === 矩形描画 ===
    rom.ld_a(0x02);     // 赤色
    rom.st_a(0x8000 + 64 * 128 + 64);  // 中央にピクセル
    
    rom.label('main_loop');
    rom.nop();
    rom.jmp(0xE0F0);    // main_loop
    
    return rom.build();
}

// 最も単純なテストROM
function buildMinimalTest() {
    const rom = new ROMBuilder();
    
    rom.header(0xE000);
    
    // パレット: 0=黒, 1=白, 2=赤
    rom.ld_a(0x00); rom.st_a(0xC020);
    rom.ld_a(0xFF); rom.st_a(0xC021);
    rom.ld_a(0xE0); rom.st_a(0xC022);
    rom.ld_a(0x1C); rom.st_a(0xC023);
    rom.ld_a(0x03); rom.st_a(0xC024);
    
    // 画面中央に色付きピクセルを描画
    // 手動でVRAMに直接書き込み
    rom.ld_a(0x02);  // 赤
    
    // 中央付近のピクセル (64, 64)
    // アドレス = 0x8000 + 64 * 128 + 64 = 0x8000 + 8192 + 64 = 0xA040
    rom.st_a(0xA040);
    rom.st_a(0xA041);
    rom.st_a(0xA042);
    
    // 別の位置にも
    rom.ld_a(0x03);  // 緑
    rom.st_a(0x9000);
    rom.st_a(0x9001);
    
    rom.ld_a(0x04);  // 青
    rom.st_a(0xB000);
    
    // メインループ
    rom.label('loop');
    rom.nop();
    rom.jmp(0xE030);
    
    return rom.build();
}

export { ROMBuilder, buildFillTest, buildGradient, buildSimpleDemo, buildMinimalTest };
