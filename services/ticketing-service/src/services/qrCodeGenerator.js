// Lazy import canvas to prevent startup crashes
let canvas = null;
let createCanvas = null;
let loadImage = null;

try {
  canvas = require("canvas");
  createCanvas = canvas.createCanvas;
  loadImage = canvas.loadImage;
} catch (error) {
  console.warn(
    "Canvas package not available, QR code generation will be limited:",
    error.message
  );
}

const QRCode = require("qrcode");
const logger = require("../utils/logger");

class QRCodeGenerator {
  /**
   * Generate a QR code with custom styling
   * @param {string} content - Content to encode in QR code
   * @param {Object} options - Generation options
   * @param {string} options.format - Output format (png, svg, pdf)
   * @param {number} options.size - QR code size in pixels
   * @param {Object} options.styling - Styling options
   * @returns {Promise<Buffer|string>} - Generated QR code
   */
  static async generateQRCode(content, options = {}) {
    try {
      const { format = "png", size = 300, styling = {} } = options;

      logger.debug("Generating QR code", {
        contentLength: content.length,
        format,
        size,
        styling: Object.keys(styling),
      });

      // Generate base QR code
      const qrCodeDataURL = await QRCode.toDataURL(content, {
        width: size,
        margin: styling.margin || 4,
        color: {
          dark: styling.foregroundColor || "#000000",
          light: styling.backgroundColor || "#FFFFFF",
        },
        errorCorrectionLevel: styling.errorCorrectionLevel || "M",
      });

      if (format === "svg") {
        return await QRCode.toString(content, {
          width: size,
          margin: styling.margin || 4,
          color: {
            dark: styling.foregroundColor || "#000000",
            light: styling.backgroundColor || "#FFFFFF",
          },
          errorCorrectionLevel: styling.errorCorrectionLevel || "M",
        });
      }

      if (format === "pdf") {
        // For PDF, we'll generate PNG first and convert later if needed
        const pngBuffer = await this.generatePNGWithStyling(
          qrCodeDataURL,
          size,
          styling
        );
        return pngBuffer;
      }

      // Generate PNG with custom styling
      return await this.generatePNGWithStyling(qrCodeDataURL, size, styling);
    } catch (error) {
      logger.error("Failed to generate QR code:", error);
      throw new Error(`QR code generation failed: ${error.message}`);
    }
  }

  /**
   * Generate PNG QR code with custom styling
   * @param {string} qrCodeDataURL - Base64 encoded QR code
   * @param {number} size - Output size
   * @param {Object} styling - Styling options
   * @returns {Promise<Buffer>} - PNG buffer
   */
  static async generatePNGWithStyling(qrCodeDataURL, size, styling = {}) {
    try {
      // Check if canvas is available
      if (!createCanvas || !loadImage) {
        logger.warn("Canvas not available, falling back to basic QR code");
        // Fallback: return the basic QR code without styling
        const qrBuffer = Buffer.from(qrCodeDataURL.split(",")[1], "base64");
        return qrBuffer;
      }

      // Create canvas
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext("2d");

      // Load QR code image
      const qrImage = await loadImage(qrCodeDataURL);

      // Draw QR code
      ctx.drawImage(qrImage, 0, 0, size, size);

      // Apply frame if enabled
      if (styling.frame && styling.frame.enabled) {
        this.drawFrame(ctx, size, styling.frame);
      }

      // Apply logo if specified
      if (styling.logo && styling.logo.url) {
        await this.drawLogo(ctx, size, styling.logo);
      }

      // Convert to buffer
      return canvas.toBuffer("image/png");
    } catch (error) {
      logger.error("Failed to generate styled PNG:", error);
      // Fallback: return basic QR code
      try {
        const qrBuffer = Buffer.from(qrCodeDataURL.split(",")[1], "base64");
        return qrBuffer;
      } catch (fallbackError) {
        throw new Error(
          `PNG generation failed and fallback failed: ${error.message}`
        );
      }
    }
  }

  /**
   * Draw frame around QR code
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} size - Canvas size
   * @param {Object} frame - Frame options
   */
  static drawFrame(ctx, size, frame) {
    const frameWidth = frame.width || 10;
    const frameColor = frame.color || "#000000";
    const frameStyle = frame.style || "solid";

    ctx.strokeStyle = frameColor;
    ctx.lineWidth = frameWidth;

    if (frameStyle === "dashed") {
      ctx.setLineDash([frameWidth * 2, frameWidth]);
    } else if (frameStyle === "dotted") {
      ctx.setLineDash([frameWidth, frameWidth]);
    } else {
      ctx.setLineDash([]);
    }

    ctx.strokeRect(
      frameWidth / 2,
      frameWidth / 2,
      size - frameWidth,
      size - frameWidth
    );
  }

  /**
   * Draw logo on QR code
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} size - Canvas size
   * @param {Object} logo - Logo options
   */
  static async drawLogo(ctx, size, logo) {
    try {
      // Check if canvas is available
      if (!loadImage) {
        logger.warn("Canvas not available, skipping logo drawing");
        return;
      }

      const logoWidth = logo.width || Math.floor(size * 0.2);
      const logoHeight = logo.height || Math.floor(size * 0.2);
      const opacity = logo.opacity || 1;

      // Calculate logo position (center)
      const logoX = (size - logoWidth) / 2;
      const logoY = (size - logoHeight) / 2;

      // Load logo image
      const logoImage = await loadImage(logo.url);

      // Save context
      ctx.save();

      // Set opacity
      ctx.globalAlpha = opacity;

      // Draw logo
      ctx.drawImage(logoImage, logoX, logoY, logoWidth, logoHeight);

      // Restore context
      ctx.restore();
    } catch (error) {
      logger.error("Failed to draw logo:", error);
      // Continue without logo
    }
  }

