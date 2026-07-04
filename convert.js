const fs = require('fs');
const Jimp = require('jimp');

(async () => {
  try {
    const image = await Jimp.read('assets/icon.png');
    // Save as real PNG
    await image.writeAsync('assets/icon_real.png');
    console.log('PNG conversion successful');
  } catch (err) {
    console.error('Error converting to PNG:', err);
  }
})();
