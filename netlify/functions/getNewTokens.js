const axios = require("axios");

// Sử dụng API tìm kiếm để có kết quả ổn định hơn.
const API_URL = `https://api.dexscreener.com/latest/dex/search?q=WETH%20on%20Base`;

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

    const basePairs = response.data.pairs.filter(p => p.chainId === "base");

    const sortedPairs = basePairs.sort(
      (a, b) => b.pairCreatedAt - a.pairCreatedAt
    );
    
    const wethAddress = "0x4200000000000000000000000000000000000006";

    // ✅ THAY ĐỔI: Thay vì chỉ lấy địa chỉ, chúng ta sẽ lấy một object
    // chứa đầy đủ thông tin cần thiết.
    const newTokensInfo = sortedPairs
        .slice(0, 100)
        .map(p => {
            const token = p.baseToken.address.toLowerCase() === wethAddress ? p.quoteToken : p.baseToken;
            return {
                address: token.address,
                createdAt: p.pairCreatedAt, // Thời gian tạo cặp
                txns: p.txns.h24.buys + p.txns.h24.sells, // Tổng giao dịch trong 24h
                volume: p.volume.h24 // Khối lượng giao dịch trong 24h
            };
        });

    // Lọc bỏ các token trùng lặp, giữ lại thông tin của cặp mới nhất
    const uniqueTokens = Array.from(new Map(newTokensInfo.map(item => [item.address, item])).values())
                             .slice(0, 50);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokens: uniqueTokens }), // Trả về mảng các object
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