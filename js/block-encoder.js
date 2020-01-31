class Block {
    constructor (target, block) {
        this._target = target;
        this._block = block;
    }
}

class BlockEncoder {

    constructor (runtime, symbols, fsyms) {
        this._runtime = runtime;
        this.BLOCK_SYMS = symbols;
        this.FIELD_SYMS = fsyms;
        this._supportedHats = [];
    }

    getStacks () {
        let hats = this.getHats();
        let stacks = [];
        hats.forEach(h => {
            const hat = this.encodeBlock(h);
            if (h._block.next) {
                const start = new Block(h._target, h._target.blocks.getBlock(h._block.next));
                let stack = this.parseStack(start);
                stack = hat.concat(stack);
                stacks.push(stack);
            }
        });
        return stacks;
    }

    compileStacks (stacks, vectors, procs) {
        for (let i=0; i<stacks.length; i++) {
            let hat = stacks[i].shift();
            let res = this.encodeStack(stacks[i]);
            res.unshift(0);
            res.push(9);
            let vect = [hat[2], 0x40+procs.length, 0, 0];
            vectors.splice(i*4, 4, ...vect);
            for (let i=0; i<res.length; i++)
                procs.push(res[i]);
        }
     }

    encodeStack (stack) {
        let res = [];
        let lists = [];
        for (let i in stack) {
            this.encodeItem(stack[i], res, lists);
        }
        return res;
    }

    encodeItem (item, res, lists) {
        let val = item[1];
        switch(item[0]) {
        case 'byte':
                res.push(1);
                res.push(val & 0xFF);
                break;
        case 'number':
                res.push(2);
                res.push(val & 0xFF);
                res.push((val >> 8) & 0xFF);
                res.push((val >> 16) & 0xFF);
                res.push((val >> 24) & 0xFF);
                break;
        case 'prim':
                res.push(this.BLOCK_SYMS[item[1]].byte);
                break;
        case 'list':
                res.push(3);
                lists.push(res.length);
                res.push(0);
                res.push(0);
                break;
        case 'eol':
                res.push(4);
                let offset = lists.pop();
                let len = res.length - offset - 2;
                res[offset] = len & 0xFF;
                res[offset+1] = (len>>8) & 0xFF;
                break;
        default:
                console.log('Error symbol not found ' + item[0]);
        }
    }

    getHats () {
        let hats = []
        this._runtime.executableTargets.forEach(target => {
            // Filter for only top level blocks
            target.blocks.getScripts().forEach(b => {
                let block = target.blocks.getBlock(b);
                // If top level block is a hat block
                if (this._runtime._hats[block.opcode]) {
                    hats.push(new Block(target, block));
                    // Create a new "stack" of blocks
                    // blockScript.push(this.stackToArray(target, block));
                }
            })
        });
        return hats;
    }

    parseStack (start) {
        let stack = this.encodeBlock(start);
        let nextBlock = start._target.blocks.getBlock(start._block.next);
        while (nextBlock) {
            let array = this.encodeBlock(new Block(start._target, nextBlock));
            if (array != null) stack = stack.concat(array);
            nextBlock = start._target.blocks.getBlock(nextBlock.next);
        }
        return stack;
    }

