// Slack API関連の処理

/**
 * Slackにログインしているチーム一覧を取得
 * @returns {Promise<Array>} チーム一覧
 */
export async function getSlackTeams() {
    const response = await fetch('https://slack.com/signin', {
        credentials: 'include'
    });
    
    const text = await response.text();
    
    // HTMLからチーム情報を抽出
    const match = text.match(/data-props='([^']+)'/);
    if (!match) {
        // 別の形式も試す
        const match2 = text.match(/data-props="([^"]+)"/);
        if (!match2) {
            throw new Error('チーム情報が見つかりません');
        }
        const propsText = match2[1].replace(/&quot;/g, '"');
        const props = JSON.parse(propsText);
        return extractTeams(props);
    }
    
    const propsText = match[1].replace(/&quot;/g, '"');
    const props = JSON.parse(propsText);
    return extractTeams(props);
}

/**
 * チーム情報を抽出
 * @param {Object} props - Slackのpropsオブジェクト
 * @returns {Array} チーム一覧
 */
function extractTeams(props) {
    if (!props || !props.loggedInTeams) {
        return [];
    }
    
    return props.loggedInTeams
        .filter(team => !team.is_enterprise && team.team_name && team.team_domain)
        .map(team => ({
            name: team.team_name,
            teamdomain: team.team_domain
        }));
}

/**
 * 特定のチームのトークンを取得
 * @param {string} teamdomain - チームドメイン
 * @returns {Promise<string>} APIトークン
 */
export async function getSlackTokenForTeam(teamdomain) {
    const url = `https://${teamdomain}.slack.com/customize/emoji`;
    const response = await fetch(url, {
        credentials: 'include'
    });
    
    const text = await response.text();
    
    // APIトークンを抽出
    const tokenRegex = /api_token["']?\s*:\s*["']([^"']+)["']/;
    const match = tokenRegex.exec(text);
    
    if (!match) {
        throw new Error('APIトークンが見つかりません');
    }
    
    return match[1];
}

/**
 * 絵文字をアップロード
 * @param {Object} data - アップロードデータ
 * @returns {Promise<Object>} アップロード結果
 */
export async function uploadEmojiToTeam(data) {
    const { teamdomain, name, imageData } = data;
    
    // トークンを取得
    const token = await getSlackTokenForTeam(teamdomain);
    
    // Base64データをBlobに変換
    const base64Data = imageData.split(',')[1];
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });
    
    // FormDataを作成
    const formData = new FormData();
    formData.append('mode', 'data');
    formData.append('name', name);
    formData.append('image', blob, 'emoji.png');
    formData.append('token', token);
    
    // アップロード
    const uploadUrl = `https://${teamdomain}.slack.com/api/emoji.add`;
    const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        credentials: 'include'
    });
    
    const result = await uploadResponse.json();
    
    if (!result.ok) {
        throw new Error(result.error || 'アップロードに失敗しました');
    }
    
    return result;
}