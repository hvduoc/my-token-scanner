const axios = require("axios");

// ✅ THAY ĐỔI: Tìm kiếm các cặp dựa trên khối lượng giao dịch cao nhất để bắt trend
const API_URL = `https://api.dexscreener.com/latest/dex/search?q=base%20volume%20>10000`;

exports.handler = async function (event, context) {
  try {
    const response = await axios.get(API_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
    });

    if (!response.data || !Array.isArray(response.data.pairs)) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "API Dexscreener không trả về dữ liệu hợp lệ." }),
      };
    }

    // Lọc các cặp giao dịch chỉ trên mạng "base" và có volume > 10k
    const basePairs = response.data.pairs.filter(p => p.chainId === "base" && p.volume.h24 > 10000);

    // Sắp xếp các cặp theo khối lượng giao dịch 24h, cao nhất lên đầu
    const sortedPairs = basePairs.sort(
      (a, b) => b.volume.h24 - a.volume.h24
    );
    
    const wethAddress = "0x4200000000000000000000000000000000000006";
    const usdcAddress = "0x833589fcd6ed6e08f4c7c32d4f71b54bda02913";

    // Lấy thông tin chi tiết cho mỗi token
    const newTokensInfo = sortedPairs
        .map(p => {
            let targetToken = p.baseToken;
            if ([wethAddress, usdcAddress.toLowerCase()].includes(p.baseToken.address.toLowerCase())) {
                targetToken = p.quoteToken;
            }
            
            return {
                address: targetToken.address,
                createdAt: p.pairCreatedAt,
                txns: p.txns.h24.buys + p.txns.h24.sells,
                volume: p.volume.h24
            };
        });

    const uniqueTokens = Array.from(new Map(newTokensInfo.map(item => [item.address, item])).values())
                             .slice(0, 50);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokens: uniqueTokens }),
    };
  } catch (error) {
    console.error("❌ Error fetching from Dexscreener:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to fetch data from Dexscreener.",
        details: error.message || "Unknown error"
      }),
    };
  }
};
