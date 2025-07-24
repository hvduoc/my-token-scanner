document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('hunters-container');
    const manualInput = document.getElementById('manual-address');
    const addButton = document.getElementById('add-address');

    // Phân tích localStorage
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith('hunter-'));
    const hunterMap = new Map();

    for (const key of allKeys) {
        const token = key.replace('hunter-', '');
        const hunters = JSON.parse(localStorage.getItem(key));

        hunters.forEach(hunter => {
            const existing = hunterMap.get(hunter.address) || { totalProfit: 0, count: 0 };
            existing.totalProfit += hunter.profit || 0;
            existing.count += 1;
            hunterMap.set(hunter.address, existing);
        });
    }

    // Chuyển sang mảng và sắp xếp
    const sortedHunters = Array.from(hunterMap.entries())
        .map(([address, stats]) => ({ address, ...stats }))
        .sort((a, b) => b.totalProfit - a.totalProfit);
        // ✅ Lọc ra các ví thợ săn "đáng tin cậy" – có thể dùng để huấn luyện bot
    const topHunters = sortedHunters.filter(h => h.count >= 3 && h.totalProfit > 500);


    // Hiển thị
    for (const h of sortedHunters) {
        const el = document.createElement('div');
        el.className = "p-4 bg-white rounded shadow";
        el.innerHTML = `
            <div class="font-semibold text-blue-700">${h.address}</div>
            <div class="text-sm text-gray-600">Lợi nhuận: $${h.totalProfit.toFixed(2)} | Xuất hiện: ${h.count} lần</div>
            <a href="https://basescan.org/address/${h.address}" target="_blank" class="text-sm text-green-600 hover:underline">Xem trên Basescan</a>
        `;
        container.appendChild(el);
    }

    // Thêm thủ công
    addButton.addEventListener('click', () => {
        const addr = manualInput.value.trim();
        if (!addr.startsWith('0x') || addr.length < 10) {
            alert("Vui lòng nhập địa chỉ hợp lệ!");
            return;
        }

        // Lưu tạm vào localStorage với key riêng
        const manualList = JSON.parse(localStorage.getItem('manual-hunters') || '[]');
        if (!manualList.includes(addr)) {
            manualList.push(addr);
            localStorage.setItem('manual-hunters', JSON.stringify(manualList));
            alert('Đã thêm ví thủ công! Tải lại để xem.');
            location.reload();
        } else {
            alert('Ví đã có trong danh sách!');
        }
    });

    // Hiển thị ví thủ công
    const manualList = JSON.parse(localStorage.getItem('manual-hunters') || '[]');
    if (manualList.length > 0) {
        const manualTitle = document.createElement('h2');
        manualTitle.className = "text-lg mt-6 font-bold";
        manualTitle.textContent = "🔍 Ví thủ công đã thêm";
        container.appendChild(manualTitle);

        manualList.forEach(addr => {
            const el = document.createElement('div');
            el.className = "p-4 bg-yellow-50 rounded shadow border border-yellow-300 mt-2";
            el.innerHTML = `
                <div class="font-semibold">${addr}</div>
                <a href="https://basescan.org/address/${addr}" target="_blank" class="text-sm text-blue-600 hover:underline">Xem trên Basescan</a>
            `;
            container.appendChild(el);
        });
    }
});
