function onLoad() {

  // Blockly.VerticalFlyout.prototype.DEFAULT_WIDTH = 280;

  var vm = new window.VirtualMachine();
  window.vm = vm;

  var blockEncoder = new BlockEncoder(vm.runtime, window.SYMBOLS, window.FIELD_SYMBOLS);
  window.blockEncoder = blockEncoder;

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

async function download() {
    var stacks = window.blockEncoder.getStacks();
    if (stacks.length === 0) return;
    for (let i=1; i<=stacks.length; i++) {
        console.log('Stack ' + i + ': ' + JSON.stringify(stacks[i-1]));
    }

    var vectors = [];
    for (var i=0; i<64; i++) vectors[i] = 0;
    var procs = [];
    window.blockEncoder.compileStacks(stacks, vectors, procs);
    for (let i=0; i<(procs.length%8); i++) procs.push(255);

    let out = [252, 0, 0, 5, 0];
    out.push(vectors.length + procs.length);
    out = out.concat(vectors, procs);
    console.log(out);

    console.log('Erasing flash');
    await eraseFlash(0);
    // .then(() => {
        console.log('Flash erased');
        for (let i=0,n=0; i<out.length; i+=20, n++) {
            await send(out.slice(i, i+20));
        }
    // });
}

function eraseFlash(addr) {
    return new Promise((resolve, reject) => {
        addr += 0x50000;
        let out = [251];
        for (let i=0; i<4; i++)
            out[i+1] = (addr >> (i*8)) & 0xFF;
        sendAndWait(out).then(() => resolve());
    });
}

function save() {
    var filename = document.getElementById('project-name-input').value;
    console.log(filename);
    var xml = Blockly.Xml.workspaceToDom(window.workspace);
    xml = Blockly.Xml.domToPrettyText(xml);
    console.log(typeof(xml));
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
            Blockly.Xml.domToWorkspace(xml, window.workspace);
            document.getElementById('project-name-input').value = projectName;
        }
        reader.readAsBinaryString(input.files[0]);
    }
}

window.onload = onLoad;