    encodeBlock (block) {
        if (!this.BLOCK_SYMS[block._block.opcode]) {
            console.log("Error: Unknown symbol " + block._block.opcode);
            return;
        }
        let hat = [this.BLOCK_SYMS[block._block.opcode].type, block._block.opcode];
        if (block._block.opcode === 'event_whenflagclicked') hat.push(8);
        else if (block._block.opcode === 'circuitplayground_whenButtonPressed') {
            console.log(block._block.inputs.BTN);
            const val = block._target.blocks.getBlock(block._block.inputs.BTN.block).fields.buttons.value;
            if (val === 'left') hat.push(0x80);
            else hat.push(0x81);
        }
        let out = []
        out.unshift(hat);
        let inputs = [];
        for (const n in block._block.fields) {
            const field = block._block.fields[n];
            console.log(field);
            if (field.name === "VARIABLE") {
                let name = block._block.fields[n].value;
                let id = this._variables.indexOf(name);
                if (id < 0) id = this._variables.push(name);
                inputs.push(['byte', id]);
            } else if (field.name === 'STATE') {
                if (field.value === 'on') inputs.push(['byte', 1]);
                else inputs.push(['byte', 0]);
            }
            // if (block.opcode === 'control_stop') {
              // // inputs.push(block.fields[n].value);
            // } else {
                // console.log("Uknown field: " + block.fields[n]);
            // }
        }
        console.log(block._block.inputs);
        for (const n in block._block.inputs) {
            let input = block._target.blocks.getBlock(block._block.inputs[n].block);
            if (n === 'SUBSTACK') {
                const stack = this.parseStack(new Block(block._target, block._target.blocks.getBlock(block._block.inputs[n].block)));
                console.log(stack);
                // let loop = this.stackToArray(block._target, input);
                stack.unshift(['list', 1]);
                stack.push(['eol', 0]);
                inputs = inputs.concat(stack);
            } else if (this._runtime._primitives[input.opcode]) {
                let array = this.blockToArray(target, input);
                if (array != null) inputs = inputs.concat(array);
                else inputs.push(['byte', 0]);
            } else {
                for (const v in input.fields) {
                    let field = input.fields[v];
                    console.log(field);
                    if (field.name === 'NUM' ||
                        (field.name === 'TEXT' && !isNaN(field.value))) {
                        let val = parseFloat(field.value);
                        if (isNaN(val)) {
                            inputs.push(['byte', 0]);
                        // } else if (val < 256 && val >= 0 && val == Math.round(val)) {
                        } else if (val > -128 && val < 256 && val == Math.round(val)) {
                            inputs.push(['byte', val]);
                        } else {
                            inputs.push(['number', val*100]);
                        }
                    } else if (field.name === 'TEXT') {
                        console.log("TODO: Implement String");
                    } else if (field.name === 'MATRIX') {
                        let symbol = this._convertSymbol(field.value);
                        for (let i=0; i<4; i++) {
                            inputs.push(['byte', (symbol >> (24 - (i*8))) & 0xFF]);
                        }
                    } else if (field.name === 'NEOPIXEL_RING') {
                        let value = field.value.split(',');
                        for (let i=0; i<value.length; i+=2) {
                            value[i] = parseInt(value[i]);
                            value[i+1] = parseInt(value[i+1].substr(1), 16) * 100
                            if (value[i] && value[i+1] > 0) {
                                inputs.push(['number', value[i+1]]);
                            } else {
                                inputs.push(['byte', 0]);
                            }
                        }
                    } else if (field.name === 'buttons') {
                        if (this.BLOCK_SYMS[block._block.opcode].type === 'hat') {
                            if (field.value === 'A')
                                hat.push(0x80);
                            else if (field.value === 'B')
                                hat.push(0x81);
                        } else {
                            console.log(field);
                        }
                    } else if (this.FIELD_SYMS[field.name])   {
                        inputs.push([this.FIELD_SYMS[field.name].type, this.FIELD_SYMS[field.name].values[field.value]]);
                    } else {
                        console.log("Unknown field type: " + field.name);
                    }
                    break;
                }
            }
        }
        out = inputs.concat(out);
        return out;
    }
    // next () {
        // console.log(blockScript);
        // console.log(JSON.stringify(blockScript));
        // this.vectors = [];
        // for (let i=0; i<64; i++) this.vectors[i] = 0;
        // this.procs = [];
        // // if (blockScript[0][0][1] === 'event_whenflagclicked') {
        // for (let i=0; i<blockScript.length; i++) {
            // this.compileStack(blockScript[i], i);
        // }
        // let out = [252, 0, 0, 3, 0];
        // for (let i=0; i<(this.procs.length%8); i++) this.procs.push(255);
        // console.log(this.vectors);
        // console.log(this.procs);
        // out.push(this.vectors.length + this.procs.length);
        // out = out.concat(this.vectors);
        // out = out.concat(this.procs);
        // // out.push(0);
        // console.log(out);
    // }
}

// module.exports = BlockEncoder;
