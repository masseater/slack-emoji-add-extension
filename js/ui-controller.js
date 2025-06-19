// UI制御関数

/**
 * ステータスメッセージを表示
 * @param {string} message - メッセージ
 * @param {string} type - メッセージタイプ (success, error, info)
 */
export function showStatusMessage(message, type) {
    const statusMessage = document.getElementById('status-message');
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    statusMessage.style.display = 'block';
}

/**
 * ステータスメッセージを非表示
 */
export function hideStatusMessage() {
    const statusMessage = document.getElementById('status-message');
    statusMessage.style.display = 'none';
}

/**
 * アップロードボタンの状態を更新
 * @param {Array} selectedFiles - 選択されたファイル
 * @param {string} emojiName - 絵文字名
 * @param {string} selectedTeam - 選択されたチーム
 */
export function updateUploadButton(selectedFiles, emojiName, selectedTeam) {
    const uploadBtn = document.getElementById('upload-btn');
    uploadBtn.disabled = selectedFiles.length === 0 || !emojiName || !selectedTeam;
}

/**
 * プレビューアイテムを作成
 * @param {string} src - 画像ソース
 * @param {number} index - インデックス
 * @param {Function} onRemove - 削除時のコールバック
 * @returns {HTMLElement} プレビュー要素
 */
export function createPreviewItem(src, index, onRemove) {
    const div = document.createElement('div');
    div.className = 'preview-item';

    const img = document.createElement('img');
    img.src = src;
    div.appendChild(img);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'preview-remove';
    removeBtn.textContent = '×';
    removeBtn.onclick = () => onRemove(index);
    div.appendChild(removeBtn);

    return div;
}

/**
 * チーム選択ドロップダウンを更新
 * @param {Array} teams - チーム一覧
 * @param {Object} lastUsedTeam - 最後に使用したチーム
 * @param {Function} onChange - 変更時のコールバック
 */
export function updateTeamSelect(teams, lastUsedTeam, onChange) {
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
    if (lastUsedTeam && teams.some(t => t.teamdomain === lastUsedTeam.teamdomain)) {
        teamSelect.value = lastUsedTeam.teamdomain;
    }
    
    // 変更イベントを設定
    teamSelect.removeEventListener('change', onChange);
    teamSelect.addEventListener('change', onChange);
}