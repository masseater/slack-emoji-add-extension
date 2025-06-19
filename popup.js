let selectedFiles = [];
let slackTeams = [];

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('emoji-file');
    const uploadBtn = document.getElementById('upload-btn');
    const clearBtn = document.getElementById('clear-btn');
    const refreshBtn = document.getElementById('refresh-teams');
    const emojiNameInput = document.getElementById('emoji-name');
    const teamSelect = document.getElementById('team-select');

    fileInput.addEventListener('change', handleFileSelect);
    uploadBtn.addEventListener('click', handleUpload);
    clearBtn.addEventListener('click', handleClear);
    refreshBtn.addEventListener('click', loadSlackTeams);
    emojiNameInput.addEventListener('input', updateUploadButton);
    teamSelect.addEventListener('change', updateUploadButton);
    
    // 初期読み込み時にチーム一覧を取得
    loadSlackTeams();
    
    // ペンディング画像をチェック
    checkPendingImage();
});

// Slackチーム一覧を読み込む
async function loadSlackTeams() {
    const teamSelect = document.getElementById('team-select');
    const refreshBtn = document.getElementById('refresh-teams');
    
    showStatusMessage('チーム一覧を取得中...', 'info');
    refreshBtn.disabled = true;
    
    try {
        const response = await chrome.runtime.sendMessage({ action: 'getSlackTeams' });
        
        if (response.success && response.teams.length > 0) {
            slackTeams = response.teams;
            updateTeamSelect(response.teams);
            hideStatusMessage();
        } else if (response.teams && response.teams.length === 0) {
            showStatusMessage('Slackにログインしてください', 'error');
            updateTeamSelect([]);
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

// チーム選択ドロップダウンを更新
async function updateTeamSelect(teams) {
    const teamSelect = document.getElementById('team-select');
    teamSelect.innerHTML = '<option value="">チームを選択してください</option>';
    
    teams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.teamdomain;
        option.textContent = team.name;
        option.dataset.teamName = team.name;
        teamSelect.appendChild(option);
    });
    
    // 最後に使用したチームを復元
    const result = await chrome.storage.local.get(['lastUsedTeam']);
    if (result.lastUsedTeam && teams.some(t => t.teamdomain === result.lastUsedTeam.teamdomain)) {
        teamSelect.value = result.lastUsedTeam.teamdomain;
    }
    
    // チーム選択の変更を監視
    teamSelect.addEventListener('change', async () => {
        const selectedOption = teamSelect.options[teamSelect.selectedIndex];
        if (selectedOption.value) {
            await chrome.storage.local.set({
                lastUsedTeam: {
                    teamdomain: selectedOption.value,
                    name: selectedOption.dataset.teamName
                }
            });
        }
    });
    
    updateUploadButton();
}

function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    selectedFiles = files;
    displayPreviews();
    updateUploadButton();
}

function displayPreviews() {
    const previewContainer = document.getElementById('preview-container');
    previewContainer.innerHTML = '';

    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const previewItem = createPreviewItem(e.target.result, index);
            previewContainer.appendChild(previewItem);
        };
        reader.readAsDataURL(file);
    });
}

function createPreviewItem(src, index) {
    const div = document.createElement('div');
    div.className = 'preview-item';

    const img = document.createElement('img');
    img.src = src;
    div.appendChild(img);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'preview-remove';
    removeBtn.textContent = '×';
    removeBtn.onclick = () => removeFile(index);
    div.appendChild(removeBtn);

    return div;
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    displayPreviews();
    updateUploadButton();
}

function updateUploadButton() {
    const uploadBtn = document.getElementById('upload-btn');
    const emojiName = document.getElementById('emoji-name').value.trim();
    const selectedTeam = document.getElementById('team-select').value;
    
    uploadBtn.disabled = selectedFiles.length === 0 || !emojiName || !selectedTeam;
}

function handleClear() {
    selectedFiles = [];
    document.getElementById('emoji-file').value = '';
    document.getElementById('emoji-name').value = '';
    document.getElementById('preview-container').innerHTML = '';
    updateUploadButton();
    hideStatusMessage();
}

async function handleUpload() {
    const emojiName = document.getElementById('emoji-name').value.trim();
    const selectedTeam = document.getElementById('team-select').value;
    
    if (!selectedFiles.length || !emojiName || !selectedTeam) {
        showStatusMessage('画像、絵文字名、チームを選択してください', 'error');
        return;
    }

    showStatusMessage('アップロード中...', 'info');
    
    try {
        const results = [];
        
        for (const file of selectedFiles) {
            const base64 = await fileToBase64(file);
            const fileName = selectedFiles.length > 1 
                ? `${emojiName}_${selectedFiles.indexOf(file) + 1}` 
                : emojiName;
            
            const result = await chrome.runtime.sendMessage({
                action: 'uploadEmoji',
                data: {
                    teamdomain: selectedTeam,
                    name: fileName,
                    imageData: base64
                }
            });
            
            results.push(result);
        }

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
        
    } catch (error) {
        console.error('Upload error:', error);
        showStatusMessage('エラーが発生しました: ' + error.message, 'error');
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function showStatusMessage(message, type) {
    const statusMessage = document.getElementById('status-message');
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
}

function hideStatusMessage() {
    const statusMessage = document.getElementById('status-message');
    statusMessage.style.display = 'none';
}

// ペンディング画像をチェック
async function checkPendingImage() {
    try {
        const result = await chrome.storage.local.get(['pendingImage']);
        
        if (result.pendingImage) {
            // ペンディング画像がある場合
            const { url, data } = result.pendingImage;
            
            // 画像をプレビューに追加
            const blob = await dataURLtoBlob(data);
            const file = new File([blob], extractFileName(url), { type: blob.type });
            selectedFiles = [file];
            displayPreviews();
            
            // 画像名を設定
            const emojiNameInput = document.getElementById('emoji-name');
            emojiNameInput.value = extractImageNameFromURL(url);
            
            updateUploadButton();
            
            // メッセージを表示
            showStatusMessage('右クリックした画像を読み込みました', 'info');
            
            // ペンディング画像をクリア
            await chrome.storage.local.remove(['pendingImage']);
        }
    } catch (error) {
        console.error('Failed to check pending image:', error);
    }
}

// Data URLをBlobに変換
async function dataURLtoBlob(dataURL) {
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

// URLからファイル名を抽出
function extractFileName(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const filename = pathname.split('/').pop();
        return filename || 'image.png';
    } catch {
        return 'image.png';
    }
}

// URLから絵文字名を抽出
function extractImageNameFromURL(url) {
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