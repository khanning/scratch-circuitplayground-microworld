function onLoad() {

  // Blockly.VerticalFlyout.prototype.DEFAULT_WIDTH = 280;

  var vm = new window.VirtualMachine();
  window.vm = vm;

  var blockEncoder = new BlockEncoder(vm.runtime, window.SYMBOLS, window.FIELD_SYMBOLS);
  window.blockEncoder = blockEncoder;

  window.connected = false;

  var defaultProject = {
    "targets": [
      {
        "isStage": true,
        "name": "Stage",
        "variables": {},
        "lists": {},
        "broadcasts": {},
        "blocks": {},
        "currentCostume": 0,
        "costumes": [
          {
            "assetId": "739b5e2a2435f6e1ec2993791b423146",
            "name": "backdrop1",
            "bitmapResolution": 1,
            "md5ext": "739b5e2a2435f6e1ec2993791b423146.png",
            "dataFormat": "png",
            "rotationCenterX": 240,
            "rotationCenterY": 180
          }
        ],
        "sounds": [],
        "volume": 100,
      }
    ],
    "meta": {
      "semver": "3.0.0",
      "vm": "0.1.0",
      "agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/65.0.3325.181 Safari/537.36"
    }
  };

  vm.loadProject(defaultProject).then(() => {
    var videoToolbox = document.getElementById('video-toolbox');
    window.videoToolbox = videoToolbox;

    var statusBarHandle = document.getElementById('status-bar-handle');
    var statusBarContent = document.getElementById('status-bar-content');
    statusBarHandle.onclick = (event) => {
        statusBarContent.classList.toggle('hidden');
    };

    registerConnectCallback(() => {
      window.connected = true;
      document.getElementById('bluetooth-icon').classList.remove('disconnected');
      document.getElementById('bluetooth-icon').classList.add('connected');
      document.getElementById('data-status').innerHTML = 'Connected';
      // window.pollTimer = setInterval(() => {
          // if (window.pollinhibit) return;
          // sendAndWaitForResp([0xf5], 0xf5).then(resp => {
              // updateSensorData(resp);
          // });
      // }, 1000);
    });

    registerDisconnectCallback(() => {
      window.connected = false;
      document.getElementById('bluetooth-icon').classList.remove('connected');
      document.getElementById('bluetooth-icon').classList.add('disconnected');
      document.getElementById('data-status').innerHTML = 'Disonnected';
      if (window.pollTimer) {
        clearInterval(window.pollTimer);
        window.pollTimer = null;
      }
    });

    var workspace = Blockly.inject('blocks', {
      collapse: false,
      media: './media/',
      scrollbars: true,
      sounds: false,
      zoom: {
        controls: true,
        wheel: true,
        startScale: 0.75,
        maxScale: 4,
        minScale: 0.25,
        scaleSpeed: 1.1
      },
      colours: {
        workspace: '#334771',
        flyout: '#283856',
        scrollbar: '#24324D',
        scrollbarHover: '#0C111A',
        insertionMarker: '#FFFFFF',
        insertionMarkerOpacity: 0.3,
        fieldShadow: 'rgba(255, 255, 255, 0.3)',
        dragShadowOpacity: 0.6
      }
    });
    window.workspace = workspace;
    window.workspace.getFlyout().autoClose = true;
    window.workspace.getFlyout().width_ = 0;
    window.blockCount = 0;

    window.gfbutton = document.getElementById('download-icon-img');
    window.uploadbutton = document.getElementById('upload-icon-img');

    // Blockly.statusButtonCallback = (id) => console.log(id);

    vm.addListener('EXTENSION_ADDED', (blocksInfo) => {
        console.log('extension added');
        // Generate the proper blocks and refresh the toolbox
        console.log(blocksInfo.map(blockInfo => blockInfo.json));
        Blockly.defineBlocksWithJsonArray(blocksInfo.map(blockInfo => blockInfo.json));
        window.workspace.updateToolbox(videoToolbox);

    });

    workspace.addChangeListener(vm.blockListener);
    var flyoutWorkspace = workspace.getFlyout().getWorkspace();
    flyoutWorkspace.addChangeListener(vm.flyoutBlockListener);

    vm.on('SCRIPT_GLOW_ON', function(data) {
      workspace.glowStack(data.id, true);
    });
    vm.on('SCRIPT_GLOW_OFF', function(data) {
      workspace.glowStack(data.id, false);
    });
    vm.on('BLOCK_GLOW_ON', function(data) {
      workspace.glowBlock(data.id, true);
    });
    vm.on('BLOCK_GLOW_OFF', function(data) {
      workspace.glowBlock(data.id, false);
    });
    vm.on('VISUAL_REPORT', function(data) {
      workspace.reportValue(data.id, data.value);
    });

    vm.on('workspaceUpdate', (data) => {
      workspace.removeChangeListener(vm.blockListener);
      const dom = Blockly.Xml.textToDom(data.xml);
      Blockly.Xml.clearWorkspaceAndLoadFromXml(dom, workspace);
      workspace.addChangeListener(vm.blockListener);
    });

    vm.on('targetsUpdate', (data) => {
      var editingTargetId = data.editingTarget;
      var target = vm.runtime.getTargetById(editingTargetId);
      var overlay = document.getElementById('blocks-overlay');
      overlay.classList.remove("show-overlay");
      overlay.classList.add("hide-overlay");
      workspace.updateToolbox(videoToolbox);
    });

    vm.extensionManager.loadExtensionURL('circuitplayground');
    vm.start();
  });
}

