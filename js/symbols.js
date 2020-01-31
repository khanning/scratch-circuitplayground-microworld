
window.FIELD_SYMBOLS = {
    ledState: {
        type: 'byte',
        values: { on: 1, off: 0 }
    }
};

window.SYMBOLS = {
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
    circuitplayground_whenButtonPressed: {
        type: 'hat'
    },
    circuitplayground_isButtonPressed: {
        type: 'prim',
        byte: 67
    },
    circuitplayground_setLED: {
        type: 'prim',
        byte: 71
    },
    circuitplayground_displaySymbol: {
        type: 'prim',
        byte: 72
    },
    circuitplayground_setLights: {
        type: 'prim',
        byte: 0x41
    },
    circuitplayground_setBrightness: {
        type: 'prim',
        byte: 0x42
    },
    circuitplayground_changeBrightness: {
        type: 'prim',
        byte: 0x43
    },
    circuitplayground_turnLights: {
        type: 'prim',
        byte: 0x44
    },
    circuitplayground_turnAnticlock: {
        type: 'prim',
        byte: 0x45
    }
};
