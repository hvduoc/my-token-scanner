document.addEventListener('DOMContentLoaded', () => {
    const startScanButton = document.getElementById('start-scan-button');
    const resultsTable = document.getElementById('results-table');
    const statusContainer = document.getElementById('status-container');
    const statusText = document.getElementById('status-text');
    const clearResultsButton = document.getElementById('clear-results-button');

    const BASE_FUNCTION_URL = `/.netlify/functions`;

    clearResultsButton.addEventListener('click', () => {
        resultsTable.innerHTML = '';
    });

    startScanButton.addEventListener('click', async () => {
        resultsTable.innerHTML = '';
        startScanButton.disabled = true;
        startScanButton.classList.add('opacity-50', 'cursor-not-allowed');
        statusContainer.classList.remove('hidden');
        
        try {
            statusText.textContent = 'Bước 1/2: Đang tìm token mới...';
            const tokenResponse = await fetch(`${BASE_FUNCTION_URL}/getNewTokens`);
            if (!tokenResponse.ok) throw new Error('Không thể lấy danh sách token mới.');
            const { tokens: newTokens } = await tokenResponse.json();

            for (let i = 0; i < newTokens.length; i++) {
                const tokenInfo = newTokens[i];
                statusText.textContent = `Bước 2/2: Đang sàng lọc ${i + 1}/${newTokens.length}: ${tokenInfo.address.substring(0, 10)}...`;
                await scanToken(tokenInfo);
                await new Promise(resolve => setTimeout(resolve, 300));
            }

        } catch (error) {
            console.error('Lỗi trong quá trình quét:', error);
            alert(`Đã xảy ra lỗi: ${error.message}`);
        } finally {
            startScanButton.disabled = false;
            startScanButton.classList.remove('opacity-50', 'cursor-not-allowed');
            statusContainer.classList.add('hidden');
            statusText.textContent = '';
        }
    });

    async function scanToken(tokenInfo) {
        const row = document.createElement('tr');
        resultsTable.appendChild(row);

        try {
            const securityResponse = await fetch(`${BASE_FUNCTION_URL}/getTokenSecurity?address=${tokenInfo.address}`);
            if (!securityResponse.ok) throw new Error('Lỗi API bảo mật');
            const data = await securityResponse.json();

            if (data.code !== 1 || !data.result || !data.result[tokenInfo.address.toLowerCase()]) {
                 throw new Error(data.message || 'Không có dữ liệu trả về.');
            }
            updateRowWithData(row, data.result[tokenInfo.address.toLowerCase()], tokenInfo);
        } catch (error) {
            console.error(`Lỗi khi quét ${tokenInfo.address}:`, error);
            updateRowWithError(row, tokenInfo.address, error.message);
        }
    }
    
    function updateRowWithError(row, address, errorMessage) {
         row.innerHTML = `
            <td class="px-3 py-4"><div class="text-sm text-gray-500">${address.substring(0,6)}...${address.substring(address.length-4)}</div></td>
            <td class="px-3 py-4" colspan="6"><span class="status-danger">Lỗi: ${errorMessage}</span></td>
        `;
    }

    function formatTimeAgo(timestamp) {
        const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
        if (seconds < 60) return `${seconds} giây`;
        
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} phút`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} giờ`;

        const days = Math.floor(hours / 24);
        if (days < 30) return `${days} ngày`;

        const months = Math.floor(days / 30);
        if (months < 12) return `${months} tháng`;

        const years = Math.floor(months / 12);
        return `${years} năm`;
    }

    function updateRowWithData(row, securityData, tokenInfo) {
        let score = 0;
        
        const isHoneypot = securityData.is_honeypot === '1';
        if (!isHoneypot) score += 40;
        
        const buyTax = parseFloat(securityData.buy_tax) * 100;
        const sellTax = parseFloat(securityData.sell_tax) * 100;
        const isTaxOk = buyTax <= 5 && sellTax <= 5;
        if (isTaxOk) score += 20;
        
        const isOwnerRenounced = securityData.owner_address === '0x0000000000000000000000000000000000000000' || !securityData.owner_address;
        if (isOwnerRenounced) score += 20;
        
        let liquidityLockedPercent = 0;
        if(securityData.lp_holders) {
            const lockedLps = securityData.lp_holders.filter(lp => lp.is_locked === 1);
            if(lockedLps.length > 0){
               liquidityLockedPercent = lockedLps.reduce((sum, lp) => sum + parseFloat(lp.balance), 0);
            }
        }
        const isLiquidityOk = liquidityLockedPercent >= 0.95;
        if(isLiquidityOk) score += 20;

        let displayPercent = liquidityLockedPercent * 100;
        if (displayPercent > 100) displayPercent = 100.0;
        const liquidityStatus = isLiquidityOk ? `<span class="status-ok">${displayPercent.toFixed(1)}%</span>` : `<span class="status-danger">${displayPercent.toFixed(1)}%</span>`;

        const scoreColor = score >= 80 ? 'green' : score >= 60 ? 'orange' : 'red';
        const scoreHtml = `<div class="font-bold text-${scoreColor}-600">${score}/100</div>`;

        let hunterCellHtml = `<div class="text-xs text-gray-400">Điểm quá thấp</div>`;
        if (score >= 80 && tokenInfo.txns > 10) {
            hunterCellHtml = `<button class="find-hunter-btn bg-green-500 text-white text-xs font-bold py-1 px-2 rounded hover:bg-green-600" data-address="${tokenInfo.address}">Tìm Thợ Săn</button>`;
        } else if (score >= 80 && tokenInfo.txns <= 10) {
             hunterCellHtml = `<div class="text-xs text-gray-400">Ít hoạt động</div>`;
        }
        
        const tokenName = securityData.token_name || 'N/A';
        const tokenSymbol = securityData.token_symbol || 'N/A';
        const basescanUrl = `https://basescan.org/token/${tokenInfo.address}`;

        row.innerHTML = `
            <td class="px-3 py-4">
                <div class="font-medium text-gray-900">${tokenName} (${tokenSymbol})</div>
                <a href="${basescanUrl}" target="_blank" class="text-sm text-blue-600 hover:underline">${tokenInfo.address.substring(0,6)}...${tokenInfo.address.substring(tokenInfo.address.length-4)}</a>
            </td>
            <td class="px-3 py-4 text-sm text-gray-500">${formatTimeAgo(tokenInfo.createdAt)}</td>
            <td class="px-3 py-4 text-sm text-gray-500">${tokenInfo.txns.toLocaleString()}</td>
            <td class="px-3 py-4 text-sm text-gray-500">$${parseFloat(tokenInfo.volume).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td class="px-3 py-4 text-center">${scoreHtml}</td>
            <td class="px-3 py-4">${liquidityStatus}</td>
            <td class="px-3 py-4 hunter-cell">${hunterCellHtml}</td>
        `;
    }

    resultsTable.addEventListener('click', async (event) => {
        if (event.target.classList.contains('find-hunter-btn')) {
            const button = event.target;
            const tokenAddress = button.dataset.address;
            const cell = button.parentElement;
            cell.innerHTML = '<div class="text-xs text-gray-500">Đang tìm...</div>';

            try {
                const tradersResponse = await fetch(`${BASE_FUNCTION_URL}/getTopTrader?address=${tokenAddress}`);
                if (!tradersResponse.ok) throw new Error('Không thể lấy dữ liệu giao dịch');
                const { topTraders } = await tradersResponse.json();
                
                if (topTraders && topTraders.length > 0) {
                    let html = '<ul class="space-y-1">';
                    topTraders.forEach((trader, index) => {
                        const hunterUrl = `https://basescan.org/address/${trader.address}`;
                        html += `
                            <li>
                                <span class="font-bold">${index + 1}.</span>
                                <a href="${hunterUrl}" target="_blank" class="text-sm text-blue-600 hover:underline">${trader.address.substring(0,6)}...</a>
                                <div class="text-xs text-gray-500">KL: ${trader.totalAmount.toFixed(2)}</div>
                            </li>
                        `;
                    });
                    html += '</ul>';
                    cell.innerHTML = html;
                } else {
                    cell.innerHTML = '<div class="text-xs text-yellow-600">Không tìm thấy trader</div>';
                }
            } catch (error) {
                console.error('Lỗi khi tìm thợ săn:', error);
                cell.innerHTML = `<div class="text-xs text-red-500">${error.message}</div>`;
            }
        }
    });
});
