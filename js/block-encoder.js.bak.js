const FIELD_SYMBOLS = {
    ledState: {
        type: 'byte',
        values: { on: 1, off: 0 }
    }
};

const SYMBOLS = {
    event_whenflagclicked: {
        type: 'hat'
    },
    control_stop: {
        type: 'prim',
        byte: 11
    },
    control_repeat: {
        type: 'prim',
        byte: 13
    },
    control_forever: {
        type: 'prim',
        byte: 14
    },
    control_repeat_until: {
        type: 'prim',
        byte: 18
    },
    control_wait: {
        type: 'prim',
        byte: 38
    },
    data_setvariableto: {
        type: 'prim',
        byte: 33
    },
    data_variable: {
        type: 'prim',
        byte: 34
    },
    data_changevariableby: {
        type: 'prim',
        byte: 35
    },
    operator_add: {
        type: 'prim',
        byte: 20
    },
    operator_subtract: {
        type: 'prim',
        byte: 21
    },
    operator_multiply: {
        type: 'prim',
        byte: 22
    },
    operator_divide: {
        type: 'prim',
        byte: 23
    },
    operator_mod: {
        type: 'prim',
        byte: 24
    },
    operator_gt: {
        type: 'prim',
        byte: 27
    },
    operator_lt: {
        type: 'prim',
        byte: 28
    },
    operator_random: {
        type: 'prim',
        byte: 37
    },
    operator_equals: {
        type: 'prim',
        byte: 25
    },
    microvm_whenButtonPressed: {
        type: 'hat'
    },
    microvm_isButtonPressed: {
        type: 'prim',
        byte: 67
    },
    microvm_setLED: {
        type: 'prim',
        byte: 71
    },
    microvm_displaySymbol: {
        type: 'prim',
        byte: 72
    }
};

class Block {
    constructor (target, block) {
        this._target = target;
        this._block = block;
    }
}

class BlockEncoder {

    constructor (runtime) {
        this._runtime = runtime;
        this.BLOCK_SYMS = SYMBOLS;
        this.FIELD_SYMS = FIELD_SYMBOLS;
        this._supportedHats = [];
    }

    getStacks () {
        let hats = this.getHats();
        let stacks = [];
        hats.forEach(hat => {
            stacks.push(this.parseStack(hat));
        });
        return stacks;
    }

    compileStacks (stacks, vectors, procs) {
        for (let i=0; i<stacks.length; i++) {
            let hat = stacks[i].shift();
            console.log(hat);
            let res = this.encodeStack(stacks[i]);
            res.unshift(0);
            res.push(9);
            let vect = [hat[2], 0x40+procs.length, 0, 0];
            console.log(vect);
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

    parseStack (hat) {
        let stack = this.encodeBlock(hat);
        let nextBlock = hat._target.blocks.getBlock(hat._block.next);
        while (nextBlock) {
            let array = this.encodeBlock(new Block(hat._target, nextBlock));
            if (array != null) stack = stack.concat(array);
            nextBlock = hat._target.blocks.getBlock(nextBlock.next);
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
        let out = []
        out.unshift(hat);
        let inputs = [];
        for (var n in block._block.fields) {
            console.log(block._block.fields[n]);
            if (block._block.fields[n].name === "VARIABLE") {
                let name = block._block.fields[n].value;
                let id = this._variables.indexOf(name);
                if (id < 0) id = this._variables.push(name);
                inputs.push(['byte', id]);
            }
            // if (block.opcode === 'control_stop') {
              // // inputs.push(block.fields[n].value);
            // } else {
                // console.log("Uknown field: " + block.fields[n]);
            // }
        }
        for (var n in block._block.inputs) {
            let input = block._target.blocks.getBlock(block._block.inputs[n].block);
            if (n === 'SUBSTACK') {
                let loop = this.stackToArray(target, input);
                loop.unshift(['list', 1]);
                loop.push(['eol', 0]);
                inputs = inputs.concat(loop);
            } else if (this._runtime._primitives[input.opcode]) {
                let array = this.encodeBlock(new Block(block._target, input));
                if (array != null) inputs = inputs.concat(array);
                else inputs.push(['byte', 0]);
            } else {
                for (var v in input.fields) {
                    let field = input.fields[v];
                    if (field.name === 'NUM' ||
                        (field.name === 'TEXT' && !isNaN(field.value))) {
                        let val = parseFloat(field.value);
                        if (isNaN(val)) {
                            inputs.push(['byte', 0]);
                        } else if (val < 256 && val >= 0 && val == Math.round(val)) {
                            inputs.push(['byte', val]);
                        } else {
                            inputs.push(['number', val*100]);
                        }
                    } else if (field.name === 'TEXT') {
                        console.log("TODO: Implement String");
                    } else if (field.name === 'MATRIX') {
                        let symbol = convertMatrix(field.value);
                        for (let i=0; i<4; i++) {
                            inputs.push(['byte', (symbol >> (24 - (i*8))) & 0xFF]);
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

function convertMatrix (matrix) {
    const symbol = matrix.replace(/\s/g, '');
    const reducer = (accumulator, c, index) => {
        const value = (c === '0') ? accumulator : accumulator + Math.pow(2, index);
        return value;
    };
    const hex = symbol.split('').reduce(reducer, 0);
    return hex;
}
