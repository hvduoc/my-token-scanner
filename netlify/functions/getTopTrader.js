const axios = require("axios");

// Lấy API Key từ biến môi trường của Netlify
const BITQUERY_API_KEY = process.env.BITQUERY_API_KEY; 
const BITQUERY_URL = "https://graphql.bitquery.io";

exports.handler = async function (event, context) {
  const tokenAddress = event.queryStringParameters.address;
  if (!tokenAddress) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing token address." }),
    };
  }

  // Lấy ngày trong 30 ngày qua để giới hạn phạm vi tìm kiếm
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 30);
  const sinceDateString = sinceDate.toISOString().slice(0, 10);

  const query = `
    query ($token: String!, $since: ISO8601DateTime) {
      ethereum(network: base) {
        dexTrades(
          options: {desc: "baseAmount", limit: 100}
          date: {since: $since}
          baseCurrency: {is: $token}
        ) {
          transaction {
            txFrom {
              address
            }
          }
          baseAmount
        }
      }
    }
  `;

  const variables = {
    token: tokenAddress,
    since: sinceDateString,
  };

  try {
    const response = await axios.post(
      BITQUERY_URL,
      { query, variables },
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": BITQUERY_API_KEY,
        },
      }
    );

    const trades = response.data?.data?.ethereum?.dexTrades || [];

    if (trades.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ topTraders: [] }),
      };
    }

    // Tổng hợp khối lượng giao dịch cho mỗi ví
    const traderMap = new Map();
    for (const trade of trades) {
      const address = trade.transaction?.txFrom?.address;
      const amount = parseFloat(trade.baseAmount);
      if (!address || isNaN(amount)) continue;

      const currentAmount = traderMap.get(address) || 0;
      traderMap.set(address, currentAmount + amount);
    }

    // Sắp xếp và lấy ra 3 trader hàng đầu
    const topTraders = Array.from(traderMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([address, totalAmount]) => ({ address, totalAmount }));

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topTraders }),
    };
  } catch (error) {
    console.error("❌ Error from Bitquery:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to fetch from Bitquery." }),
    };
  }
};
