import QRCode from 'qrcode';

export class QRCodeService {
  /**
   * Generates a QR code as a data URL (base64 encoded image).
   * @param content The data to encode in the QR code (e.g., URL, text, booking ID).
   * @param options Options for QR code generation (e.g., errorCorrectionLevel, width).
   * @returns A Promise that resolves to the data URL string of the QR code image.
   */
  static async generateQRCodeAsDataURL(
    content: string,
    options?: QRCode.QRCodeToDataURLOptions,
  ): Promise<string> {
    try {
      const dataUrl = await QRCode.toDataURL(content, {
        errorCorrectionLevel: 'H', // High error correction
        width: 256, // Default width
        ...options,
      });
      return dataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code.');
    }
  }

  /**
   * Generates a QR code as a SVG string.
   * @param content The data to encode in the QR code.
   * @param options Options for QR code generation.
   * @returns A Promise that resolves to the SVG string of the QR code.
   */
  static async generateQRCodeAsSVG(
    content: string,
    options?: QRCode.QRCodeToStringOptions, // Correct type for options
  ): Promise<string> {
    try {
      // For SVG, toDataURL is also an option, but toBuffer can be used with a type option.
      // However, the `qrcode` library directly supports `toFile` or `toString` for SVG.
      // Let's use `toString` with type 'svg'.
      const svgString = await QRCode.toString(content, {
        type: 'svg',
        errorCorrectionLevel: 'H',
        width: 256,
        ...options,
      }); // Removed 'as string' assertion, should be correctly inferred now
      return svgString;
    } catch (error) {
      console.error('Error generating QR code as SVG:', error);
      throw new Error('Failed to generate QR code as SVG.');
    }
  }
}