function updateSensorData(data) {
  window.sensorData = data;
  // console.log(data);
  document.getElementById('data-button-left').innerHTML = (data[1]) ? 'pressed' : 'not pressed';
  document.getElementById('data-button-right').innerHTML = (data[2]) ? 'pressed' : 'not pressed';
  document.getElementById('data-light').innerHTML = (data[6]);
  var motion = (data[4] << 8) | data[3];
  if (motion & 0x8000) motion -= 0xFFFF;
  document.getElementById('data-moving').innerHTML = (Math.abs(motion) > 2000) ? "true" : "false";
}

function getFlash(addr, len) {
    return new Promise((resolve, reject) => {
        let out = [0xfe];
        for (let i=0; i<4; i++)
            out[i+1] = (addr >> (i*8)) & 0xFF;
        out.push(len);
        sendAndWaitForResp(out, 0xed).then(reply => resolve(reply));
    });
}

function timeout(len) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, len);
    });
}

async function upload() {
    if (window.pollinhibit) return;
    window.pollinhibit = true;
    window.uploadbutton.src = 'img/wait.svg';
    let code = [];
    for (let i=0; i<5000; i+=20) {
        const resp = await getFlash(0x80000+i, 20);
        if (resp.every(t => t === 255)) break;
        var decoder = new TextDecoder('utf8');
        console.log(decoder.decode(resp));
        code = code.concat(Array.from(resp));
    }
    while (code.slice(-1)[0] === 255) code = code.slice(0, -1);
    let arr = new Uint16Array(code);
    const text = String.fromCharCode.apply(null, arr);
    console.log(text);
    window.pollinhibit = false;
    window.uploadbutton.src = 'img/upload.svg';
    var xml = Blockly.Xml.textToDom(text);
    Blockly.Xml.clearWorkspaceAndLoadFromXml(xml, window.workspace);
}

async function download() {
    if (window.pollinhibit) return;
    window.pollinhibit = true;
    window.gfbutton.src = 'img/wait.svg';
    var stacks = window.blockEncoder.getStacks();
    if (stacks.length === 0) {
        window.pollinhibit = false;
        window.gfbutton.src = 'img/icon--green-flag.svg';
        return;
    }
    for (let i=1; i<=stacks.length; i++) {
        console.log('Stack ' + i + ': ' + JSON.stringify(stacks[i-1]));
    }

    var vectors = [];
    for (var i=0; i<64; i++) vectors[i] = 0;
    var procs = [];
    window.blockEncoder.compileStacks(stacks, vectors, procs);
    for (let i=0; i<(procs.length%8); i++) procs.push(255);

    let out = vectors.concat(procs);
    console.log(out);

    if (window.connected) {
        console.log('Erasing flash');
        await eraseFlash(0);
        console.log('Flash erased');
        await writeFlash(0, out);
        console.log('Program written');

        const dom = Blockly.Xml.workspaceToDom(window.workspace);
        const xml = Blockly.Xml.domToText(dom);
        console.log(xml);
        // console.log(new Uint8Array(xml));
        // let buf = new ArrayBuffer(xml.length*2);
        // let bufView = new Uint16Array(buf);
        // let utf8 = unescape(encodeURIComponent(xml));
        // out = [];
        // for (let i=0; i<utf8.length; i++) {
            // out.push(utf8.charCodeAt(i));
        // }
        // out = new Uint8Array(bufView.buffer, bufView.byteOffset, bufView.byteLength);

        // let encoder = new TextEncoder();

        // out = encoder.encode(xml);
        // out = Array.from(out);
        // console.log(out.length, out.length%4);

        // console.log('Erasing flash');
        // await eraseFlash(0x30000);
        // console.log('Flash erased');
        // if (out.length < 200) {
            // await writeFlash(0x30000, out);
        // } else {
            // for (let i=0; i<out.length; i+= 200) {
                // await writeFlash(0x30000+i, out.slice(i, i+200));
            // }
        // }
        // console.log('Program written');
    }
    window.pollinhibit = false;
    window.gfbutton.src = 'img/icon--green-flag.svg';
}

function writeFlash(addr, data) {
    return new Promise((resolve, reject) => {
        addr += 0x50000;
        let out = [252];
        for (let i=0; i<4; i++) {
            out[i+1] = (addr >> (i*8)) & 0xFF;
            out[i+5] = (data.length >> (i*8)) & 0xFF;
        }
        out = out.concat(data);
        // console.log(out);
        sendAndWaitForResp(out, 0xcf).then(res => {
            resolve();
        });
    });
}

function eraseFlash(addr) {
    return new Promise((resolve, reject) => {
        addr += 0x50000;
        let out = [251];
        for (let i=0; i<4; i++)
            out[i+1] = (addr >> (i*8)) & 0xFF;
        sendAndWaitForResp(out, 0xbf).then(res => {
            resolve();
        });
    });
}

function save() {
    var filename = document.getElementById('project-name-input').value;
    console.log(filename);
    var xml = Blockly.Xml.workspaceToDom(window.workspace);
    xml = Blockly.Xml.domToPrettyText(xml);
    var xmlFile = new Blob([xml], { type: "application/xml;charset=utf-8" });
    console.log(xmlFile)
    var a = document.createElement('a');
    a.href = URL.createObjectURL(xmlFile);
    a.download = filename + '.xml';
    a.click();
}

function load() {
    document.getElementById('file-input').click();
}

function loadProject(input) {
    var projectName = input.files[0].name.split('.xml')[0];
    if (input.files) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var xml = Blockly.Xml.textToDom(e.target.result);
            Blockly.Xml.clearWorkspaceAndLoadFromXml(xml, window.workspace);
            document.getElementById('project-name-input').value = projectName;
        }
        reader.readAsBinaryString(input.files[0]);
    }
}

window.onload = onLoad;
