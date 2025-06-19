// Service Worker for Chrome Extension

import { getSlackTeams, uploadEmojiToTeam } from './js/slack-api.js';
import { fetchImageAsBase64 } from './js/utils.js';

// 拡張機能がインストールされた時の処理
chrome.runtime.onInstalled.addListener(() => {
    console.log('Slack Emoji Uploader extension installed');
    
    // コンテキストメニューを作成
    chrome.contextMenus.create({
        id: 'upload-to-slack',
        title: 'Slackに絵文字として追加',
        contexts: ['image']
    });
});

// メッセージハンドラ
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    handleMessage(request, sender, sendResponse);
    return true; // 非同期レスポンスを示す
});

// コンテキストメニューのクリックハンドラ
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

/**
 * メッセージを処理
 * @param {Object} request - リクエストオブジェクト
 * @param {Object} sender - 送信者情報
 * @param {Function} sendResponse - レスポンス関数
 */
async function handleMessage(request, sender, sendResponse) {
    try {
        switch (request.action) {
            case 'getSlackTeams':
                const teams = await getSlackTeams();
                sendResponse({ success: true, teams });
                break;
                
            case 'uploadEmoji':
                const result = await uploadEmojiToTeam(request.data);
                sendResponse({ success: true, result });
                break;
                
            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }
    } catch (error) {
        console.error('Message handler error:', error);
        sendResponse({ success: false, error: error.message });
    }
}

/**
 * コンテキストメニューのクリックを処理
 * @param {Object} info - クリック情報
 * @param {Object} tab - タブ情報
 */
async function handleContextMenuClick(info, tab) {
    if (info.menuItemId === 'upload-to-slack' && info.srcUrl) {
        try {
            // 画像URLから画像データを取得
            const imageData = await fetchImageAsBase64(info.srcUrl);
            
            // 画像を一時保存
            await chrome.storage.local.set({ 
                pendingImage: {
                    url: info.srcUrl,
                    data: imageData
                }
            });
            
            // ポップアップを開く
            chrome.action.openPopup();
            
        } catch (error) {
            console.error('Context menu error:', error);
        }
    }
}