  /**
   * Generate QR code with specific error correction level
   * @param {string} content - Content to encode
   * @param {string} errorCorrectionLevel - Error correction level (L, M, Q, H)
   * @param {Object} options - Other options
   * @returns {Promise<Buffer>} - Generated QR code
   */
  static async generateQRCodeWithErrorCorrection(
    content,
    errorCorrectionLevel,
    options = {}
  ) {
    const qrOptions = {
      ...options,
      errorCorrectionLevel: errorCorrectionLevel.toUpperCase(),
    };

    return await this.generateQRCode(content, qrOptions);
  }

  /**
   * Generate QR code with logo
   * @param {string} content - Content to encode
   * @param {string} logoUrl - Logo URL
   * @param {Object} options - Other options
   * @returns {Promise<Buffer>} - Generated QR code
   */
  static async generateQRCodeWithLogo(content, logoUrl, options = {}) {
    const styling = {
      ...options.styling,
      logo: {
        url: logoUrl,
        width: options.logoWidth || Math.floor((options.size || 300) * 0.2),
        height: options.logoHeight || Math.floor((options.size || 300) * 0.2),
        opacity: options.logoOpacity || 0.8,
      },
    };

    return await this.generateQRCode(content, { ...options, styling });
  }

  /**
   * Generate QR code with custom colors
   * @param {string} content - Content to encode
   * @param {string} foregroundColor - Foreground color
   * @param {string} backgroundColor - Background color
   * @param {Object} options - Other options
   * @returns {Promise<Buffer>} - Generated QR code
   */
  static async generateQRCodeWithColors(
    content,
    foregroundColor,
    backgroundColor,
    options = {}
  ) {
    const styling = {
      ...options.styling,
      foregroundColor,
      backgroundColor,
    };

    return await this.generateQRCode(content, { ...options, styling });
  }

  /**
   * Generate QR code with frame
   * @param {string} content - Content to encode
   * @param {Object} frameOptions - Frame options
   * @param {Object} options - Other options
   * @returns {Promise<Buffer>} - Generated QR code
   */
  static async generateQRCodeWithFrame(content, frameOptions, options = {}) {
    const styling = {
      ...options.styling,
      frame: {
        enabled: true,
        color: "#000000",
        width: 10,
        style: "solid",
        ...frameOptions,
      },
    };

    return await this.generateQRCode(content, { ...options, styling });
  }

  /**
   * Validate QR code content
   * @param {string} content - Content to validate
   * @returns {boolean} - Is valid
   */
  static validateContent(content) {
    if (!content || typeof content !== "string") {
      return false;
    }

    if (content.length > 2953) {
      return false; // QR code capacity limit
    }

    return true;
  }

  /**
   * Get QR code information without generating
   * @param {string} content - Content to analyze
   * @returns {Object} - QR code information
   */
  static getQRCodeInfo(content) {
    if (!this.validateContent(content)) {
      throw new Error("Invalid content");
    }

    const estimatedSize = Math.ceil(content.length / 100) * 100 + 200;
    const recommendedSize = Math.max(300, Math.min(1000, estimatedSize));

    return {
      contentLength: content.length,
      estimatedSize,
      recommendedSize,
      maxCapacity: 2953,
      supportedFormats: ["png", "svg", "pdf"],
      supportedErrorCorrectionLevels: ["L", "M", "Q", "H"],
    };
  }

  /**
   * Generate multiple QR codes with different sizes
   * @param {string} content - Content to encode
   * @param {Array<number>} sizes - Array of sizes
   * @param {Object} options - Other options
   * @returns {Promise<Array<Object>>} - Array of QR codes with sizes
   */
  static async generateMultipleSizes(content, sizes, options = {}) {
    const results = [];

    for (const size of sizes) {
      try {
        const qrCode = await this.generateQRCode(content, { ...options, size });
        results.push({
          size,
          data: qrCode,
          format: options.format || "png",
        });
      } catch (error) {
        logger.error(`Failed to generate QR code for size ${size}:`, error);
        results.push({
          size,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Generate QR code with watermark
   * @param {string} content - Content to encode
   * @param {string} watermarkText - Watermark text
   * @param {Object} options - Other options
   * @returns {Promise<Buffer>} - Generated QR code
   */
  static async generateQRCodeWithWatermark(
    content,
    watermarkText,
    options = {}
  ) {
    try {
      const size = options.size || 300;
      const qrCodeBuffer = await this.generateQRCode(content, options);

      // Create canvas for watermark
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext("2d");

      // Load QR code
      const qrImage = await loadImage(qrCodeBuffer);
      ctx.drawImage(qrImage, 0, 0, size, size);

      // Add watermark
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.font = `${Math.floor(size * 0.05)}px Arial`;
      ctx.fillStyle = "#000000";
      ctx.textAlign = "center";
      ctx.fillText(watermarkText, size / 2, size - 20);
      ctx.restore();

      return canvas.toBuffer("image/png");
    } catch (error) {
      logger.error("Failed to generate QR code with watermark:", error);
      throw new Error(`Watermark generation failed: ${error.message}`);
    }
  }
}

module.exports = QRCodeGenerator;
