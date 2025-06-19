// Popup script

import { 
    showStatusMessage, 
    hideStatusMessage, 
    updateUploadButton as updateButtonState,
    createPreviewItem,
    updateTeamSelect as updateTeamDropdown
} from './js/ui-controller.js';
import { 
    dataURLtoBlob, 
    extractFileName, 
    extractImageNameFromURL 
} from './js/utils.js';

// 状態管理
let selectedFiles = [];

// 初期化
document.addEventListener('DOMContentLoaded', init);

/**
 * 初期化処理
 */
function init() {
    // イベントリスナーの設定
    setupEventListeners();
    
    // 初期読み込み
    loadSlackTeams();
    checkPendingImage();
}

/**
 * イベントリスナーの設定
 */
function setupEventListeners() {
    document.getElementById('emoji-file').addEventListener('change', handleFileSelect);
    document.getElementById('upload-btn').addEventListener('click', handleUpload);
    document.getElementById('clear-btn').addEventListener('click', handleClear);
    document.getElementById('refresh-teams').addEventListener('click', loadSlackTeams);
    document.getElementById('emoji-name').addEventListener('input', updateUploadButton);
    document.getElementById('team-select').addEventListener('change', updateUploadButton);
}

/**
 * Slackチーム一覧を読み込む
 */
async function loadSlackTeams() {
    const refreshBtn = document.getElementById('refresh-teams');
    
    showStatusMessage('チーム一覧を取得中...', 'info');
    refreshBtn.disabled = true;
    
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getSlackTeams' });
        
        if (response.success && response.teams.length > 0) {
            await setupTeamSelect(response.teams);
            hideStatusMessage();
        } else if (response.teams && response.teams.length === 0) {
            showStatusMessage('Slackにログインしてください', 'error');
            await setupTeamSelect([]);
        } else {
            showStatusMessage('チーム一覧の取得に失敗しました', 'error');
        }
    } catch (error) {
        console.error('Failed to load teams:', error);
        showStatusMessage('エラーが発生しました', 'error');
    } finally {
        refreshBtn.disabled = false;
    }
}

/**
 * チーム選択の設定
 * @param {Array} teams - チーム一覧
 */
async function setupTeamSelect(teams) {
    const result = await chrome.storage.local.get(['lastUsedTeam']);
    
    updateTeamDropdown(teams, result.lastUsedTeam, async () => {
        const teamSelect = document.getElementById('team-select');
        const selectedOption = teamSelect.options[teamSelect.selectedIndex];
        
        if (selectedOption.value) {
            await chrome.storage.local.set({
                lastUsedTeam: {
                    teamdomain: selectedOption.value,
                    name: selectedOption.dataset.teamName
                }
            });
        }
        updateUploadButton();
    });
    
    updateUploadButton();
}

/**
 * ファイル選択処理
 * @param {Event} event - イベント
 */
function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    selectedFiles = files;
    displayPreviews();
    updateUploadButton();
}

/**
 * プレビューを表示
 */
function displayPreviews() {
    const previewContainer = document.getElementById('preview-container');
    previewContainer.innerHTML = '';

    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewItem = createPreviewItem(e.target.result, index, removeFile);
            previewContainer.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
}

/**
 * ファイルを削除
 * @param {number} index - インデックス
 */
function removeFile(index) {
    selectedFiles.splice(index, 1);
    displayPreviews();
    updateUploadButton();
}

/**
 * アップロードボタンの状態を更新
 */
function updateUploadButton() {
    const emojiName = document.getElementById('emoji-name').value.trim();
    const selectedTeam = document.getElementById('team-select').value;
    updateButtonState(selectedFiles, emojiName, selectedTeam);
}

/**
 * クリア処理
 */
function handleClear() {
    selectedFiles = [];
    document.getElementById('emoji-file').value = '';
    document.getElementById('emoji-name').value = '';
    document.getElementById('preview-container').innerHTML = '';
    updateUploadButton();
    hideStatusMessage();
}

/**
 * アップロード処理
 */
async function handleUpload() {
    const emojiName = document.getElementById('emoji-name').value.trim();
    const selectedTeam = document.getElementById('team-select').value;
    
    if (!selectedFiles.length || !emojiName || !selectedTeam) {
        showStatusMessage('画像、絵文字名、チームを選択してください', 'error');
        return;
    }

    showStatusMessage('アップロード中...', 'info');
    
    try {
        const results = await uploadFiles(selectedTeam, emojiName);
        handleUploadResults(results);
    } catch (error) {
        console.error('Upload error:', error);
        showStatusMessage('エラーが発生しました: ' + error.message, 'error');
    }
}

/**
 * ファイルをアップロード
 * @param {string} teamdomain - チームドメイン
 * @param {string} emojiName - 絵文字名
 * @returns {Promise<Array>} アップロード結果
 */
async function uploadFiles(teamdomain, emojiName) {
    const results = [];
    
    for (const file of selectedFiles) {
        const base64 = await fileToBase64(file);
        const fileName = selectedFiles.length > 1 
            ? `${emojiName}_${selectedFiles.indexOf(file) + 1}` 
            : emojiName;
        
        const result = await chrome.runtime.sendMessage({
            action: 'uploadEmoji',
            data: {
                teamdomain: teamdomain,
                name: fileName,
                imageData: base64
            }
        });
        
        results.push(result);
    }
    
    return results;
}

/**
 * アップロード結果を処理
 * @param {Array} results - アップロード結果
 */
function handleUploadResults(results) {
    const successCount = results.filter(r => r.success).length;
    
    if (successCount === results.length) {
        showStatusMessage('すべての絵文字をアップロードしました！', 'success');
        setTimeout(handleClear, 2000);
    } else if (successCount > 0) {
        showStatusMessage(`${successCount}/${results.length}個の絵文字をアップロードしました`, 'info');
    } else {
        const errorMessage = results[0]?.error || 'アップロードに失敗しました';
        showStatusMessage(errorMessage, 'error');
    }
}

/**
 * ファイルをBase64に変換
 * @param {File} file - ファイル
 * @returns {Promise<string>} Base64データ
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * ペンディング画像をチェック
 */
async function checkPendingImage() {
    try {
        const result = await chrome.storage.local.get(['pendingImage']);
        
        if (result.pendingImage) {
            await processPendingImage(result.pendingImage);
            await chrome.storage.local.remove(['pendingImage']);
        }
    } catch (error) {
        console.error('Failed to check pending image:', error);
    }
}

/**
 * ペンディング画像を処理
 * @param {Object} pendingImage - ペンディング画像データ
 */
async function processPendingImage(pendingImage) {
    const { url, data } = pendingImage;
    
    // 画像をプレビューに追加
    const blob = dataURLtoBlob(data);
    const file = new File([blob], extractFileName(url), { type: blob.type });
    selectedFiles = [file];
    displayPreviews();
    
    // 画像名を設定
    document.getElementById('emoji-name').value = extractImageNameFromURL(url);
    
    updateUploadButton();
    showStatusMessage('右クリックした画像を読み込みました', 'info');
}