// ユーティリティ関数

/**
 * 画像をBase64として取得
 * @param {string} url - 画像URL
 * @returns {Promise<string>} Base64データ
 */
export async function fetchImageAsBase64(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Data URLをBlobに変換
 * @param {string} dataURL - Data URL
 * @returns {Blob} Blobオブジェクト
 */
export function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new Blob([u8arr], { type: mime });
}

/**
 * URLからファイル名を抽出
 * @param {string} url - URL
 * @returns {string} ファイル名
 */
export function extractFileName(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const filename = pathname.split('/').pop();
        return filename || 'image.png';
    } catch {
        return 'image.png';
    }
}

/**
 * URLから絵文字名を抽出
 * @param {string} url - URL
 * @returns {string} 絵文字名
 */
export function extractImageNameFromURL(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const filename = pathname.split('/').pop();
        const nameWithoutExt = filename.split('.')[0];
        
        // ファイル名をクリーンアップ（絵文字名として使える形式に）
        return nameWithoutExt
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '') || 'emoji';
    } catch {
        return 'emoji';
    }
}