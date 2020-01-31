web:
		cp ./scratch-blocks/blockly_compressed_vertical.js .
		cp ./scratch-blocks/blocks_compressed.js .
		cp ./scratch-blocks/blocks_compressed_vertical.js .
		cp ./scratch-blocks/msg/js/en.js .
		cp ./scratch-vm/dist/web/scratch-vm.min.js .
		cp -r ./scratch-blocks/media .

.PHONY: web
