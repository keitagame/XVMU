// XVM-8 Emulator v1.2 - Complete Implementation

class XVM8 {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.imageData = this.ctx.createImageData(128, 128);
        
        // Memory
        this.ram = new Uint8Array(0x8000);      // 0x0000-0x7FFF (32KB)
        this.vram = new Uint8Array(0x4000);     // 0x8000-0xBFFF (16KB)
        this.io = new Uint8Array(0x100);        // 0xC000-0xC0FF
        this.rom = new Uint8Array(0x2000);      // 0xE000-0xFFFF
        
        // Registers
        this.A = 0;
        this.B = 0;
        this.C = 0;
        this.D = 0;
        this.PC = 0;
        this.SP = 0x7FFF;
        this.F = 0;  // Flags: Z=bit0, C=bit1, N=bit2, V=bit3, IF=bit7
        
        // Palette (16 colors, RGB332)
        this.palette = new Uint8Array(16);
        this.initDefaultPalette();
        
        // Timing
        this.cycles = 0;
        this.running = false;
        this.frameCount = 0;
        this.lastFrameTime = 0;
        
        // Input
        this.inputState = 0;
        this.setupInput();
        
        // Cycle table
        this.cycleTable = this.buildCycleTable();
    }
    
    initDefaultPalette() {
        // Default 16-color palette (RGB332)
        const colors = [
            0x00, 0x03, 0x1C, 0x1F, 0xE0, 0xE3, 0xFC, 0xFF,
            0x49, 0x92, 0xB6, 0xDB, 0x24, 0x6D, 0xB0, 0xFF
        ];
        this.palette.set(colors);
    }
    
    buildCycleTable() {
        const table = new Uint8Array(256);
        table.fill(1); // Default 1 cycle
        
        // 0x00系
        table[0x00] = 1; // NOP
        for (let i = 0x01; i <= 0x04; i++) table[i] = 2; // LD r,imm8
        for (let i = 0x05; i <= 0x08; i++) table[i] = 4; // LD r,addr16
        for (let i = 0x09; i <= 0x0C; i++) table[i] = 4; // ST r,addr16
        
        // 0x10系 (MOV)
        for (let i = 0x10; i <= 0x15; i++) table[i] = 1;
        
        // 0x20系 (算術)
        table[0x20] = 1; table[0x21] = 1; table[0x22] = 1;
        table[0x23] = 2;
        table[0x24] = 1; table[0x25] = 1; table[0x26] = 1;
        table[0x27] = 2;
        for (let i = 0x28; i <= 0x2F; i++) table[i] = 1;
        
        // 0x30系 (論理)
        for (let i = 0x30; i <= 0x37; i++) table[i] = 1;
        table[0x38] = 1;
        table[0x39] = 2;
        
        // 0x40系 (ジャンプ)
        table[0x40] = 3;
        for (let i = 0x41; i <= 0x48; i++) table[i] = 3;
        
        // 0x50系 (サブルーチン)
        table[0x50] = 5; // CALL
        table[0x51] = 4; // RET
        table[0x52] = 4; // RETI
        
        // 0x60系 (スタック)
        for (let i = 0x60; i <= 0x6F; i++) table[i] = 3;
        
        // 0x70系 (I/O)
        table[0x70] = 4; table[0x71] = 4;
        
        // 0x80系 (16bit)
        table[0x80] = 3; table[0x81] = 3;
        table[0x82] = 2; table[0x83] = 2;
        
        // 0xF0系
        table[0xF0] = 1; table[0xF1] = 1;
        table[0xFE] = 7; table[0xFF] = 1;
        
        return table;
    }
    
    setupInput() {
        // キー入力 (ビットマップ)
        // bit0=Up, bit1=Down, bit2=Left, bit3=Right, bit4=A, bit5=B
        const keyMap = {
            'ArrowUp': 0, 'ArrowDown': 1, 'ArrowLeft': 2, 'ArrowRight': 3,
            'z': 4, 'x': 5
        };
        
        window.addEventListener('keydown', (e) => {
            if (keyMap[e.key] !== undefined) {
                this.inputState |= (1 << keyMap[e.key]);
                this.io[0x10] = this.inputState;
                e.preventDefault();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            if (keyMap[e.key] !== undefined) {
                this.inputState &= ~(1 << keyMap[e.key]);
                this.io[0x10] = this.inputState;
                e.preventDefault();
            }
        });
    }
    
    loadROM(data) {
        // Check magic "XVM8"
        if (String.fromCharCode(...data.slice(0, 4)) !== 'XVM8') {
            throw new Error('Invalid ROM format');
        }
        
        // Read entry point (Little Endian)
        const entry = data[4] | (data[5] << 8);
        
        // Load ROM data
        const romData = data.slice(8);
        this.rom.set(romData);
        
        // Reset CPU
        this.reset(entry);
        
        console.log(`ROM loaded: ${romData.length} bytes, Entry: 0x${entry.toString(16)}`);
    }
    
    reset(entry = 0xE000) {
        this.A = this.B = this.C = this.D = 0;
        this.PC = entry;
        this.SP = 0x7FFF;
        this.F = 0;
        this.cycles = 0;
        this.ram.fill(0);
        this.vram.fill(0);
        this.io.fill(0);
        this.io.set(this.palette, 0x20);
    }
    
    read8(addr) {
        addr &= 0xFFFF;
        if (addr < 0x8000) return this.ram[addr];
        if (addr < 0xC000) return this.vram[addr - 0x8000];
        if (addr < 0xC100) return this.io[addr - 0xC000];
        if (addr >= 0xE000) return this.rom[addr - 0xE000];
        return 0;
    }
    
    write8(addr, val) {
        addr &= 0xFFFF;
        val &= 0xFF;
        if (addr < 0x8000) this.ram[addr] = val;
        else if (addr < 0xC000) this.vram[addr - 0x8000] = val;
        else if (addr < 0xC100) {
            this.io[addr - 0xC000] = val;
            // Update palette if changed
            if (addr >= 0xC020 && addr <= 0xC02F) {
                this.palette[addr - 0xC020] = val;
            }
        }
    }
    
    read16(addr) {
        return this.read8(addr) | (this.read8(addr + 1) << 8);
    }
    
    write16(addr, val) {
        this.write8(addr, val & 0xFF);
        this.write8(addr + 1, (val >> 8) & 0xFF);
    }
    
    push8(val) {
        this.write8(this.SP, val & 0xFF);
        this.SP = (this.SP - 1) & 0xFFFF;
    }
    
    pop8() {
        this.SP = (this.SP + 1) & 0xFFFF;
        return this.read8(this.SP);
    }
    
    push16(val) {
        this.push8((val >> 8) & 0xFF);
        this.push8(val & 0xFF);
    }
    
    pop16() {
        const low = this.pop8();
        const high = this.pop8();
        return (high << 8) | low;
    }
    
    setFlag(flag, val) {
        if (val) this.F |= (1 << flag);
        else this.F &= ~(1 << flag);
    }
    
    getFlag(flag) {
        return (this.F >> flag) & 1;
    }
    
    updateZN(val) {
        this.setFlag(0, val === 0);  // Z
        this.setFlag(2, val & 0x80); // N
    }
    
    executeInstruction() {
        const opcode = this.read8(this.PC++);
        
        // 0x00系
        if (opcode === 0x00) {
            // NOP
        }
        else if (opcode >= 0x01 && opcode <= 0x04) {
            // LD r,imm8
            const imm = this.read8(this.PC++);
            const reg = opcode - 0x01;
            [this.A, this.B, this.C, this.D][reg] = imm;
            this.updateZN(imm);
        }
        else if (opcode >= 0x05 && opcode <= 0x08) {
            // LD r,addr16
            const addr = this.read16(this.PC);
            this.PC += 2;
            const val = this.read8(addr);
            const reg = opcode - 0x05;
            [this.A, this.B, this.C, this.D][reg] = val;
            this.updateZN(val);
        }
        else if (opcode >= 0x09 && opcode <= 0x0C) {
            // ST r,addr16
            const addr = this.read16(this.PC);
            this.PC += 2;
            const reg = opcode - 0x09;
            const val = [this.A, this.B, this.C, this.D][reg];
            this.write8(addr, val);
        }
        // 0x10系 - MOV
        else if (opcode >= 0x10 && opcode <= 0x15) {
            const regs = [this.A, this.B, this.C, this.D];
            const mapping = [
                [0, 1], [0, 2], [0, 3], [1, 0], [2, 0], [3, 0]
            ];
            const [dst, src] = mapping[opcode - 0x10];
            const val = regs[src];
            [this.A, this.B, this.C, this.D][dst] = val;
            this.updateZN(val);
        }
        // 0x20系 - 算術
        else if (opcode === 0x20) {
            // ADD A,B
            const result = this.A + this.B;
            this.setFlag(1, result > 0xFF); // Carry
            this.A = result & 0xFF;
            this.updateZN(this.A);
        }
        else if (opcode === 0x21) {
            // ADD A,C
            const result = this.A + this.C;
            this.setFlag(1, result > 0xFF);
            this.A = result & 0xFF;
            this.updateZN(this.A);
        }
        else if (opcode === 0x22) {
            // ADD A,D
            const result = this.A + this.D;
            this.setFlag(1, result > 0xFF);
            this.A = result & 0xFF;
            this.updateZN(this.A);
        }
        else if (opcode === 0x23) {
            // ADD A,imm8
            const imm = this.read8(this.PC++);
            const result = this.A + imm;
            this.setFlag(1, result > 0xFF);
            this.A = result & 0xFF;
            this.updateZN(this.A);
        }
        else if (opcode === 0x24) {
            // SUB A,B
            const result = this.A - this.B;
            this.setFlag(1, result < 0);
            this.A = result & 0xFF;
            this.updateZN(this.A);
        }
        else if (opcode === 0x25) {
            // SUB A,C
            const result = this.A - this.C;
            this.setFlag(1, result < 0);
            this.A = result & 0xFF;
            this.updateZN(this.A);
        }
        else if (opcode === 0x26) {
            // SUB A,D
            const result = this.A - this.D;
            this.setFlag(1, result < 0);
            this.A = result & 0xFF;
            this.updateZN(this.A);
        }
        else if (opcode === 0x27) {
            // SUB A,imm8
            const imm = this.read8(this.PC++);
            const result = this.A - imm;
            this.setFlag(1, result < 0);
            this.A = result & 0xFF;
            this.updateZN(this.A);
        }
        else if (opcode === 0x28) {
            // INC A
            this.A = (this.A + 1) & 0xFF;
            this.updateZN(this.A);
        }
        else if (opcode === 0x29) {
            // DEC A
            this.A = (this.A - 1) & 0xFF;
            this.updateZN(this.A);
        }
        else if (opcode === 0x2A) {
            // INC B
            this.B = (this.B + 1) & 0xFF;
            this.updateZN(this.B);
        }
        else if (opcode === 0x2B) {
            // DEC B
            this.B = (this.B - 1) & 0xFF;
            this.updateZN(this.B);
        }
        else if (opcode === 0x2C) {
            // INC C
            this.C = (this.C + 1) & 0xFF;
            this.updateZN(this.C);
        }
        else if (opcode === 0x2D) {
            // DEC C
            this.C = (this.C - 1) & 0xFF;
            this.updateZN(this.C);
        }
        else if (opcode === 0x2E) {
            // INC D
            this.D = (this.D + 1) & 0xFF;
            this.updateZN(this.D);
        }
        else if (opcode === 0x2F) {
            // DEC D
            this.D = (this.D - 1) & 0xFF;
            this.updateZN(this.D);
        }
        // 0x30系 - 論理
        else if (opcode === 0x30) {
            // AND A,B
            this.A = this.A & this.B;
            this.updateZN(this.A);
        }
        else if (opcode === 0x31) {
            // OR A,B
            this.A = this.A | this.B;
            this.updateZN(this.A);
        }
        else if (opcode === 0x32) {
            // XOR A,B
            this.A = this.A ^ this.B;
            this.updateZN(this.A);
        }
        else if (opcode === 0x33) {
            // NOT A
            this.A = (~this.A) & 0xFF;
            this.updateZN(this.A);
        }
        else if (opcode === 0x34) {
            // SHL A
            this.setFlag(1, this.A & 0x80);
            this.A = (this.A << 1) & 0xFF;
            this.updateZN(this.A);
        }
        else if (opcode === 0x35) {
            // SHR A
            this.setFlag(1, this.A & 0x01);
            this.A = this.A >> 1;
            this.updateZN(this.A);
        }
        else if (opcode === 0x36) {
            // ROL A
            const c = this.getFlag(1);
            this.setFlag(1, this.A & 0x80);
            this.A = ((this.A << 1) | c) & 0xFF;
            this.updateZN(this.A);
        }
        else if (opcode === 0x37) {
            // ROR A
            const c = this.getFlag(1);
            this.setFlag(1, this.A & 0x01);
            this.A = (this.A >> 1) | (c << 7);
            this.updateZN(this.A);
        }
        else if (opcode === 0x38) {
            // CMP A,B
            const result = this.A - this.B;
            this.updateZN(result & 0xFF);
            this.setFlag(1, result < 0);
        }
        else if (opcode === 0x39) {
            // CMP A,imm8
            const imm = this.read8(this.PC++);
            const result = this.A - imm;
            this.updateZN(result & 0xFF);
            this.setFlag(1, result < 0);
        }
        // 0x40系 - ジャンプ
        else if (opcode === 0x40) {
            // JMP addr16
            this.PC = this.read16(this.PC);
        }
        else if (opcode === 0x41) {
            // JZ addr16
            const addr = this.read16(this.PC);
            this.PC += 2;
            if (this.getFlag(0)) this.PC = addr;
        }
        else if (opcode === 0x42) {
            // JNZ addr16
            const addr = this.read16(this.PC);
            this.PC += 2;
            if (!this.getFlag(0)) this.PC = addr;
        }
        else if (opcode === 0x43) {
            // JC addr16
            const addr = this.read16(this.PC);
            this.PC += 2;
            if (this.getFlag(1)) this.PC = addr;
        }
        else if (opcode === 0x44) {
            // JNC addr16
            const addr = this.read16(this.PC);
            this.PC += 2;
            if (!this.getFlag(1)) this.PC = addr;
        }
        else if (opcode === 0x45) {
            // JN addr16
            const addr = this.read16(this.PC);
            this.PC += 2;
            if (this.getFlag(2)) this.PC = addr;
        }
        else if (opcode === 0x46) {
            // JNN addr16
            const addr = this.read16(this.PC);
            this.PC += 2;
            if (!this.getFlag(2)) this.PC = addr;
        }
        // 0x50系 - サブルーチン
        else if (opcode === 0x50) {
            // CALL addr16
            const addr = this.read16(this.PC);
            this.PC += 2;
            this.push16(this.PC);
            this.PC = addr;
        }
        else if (opcode === 0x51) {
            // RET
            this.PC = this.pop16();
        }
        else if (opcode === 0x52) {
            // RETI
            this.F = this.pop8();
            this.PC = this.pop16();
        }
        // 0x60系 - スタック
        else if (opcode === 0x60) {
            // PUSH A
            this.push8(this.A);
        }
        else if (opcode === 0x61) {
            // PUSH B
            this.push8(this.B);
        }
        else if (opcode === 0x62) {
            // PUSH C
            this.push8(this.C);
        }
        else if (opcode === 0x63) {
            // PUSH D
            this.push8(this.D);
        }
        else if (opcode === 0x64) {
            // POP A
            this.A = this.pop8();
        }
        else if (opcode === 0x65) {
            // POP B
            this.B = this.pop8();
        }
        else if (opcode === 0x66) {
            // POP C
            this.C = this.pop8();
        }
        else if (opcode === 0x67) {
            // POP D
            this.D = this.pop8();
        }
        // 0x70系 - I/O
        else if (opcode === 0x70) {
            // IN A,addr16
            const addr = this.read16(this.PC);
            this.PC += 2;
            this.A = this.read8(addr);
        }
        else if (opcode === 0x71) {
            // OUT addr16,A
            const addr = this.read16(this.PC);
            this.PC += 2;
            this.write8(addr, this.A);
        }
        // 0x80系 - 16bit操作
        else if (opcode === 0x80) {
            // LD BC,imm16
            const imm = this.read16(this.PC);
            this.PC += 2;
            this.B = (imm >> 8) & 0xFF;
            this.C = imm & 0xFF;
        }
        else if (opcode === 0x81) {
            // LD DE,imm16
            const imm = this.read16(this.PC);
            this.PC += 2;
            this.D = (imm >> 8) & 0xFF;
            this.C = imm & 0xFF;  // Note: Cレジスタに格納 (仕様による)
        }
        else if (opcode === 0x82) {
            // INC BC
            let bc = (this.B << 8) | this.C;
            bc = (bc + 1) & 0xFFFF;
            this.B = (bc >> 8) & 0xFF;
            this.C = bc & 0xFF;
        }
        else if (opcode === 0x83) {
            // DEC BC
            let bc = (this.B << 8) | this.C;
            bc = (bc - 1) & 0xFFFF;
            this.B = (bc >> 8) & 0xFF;
            this.C = bc & 0xFF;
        }
        // 0xF0系 - システム
        else if (opcode === 0xF0) {
            // EI (Enable Interrupt)
            this.setFlag(7, 1);
        }
        else if (opcode === 0xF1) {
            // DI (Disable Interrupt)
            this.setFlag(7, 0);
        }
        else if (opcode === 0xFE) {
            // HALT
            this.running = false;
        }
        else if (opcode === 0xFF) {
            // BREAK (デバッグ用)
            console.log(`BREAK at PC=0x${(this.PC-1).toString(16)} A=${this.A} B=${this.B} C=${this.C} D=${this.D}`);
        }
        
        return this.cycleTable[opcode];
    }
    
    checkInterrupt() {
        if (!this.getFlag(7)) return; // IF=0なら割り込み無効
        
        // タイマー割り込みチェック (仮実装)
        if (this.io[0x01] & 0x02) {
            this.io[0x01] &= ~0x02; // Clear IRQ flag
            this.push16(this.PC);
            this.push8(this.F);
            this.PC = 0xFF00;
            this.setFlag(7, 0);
        }
    }
    
    renderFrame() {
        // VRAM (128x128) をキャンバスに描画
        for (let y = 0; y < 128; y++) {
            for (let x = 0; x < 128; x++) {
                const colorIndex = this.vram[y * 128 + x] & 0x0F;
                const rgb332 = this.palette[colorIndex];
                
                // RGB332 -> RGB888
                const r = ((rgb332 >> 5) & 0x07) * 36;
                const g = ((rgb332 >> 2) & 0x07) * 36;
                const b = (rgb332 & 0x03) * 85;
                
                const offset = (y * 128 + x) * 4;
                this.imageData.data[offset] = r;
                this.imageData.data[offset + 1] = g;
                this.imageData.data[offset + 2] = b;
                this.imageData.data[offset + 3] = 255;
            }
        }
        
        this.ctx.putImageData(this.imageData, 0, 0);
        this.frameCount++;
    }
    
    run() {
        this.running = true;
        this.lastFrameTime = performance.now();
        this.mainLoop();
    }
    
    mainLoop() {
        if (!this.running) return;
        
        const cyclesPerFrame = 16667; // 1MHz / 60Hz
        let frameCycles = 0;
        
        while (frameCycles < cyclesPerFrame && this.running) {
            const cycles = this.executeInstruction();
            frameCycles += cycles;
            this.cycles += cycles;
            
            // 割り込みチェック
            if (frameCycles % 1000 === 0) {
                this.checkInterrupt();
            }
        }
        
        this.renderFrame();
        
        // FPS計算
        const now = performance.now();
        const fps = 1000 / (now - this.lastFrameTime);
        this.lastFrameTime = now;
        
        // デバッグ情報更新
        this.updateDebugInfo(fps);
        
        requestAnimationFrame(() => this.mainLoop());
    }
    
    updateDebugInfo(fps) {
        document.getElementById('fps').textContent = fps.toFixed(1);
        document.getElementById('pc').textContent = '0x' + this.PC.toString(16).padStart(4, '0').toUpperCase();
        document.getElementById('cyc').textContent = this.cycles;
        
        // レジスタ情報
        const regA = document.getElementById('reg-a');
        const regB = document.getElementById('reg-b');
        const regC = document.getElementById('reg-c');
        const regD = document.getElementById('reg-d');
        const regSP = document.getElementById('reg-sp');
        const regF = document.getElementById('reg-f');
        
        if (regA) regA.textContent = '0x' + this.A.toString(16).padStart(2, '0').toUpperCase();
        if (regB) regB.textContent = '0x' + this.B.toString(16).padStart(2, '0').toUpperCase();
        if (regC) regC.textContent = '0x' + this.C.toString(16).padStart(2, '0').toUpperCase();
        if (regD) regD.textContent = '0x' + this.D.toString(16).padStart(2, '0').toUpperCase();
        if (regSP) regSP.textContent = '0x' + this.SP.toString(16).padStart(4, '0').toUpperCase();
        if (regF) regF.textContent = '0x' + this.F.toString(16).padStart(2, '0').toUpperCase();
    }
    
    stop() {
        this.running = false;
    }
}

export default XVM8;
