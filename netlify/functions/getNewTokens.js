const axios = require("axios");

// ✅ THAY ĐỔI: Sử dụng USDC làm token tham chiếu để có kết quả mới và ổn định hơn.
const QUOTE_TOKEN_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bda02913"; // USDC on Base
const API_URL = `https://api.dexscreener.com/latest/dex/tokens/${QUOTE_TOKEN_ADDRESS}/pairs`;

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

    const sortedPairs = response.data.pairs.sort(
      (a, b) => b.pairCreatedAt - a.pairCreatedAt
    );
    
    // Lấy thông tin chi tiết cho mỗi token
    const newTokensInfo = sortedPairs
        .slice(0, 100)
        .map(p => {
            const token = p.baseToken.address.toLowerCase() === QUOTE_TOKEN_ADDRESS.toLowerCase() ? p.quoteToken : p.baseToken;
            return {
                address: token.address,
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
      body: JSON.stringify({ error: "Failed to fetch data from Dexscreener." }),
    };
  }
};
