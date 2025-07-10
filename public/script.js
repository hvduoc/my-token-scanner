document.addEventListener('DOMContentLoaded', () => {
    const startScanButton = document.getElementById('start-scan-button');
    const resultsTable = document.getElementById('results-table');
    const statusContainer = document.getElementById('status-container');
    const statusText = document.getElementById('status-text');
    const clearResultsButton = document.getElementById('clear-results-button');

    // The base URL for Netlify Functions is relative to the site root
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
                const address = newTokens[i];
                statusText.textContent = `Bước 2/2: Đang sàng lọc ${i + 1}/${newTokens.length}: ${address.substring(0, 10)}...`;
                await scanToken(address);
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

    async function scanToken(address) {
        const row = document.createElement('tr');
        resultsTable.appendChild(row);

        try {
            const securityResponse = await fetch(`${BASE_FUNCTION_URL}/getTokenSecurity?address=${address}`);
            if (!securityResponse.ok) throw new Error('Lỗi API bảo mật');
            const data = await securityResponse.json();

            if (data.code !== 1 || !data.result || !data.result[address.toLowerCase()]) {
                 throw new Error(data.message || 'Không có dữ liệu trả về.');
            }
            updateRowWithData(row, data.result[address.toLowerCase()], address);
        } catch (error) {
            console.error(`Lỗi khi quét ${address}:`, error);
            updateRowWithError(row, address, error.message);
        }
    }
    
    function updateRowWithError(row, address, errorMessage) {
         row.innerHTML = `
            <td class="px-3 py-4 whitespace-nowrap"><div class="text-sm text-gray-500">${address.substring(0,6)}...${address.substring(address.length-4)}</div></td>
            <td class="px-3 py-4 whitespace-nowrap" colspan="6"><span class="status-danger">Lỗi: ${errorMessage}</span></td>
        `;
    }

    function updateRowWithData(row, data, address) {
        let score = 0;
        
        const isHoneypot = data.is_honeypot === '1';
        if (!isHoneypot) score += 40;
        const honeypotStatus = isHoneypot ? '<span class="status-danger">CÓ</span>' : '<span class="status-ok">KHÔNG</span>';

        const buyTax = parseFloat(data.buy_tax) * 100;
        const sellTax = parseFloat(data.sell_tax) * 100;
        const isTaxOk = buyTax <= 5 && sellTax <= 5;
        if (isTaxOk) score += 20;
        const taxStatus = isTaxOk ? `<span class="status-ok">${buyTax}%/${sellTax}%</span>` : `<span class="status-danger">${buyTax}%/${sellTax}%</span>`;
        
        const isOwnerRenounced = data.owner_address === '0x0000000000000000000000000000000000000000' || !data.owner_address;
        if (isOwnerRenounced) score += 20;
        const ownershipStatus = isOwnerRenounced ? '<span class="status-ok">Đã từ bỏ</span>' : '<span class="status-warning">Chưa từ bỏ</span>';
        
        let liquidityLockedPercent = 0;
        if(data.lp_holders) {
            const lockedLps = data.lp_holders.filter(lp => lp.is_locked === 1);
            if(lockedLps.length > 0){
               liquidityLockedPercent = lockedLps.reduce((sum, lp) => sum + parseFloat(lp.balance), 0);
            }
        }
        const isLiquidityOk = liquidityLockedPercent >= 0.95;
        if(isLiquidityOk) score += 20;
        const liquidityStatus = isLiquidityOk ? `<span class="status-ok">${(liquidityLockedPercent * 100).toFixed(1)}%</span>` : `<span class="status-danger">${(liquidityLockedPercent * 100).toFixed(1)}%</span>`;

        const scoreColor = score >= 80 ? 'green' : score >= 60 ? 'orange' : 'red';
        const scoreHtml = `<div class="font-bold text-${scoreColor}-600">${score}/100</div>`;

        let hunterCellHtml = `<div class="text-xs text-gray-400">Điểm quá thấp</div>`;
        if (score >= 80) {
            hunterCellHtml = `<button class="find-hunter-btn bg-green-500 text-white text-xs font-bold py-1 px-2 rounded hover:bg-green-600" data-address="${address}">Tìm Thợ Săn</button>`;
        }
        
        const tokenName = data.token_name || 'N/A';
        const tokenSymbol = data.token_symbol || 'N/A';
        const basescanUrl = `https://basescan.org/token/${address}`;

        row.innerHTML = `
            <td class="px-3 py-4 whitespace-nowrap">
                <div class="font-medium text-gray-900">${tokenName} (${tokenSymbol})</div>
                <a href="${basescanUrl}" target="_blank" class="text-sm text-blue-600 hover:underline">${address.substring(0,6)}...${address.substring(address.length-4)}</a>
            </td>
            <td class="px-3 py-4 whitespace-nowrap text-center">${scoreHtml}</td>
            <td class="px-3 py-4 whitespace-nowrap">${honeypotStatus}</td>
            <td class="px-3 py-4 whitespace-nowrap">${taxStatus}</td>
            <td class="px-3 py-4 whitespace-nowrap">${ownershipStatus}</td>
            <td class="px-3 py-4 whitespace-nowrap">${liquidityStatus}</td>
            <td class="px-3 py-4 whitespace-nowrap hunter-cell">${hunterCellHtml}</td>
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
                const tradersData = await tradersResponse.json();
                
                if (tradersData.pair.txns && tradersData.pair.txns.buys) {
                    const topMaker = tradersData.pair.txns.buys
                        .sort((a,b) => b.amountUSD - a.amountUSD)[0];
                    
                    if (topMaker && topMaker.maker) {
                        const hunterAddress = topMaker.maker.address;
                        const hunterUrl = `https://basescan.org/address/${hunterAddress}`;
                        cell.innerHTML = `<a href="${hunterUrl}" target="_blank" class="text-sm text-blue-600 hover:underline">${hunterAddress.substring(0,6)}...</a>
                                          <div class="text-xs text-gray-500">Mua: $${parseFloat(topMaker.amountUSD).toLocaleString()}</div>`;
                    } else {
                        cell.innerHTML = '<div class="text-xs text-red-500">Không tìm thấy</div>';
                    }
                } else {
                    cell.innerHTML = '<div class="text-xs text-red-500">Không có giao dịch mua</div>';
                }
            } catch (error) {
                console.error('Lỗi khi tìm thợ săn:', error);
                cell.innerHTML = `<div class="text-xs text-red-500">${error.message}</div>`;
            }
        }
    });
});