const { FIFI_APPEARANCE } = require('../../constants/fifi-appearance')

function buildAppearanceLayout(scene, viewport, windowWidth) {
  if (!scene || !viewport || !scene.width || !scene.height || !viewport.height) return null
  const config = FIFI_APPEARANCE.petDisplayConfig
  const unit = windowWidth / 750
  const width = Math.max(scene.width, scene.height * FIFI_APPEARANCE.backgroundRatio)
  // The image box has the source ratio, so aspectFill does not add a second crop.
  // Anchoring the cover box at top-left protects the sun across tall viewports.
  const height = width / FIFI_APPEARANCE.backgroundRatio
  const heroHeight = Math.max(config.minHeightRpx * unit, Math.min(config.maxHeightRpx * unit, viewport.height * config.heightFraction))
  return { backgroundStyle: `width:${width}px;height:${height}px;left:0;top:0;`, petAreaStyle: `height:${heroHeight}px;` }
}

module.exports = { buildAppearanceLayout }
