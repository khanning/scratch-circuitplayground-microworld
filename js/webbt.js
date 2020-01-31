const MICROVM_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const WRITE_CHAR = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
const READ_CHAR = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

var readChar, writeChar;

var waitCallback = null;

var writeBuffer = [];

function scan() {
    navigator.bluetooth.requestDevice({ filters: [{ services: [MICROVM_UUID] }] })
    .then(device => {
        device.addEventListener('gattserverdisconnected', onDisconnected);
        return device.gatt.connect()
    })
    .then(server => {
        return server.getPrimaryService(MICROVM_UUID);
    })
    .then(service => {
        service.getCharacteristic(WRITE_CHAR).then(c => {
            writeChar = c;
        });
        service.getCharacteristic(READ_CHAR).then(c => c.startNotifications())
        .then(c => {
            c.addEventListener('characteristicvaluechanged', handleReadChar);
            readChar = c;
        });
    }).then(() => {
        document.getElementById('bluetooth-icon').classList.remove('disconnected');
        document.getElementById('bluetooth-icon').classList.add('connected');
    })
    .catch(error => console.log(error));
}

function onDisconnected(event) {
    console.log('Bluetooth disconnected');
    document.getElementById('bluetooth-icon').classList.remove('connected');
    document.getElementById('bluetooth-icon').classList.add('disconnected');
}

function handleReadChar(event) {
    if (waitCallback) {
        waitCallback();
        waitCallback = null;
    }
    var input = new Uint8Array(event.target.value.buffer);
    console.log(input);
}

function sendAndWait(data) {
    console.log(data.length);
    if (data.length > 20) {
        var output = new Uint8Array(data.splice(0, 20));
        writeBuffer = writeBuffer.concat(data.slice(20));
    } else {
        var output = new Uint8Array(data);
    }
    console.log('Sending: ', output);
    writeChar.writeValue(output);
    return new Promise((resolve, reject) => {
        waitCallback = resolve;
    });
}

function send(data) {
    return new Promise(res => {
        var output = new Uint8Array(data);
        console.log('Sending: ', output);
        writeChar.writeValue(output).then(() => {
            res();
        });
    });
}
